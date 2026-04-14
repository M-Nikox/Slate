import fs from 'fs';
import path from 'path';
import type { RenameIssue, RenameOperation, RenameResult, UndoEntry, UndoLog } from '../../shared/types.js';
import { writeUndoLog, readUndoLog, deleteUndoLog, checkUndoLog, countPendingUndoEntries } from '../undo/undo-log.js';
import { validateDestinationName } from './name-policy.js';

function isSubPath(parent: string, child: string): boolean {
  const rel = path.relative(parent, child);
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
}

function validateOperation(op: RenameOperation, folderPath: string): string | null {
  const resolvedFolder = path.resolve(folderPath);
  const resolvedFrom = path.resolve(op.from);
  const resolvedTo = path.resolve(op.to);

  if (!path.isAbsolute(resolvedFrom) || !path.isAbsolute(resolvedTo)) {
    return 'Paths must be absolute';
  }

  if (!isSubPath(resolvedFolder, resolvedFrom)) {
    return `Source is outside the target folder: ${resolvedFrom}`;
  }

  if (!isSubPath(resolvedFolder, resolvedTo)) {
    return `Destination is outside the target folder: ${resolvedTo}`;
  }

  // 1. Existence check (redundant with lstatSync below, but kept for early exit)
  if (!fs.existsSync(resolvedFrom)) {
    return `Source file does not exist: ${resolvedFrom}`;
  }

  // 2. Strict file-type validation using lstat to avoid symlink traversal
  let stats;
  try {
    stats = fs.lstatSync(resolvedFrom);
  } catch (err) {
    return `Cannot stat source: ${resolvedFrom}`;
  }

  if (stats.isSymbolicLink()) {
    return `Source is a symbolic link, which is not allowed: ${resolvedFrom}`;
  }

  if (!stats.isFile()) {
    return `Source is not a regular file: ${resolvedFrom}`;
  }

  return null;
}

interface PlannedOperation {
  from: string;
  to: string;
  original?: RenameOperation;
}

function pathKey(p: string, caseInsensitive: boolean): string {
  return caseInsensitive ? p.toLowerCase() : p;
}

function makeTempPath(folderPath: string, preferredSeed: string, occupiedKeys: Set<string>, caseInsensitive: boolean): string {
  const rawBase = path.basename(preferredSeed);
  const safeBase = rawBase.length > 80 ? rawBase.slice(0, 80) : rawBase;
  let counter = 0;
  while (true) {
    const candidate = path.resolve(
      folderPath,
      `.slate-tmp-${Date.now()}-${counter}-${safeBase}`,
    );
    const key = pathKey(candidate, caseInsensitive);
    if (!occupiedKeys.has(key) && !fs.existsSync(candidate)) return candidate;
    counter++;
  }
}

function buildDeterministicPlan(folderPath: string, operations: PlannedOperation[], caseInsensitive: boolean): PlannedOperation[] {
  const pending: PlannedOperation[] = operations
    .map(op => ({ ...op }))
    .sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to));
  const occupied = new Set<string>([
    ...pending.map(op => pathKey(op.from, caseInsensitive)),
    ...pending.map(op => pathKey(op.to, caseInsensitive)),
  ]);
  const plan: PlannedOperation[] = [];

  while (pending.length > 0) {
    const pendingSourceKeys = new Set(pending.map(op => pathKey(op.from, caseInsensitive)));
    const readyIndexes: number[] = [];
    for (let i = 0; i < pending.length; i++) {
      const targetKey = pathKey(pending[i].to, caseInsensitive);
      if (!pendingSourceKeys.has(targetKey)) readyIndexes.push(i);
    }

    if (readyIndexes.length > 0) {
      const ready = readyIndexes.map(i => pending[i])
        .sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to));
      for (const op of ready) plan.push(op);
      for (const i of readyIndexes.sort((a, b) => b - a)) pending.splice(i, 1);
      continue;
    }

    let cycleIndex = 0;
    for (let i = 1; i < pending.length; i++) {
      const current = pending[i];
      const chosen = pending[cycleIndex];
      if (current.from.localeCompare(chosen.from) < 0 || (current.from === chosen.from && current.to.localeCompare(chosen.to) < 0)) {
        cycleIndex = i;
      }
    }
    const cycleOp = pending[cycleIndex];
    const tempPath = makeTempPath(folderPath, cycleOp.from, occupied, caseInsensitive);
    occupied.add(pathKey(tempPath, caseInsensitive));
    plan.push({ from: cycleOp.from, to: tempPath });
    pending[cycleIndex] = { ...cycleOp, from: tempPath };
  }

  return plan;
}

function planRenameOperations(folderPath: string, operations: RenameOperation[]): { plan: PlannedOperation[]; issues: RenameIssue[]; executable: RenameOperation[] } {
  const caseInsensitive = process.platform === 'win32' || process.platform === 'darwin';
  const issues: RenameIssue[] = [];
  const filtered: RenameOperation[] = [];
  const sourceKeySet = new Set<string>();
  const destinationKeyMap = new Map<string, RenameOperation[]>();

  for (const op of operations) {
    const from = path.resolve(op.from);
    const to = path.resolve(op.to);
    const normalized: RenameOperation = { from, to };

    const opError = validateOperation(normalized, folderPath);
    if (opError) {
      issues.push({ severity: 'blocked', code: 'invalid-operation', message: opError, op: normalized });
      continue;
    }

    const policyIssues = validateDestinationName(to);
    for (const policyIssue of policyIssues) {
      issues.push({ ...policyIssue, op: normalized });
    }
    if (policyIssues.some(i => i.severity === 'blocked')) continue;

    if (from === to) {
      issues.push({
        severity: 'warning',
        code: 'no-op',
        message: `Skipping no-op rename for ${path.basename(from)}.`,
        op: normalized,
      });
      continue;
    }

    const fromKey = pathKey(from, caseInsensitive);
    const toKey = pathKey(to, caseInsensitive);
    if (sourceKeySet.has(fromKey)) {
      issues.push({
        severity: 'blocked',
        code: 'duplicate-source',
        message: `Duplicate source operation detected for ${from}.`,
        op: normalized,
      });
      continue;
    }

    sourceKeySet.add(fromKey);
    filtered.push(normalized);
    destinationKeyMap.set(toKey, [...(destinationKeyMap.get(toKey) ?? []), normalized]);
  }

  for (const [toKey, ops] of destinationKeyMap) {
    if (ops.length > 1) {
      for (const op of ops) {
        issues.push({
          severity: 'blocked',
          code: 'duplicate-destination',
          message: `Multiple operations target the same destination (${toKey}).`,
          op,
        });
      }
    }
  }

  const blockedOperationKeys = new Set(
    issues.filter(i => i.severity === 'blocked' && i.op)
      .map(i => `${i.op!.from}\u0000${i.op!.to}`),
  );
  const executable = filtered
    .filter(op => !blockedOperationKeys.has(`${op.from}\u0000${op.to}`))
    .sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to));

  const executableSourceKeys = new Set(executable.map(op => pathKey(op.from, caseInsensitive)));
  for (const op of executable) {
    const toKey = pathKey(op.to, caseInsensitive);
    const fromKey = pathKey(op.from, caseInsensitive);
    if (toKey === fromKey) {
      issues.push({
        severity: 'warning',
        code: 'case-only-rename',
        message: `Case-only rename detected for ${path.basename(op.from)}; it will use safe staging.`,
        op,
      });
      continue;
    }
    if (fs.existsSync(op.to) && !executableSourceKeys.has(toKey)) {
      issues.push({
        severity: 'blocked',
        code: 'destination-exists',
        message: `Destination already exists: ${op.to}`,
        op,
      });
    }
  }

  const blockedExecutableKeys = new Set(
    issues.filter(i => i.severity === 'blocked' && i.op)
      .map(i => `${i.op!.from}\u0000${i.op!.to}`),
  );
  const pending: PlannedOperation[] = executable
    .filter(op => !blockedExecutableKeys.has(`${op.from}\u0000${op.to}`))
    .map(op => ({ from: op.from, to: op.to, original: op }));
  const plan = buildDeterministicPlan(folderPath, pending, caseInsensitive);
  return { plan, issues, executable };
}

export function executeRename(folderPath: string, operations: RenameOperation[]): RenameResult {
  const resolvedFolder = path.resolve(folderPath);
  const { plan, issues, executable } = planRenameOperations(resolvedFolder, operations);
  if (issues.some(i => i.severity === 'blocked')) {
    return { succeeded: [], failed: null, issues };
  }
  if (executable.length === 0) {
    return { succeeded: [], failed: null, issues };
  }

  const undoEntries: UndoEntry[] = executable.map(op => ({
    original: path.resolve(op.from),
    renamed: path.resolve(op.to),
    applied: false,
    status: 'pending',
  }));

  const log: UndoLog = {
    version: 2,
    timestamp: new Date().toISOString(),
    folderPath: resolvedFolder,
    operations: undoEntries,
  };

  writeUndoLog(log);

  const succeeded: RenameOperation[] = [];
  const updateUndoEntry = (from: string, to: string, patch: Partial<UndoEntry>) => {
    const current = readUndoLog(resolvedFolder);
    const nextOps = current.operations.map(entry => {
      if (path.resolve(entry.original) === from && path.resolve(entry.renamed) === to) {
        return { ...entry, ...patch };
      }
      return entry;
    });
    writeUndoLog({ ...current, operations: nextOps });
  };

  for (const op of plan) {
    const from = path.resolve(op.from);
    const to = path.resolve(op.to);

    try {
      // Mark applied *before* the rename so a crash after renameSync but before
      // the log update doesn't silently drop the entry from undo candidates.
      // The existing `renamed-not-found` guard in executeUndo handles the
      // converse case where the rename never ran but the entry is marked applied.
      if (op.original) {
        updateUndoEntry(op.original.from, op.original.to, { applied: true });
      }
      fs.renameSync(from, to);
      if (op.original) {
        succeeded.push(op.original);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        succeeded,
        // Report the user-facing operation (op.original) rather than the
        // internal step, which may be a .slate-tmp-* staging path.
        failed: { op: op.original ?? { from, to }, error: message },
        issues,
      };
    }
  }

  return { succeeded, failed: null, issues };
}

export function executeUndo(folderPath: string): number {
  const resolvedFolder = path.resolve(folderPath);
  if (checkUndoLog(resolvedFolder) === 0) {
    deleteUndoLog(resolvedFolder);
    return 0;
  }
  const log = readUndoLog(resolvedFolder);

  const caseInsensitive = process.platform === 'win32' || process.platform === 'darwin';
  const markEntry = (entry: UndoEntry, patch: Partial<UndoEntry>) => {
    const current = readUndoLog(resolvedFolder);
    writeUndoLog({
      ...current,
      operations: current.operations.map(op => (
        path.resolve(op.original) === path.resolve(entry.original) && path.resolve(op.renamed) === path.resolve(entry.renamed)
        ? { ...op, ...patch }
        : op
      )),
    });
  };

  const candidates = [...log.operations]
    .reverse()
    .filter(entry => entry.applied !== false && entry.status !== 'done');

  const valid: PlannedOperation[] = [];
  for (const entry of candidates) {
    const from = path.resolve(entry.renamed);
    const to = path.resolve(entry.original);
    if (!isSubPath(resolvedFolder, from) || !isSubPath(resolvedFolder, to)) {
      console.warn(`[undo] Skipping entry outside folder: ${from}`);
      markEntry(entry, { status: 'skipped', lastError: 'outside-folder' });
      continue;
    }
    if (!fs.existsSync(from)) {
      console.warn(`[undo] Renamed file not found, skipping: ${from}`);
      markEntry(entry, { status: 'skipped', lastError: 'renamed-not-found' });
      continue;
    }
    valid.push({ from, to, original: { from: entry.renamed, to: entry.original } });
  }

  const sourceKeys = new Set(valid.map(op => pathKey(op.from, caseInsensitive)));
  const executable = valid.filter(op => {
    const toExists = fs.existsSync(op.to);
    if (!toExists) return true;
    if (pathKey(op.from, caseInsensitive) === pathKey(op.to, caseInsensitive)) return true;
    return sourceKeys.has(pathKey(op.to, caseInsensitive));
  });

  for (const op of valid) {
    if (!executable.includes(op)) {
      console.warn(`[undo] Original path already occupied, skipping: ${op.to}`);
      markEntry({ original: op.to, renamed: op.from }, { status: 'skipped', lastError: 'original-occupied' });
    }
  }

  const plan = buildDeterministicPlan(resolvedFolder, executable, caseInsensitive);
  let count = 0;
  for (const op of plan) {
    fs.renameSync(path.resolve(op.from), path.resolve(op.to));
    if (op.original) {
      markEntry({ original: op.original.to, renamed: op.original.from }, { status: 'done', lastError: undefined });
      count++;
    }
  }

  if (countPendingUndoEntries(resolvedFolder) === 0) {
    deleteUndoLog(resolvedFolder);
  }
  return count;
}