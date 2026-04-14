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
  /** The user-facing operation this step completes (final rename step). */
  original?: RenameOperation;
  /**
   * Set on cycle/swap staging steps (`from → tempPath`) to link the staging
   * rename to its owning user-facing operation. This lets the execution loop
   * durably record `currentPath` in the undo log before the staging rename
   * runs, enabling crash recovery even when `applied` is still false.
   */
  stagingFor?: RenameOperation;
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
    plan.push({ from: cycleOp.from, to: tempPath, stagingFor: cycleOp.original });
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
      if (op.stagingFor) {
        // Before staging rename: durably record where the file will be stored
        // temporarily so that crash recovery can locate and restore it even
        // when `applied` remains false for the owning user-facing entry.
        updateUndoEntry(op.stagingFor.from, op.stagingFor.to, { currentPath: to });
      } else if (op.original) {
        // Before user-facing rename: mark applied so a crash after renameSync
        // but before the log update is still represented in undo candidates.
        // The existing `renamed-not-found` guard handles the converse case.
        updateUndoEntry(op.original.from, op.original.to, { applied: true });
      }
      fs.renameSync(from, to);
      if (op.original) {
        // Rename completed: clear any staging currentPath from an earlier step
        // so the entry now cleanly points to its final `renamed` location.
        updateUndoEntry(op.original.from, op.original.to, { currentPath: undefined });
        succeeded.push(op.original);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        succeeded,
        // Report the user-facing operation rather than the internal step, which
        // may be a .slate-tmp-* staging path.
        failed: { op: op.original ?? op.stagingFor ?? { from, to }, error: message },
        issues,
      };
    }
  }

  return { succeeded, failed: null, issues };
}

export function executeUndo(folderPath: string): number {
  const resolvedFolder = path.resolve(folderPath);

  // Use the structured check result so we only delete the log when we can
  // confirm it is valid and has zero pending entries. Parse/schema/mismatch
  // errors must preserve the log to allow manual recovery.
  const checkResult = checkUndoLog(resolvedFolder);
  if (checkResult.status === 'no-log') return 0;
  if (checkResult.status !== 'ok') {
    // Non-ok statuses (invalid, mismatch, io-error): preserve the log and
    // surface a warning. Deleting here could destroy a recoverable log.
    console.error(`[undo] Cannot read undo log for ${resolvedFolder}: ${checkResult.error}`);
    return 0;
  }
  if (checkResult.pending === 0) {
    deleteUndoLog(resolvedFolder);
    return 0;
  }

  // Keep later deletion checks in this function consistent with the
  // structured validation above. Returning 0 from the imported helper is
  // ambiguous because it may also represent a read/parse failure; for any
  // non-ok status we return a non-zero value so corrupted/unreadable logs
  // are preserved for manual recovery.
  const getPendingCountOrCorrupt = (): number => {
    const result = checkUndoLog(resolvedFolder);
    return result.status === 'ok' ? result.pending : 1;
  };

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

  // Include entries that are either applied (normal case) or have a
  // currentPath set (staging rename started but batch not yet complete).
  // This covers crash recovery for cycle/swap operations where the file
  // may have been moved to a temp path while applied is still false.
  // Skipped entries are NOT excluded here — they may be retried if the
  // blocking condition (e.g. original-occupied) was resolved by the caller.
  const candidates = [...log.operations]
    .reverse()
    .filter(entry => {
      if (entry.status === 'done') return false;
      if (entry.applied !== false) return true;
      if (entry.currentPath !== undefined) return true;
      return false;
    });

  const valid: PlannedOperation[] = [];
  for (const entry of candidates) {
    const to = path.resolve(entry.original);

    // Determine the actual on-disk location of the file:
    //   1. currentPath – set when a staging rename moved it to a temp path.
    //   2. renamed     – normal post-operation location (applied: true).
    const resolvedCurrentPath = entry.currentPath ? path.resolve(entry.currentPath) : null;
    const resolvedRenamed = path.resolve(entry.renamed);

    let from: string;
    if (resolvedCurrentPath && fs.existsSync(resolvedCurrentPath)) {
      // File is at the staging temp path.
      from = resolvedCurrentPath;
    } else if (entry.applied !== false && fs.existsSync(resolvedRenamed)) {
      // File is at its final renamed location (normal case).
      from = resolvedRenamed;
    } else if (resolvedCurrentPath && !fs.existsSync(resolvedCurrentPath) && fs.existsSync(to)) {
      // currentPath was set but the staging rename never executed (crash
      // before renameSync). File is already at its original location.
      markEntry(entry, { status: 'done', currentPath: undefined });
      continue;
    } else {
      console.warn(`[undo] File not found at currentPath (${entry.currentPath ?? 'none'}) or renamed location (${entry.renamed}), skipping`);
      markEntry(entry, { status: 'skipped', lastError: 'renamed-not-found' });
      continue;
    }

    if (!isSubPath(resolvedFolder, from) || !isSubPath(resolvedFolder, to)) {
      console.warn(`[undo] Skipping entry outside folder: ${from}`);
      markEntry(entry, { status: 'skipped', lastError: 'outside-folder' });
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
      // Use op.original (the log-facing entry identity) so markEntry can match
      // the actual undo-log entry. op.from may be a staging temp path (derived
      // from currentPath) rather than the entry's `renamed` field, which would
      // prevent a match and leave the skip status unpersisted.
      const logEntry = op.original
        ? { original: op.original.to, renamed: op.original.from }
        : { original: op.to, renamed: op.from };
      markEntry(logEntry, { status: 'skipped', lastError: 'original-occupied' });
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