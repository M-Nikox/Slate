import fs from 'fs';
import path from 'path';
import type { UndoEntry, UndoLog } from '../../shared/types.js';

export const UNDO_FILENAME = '.slate-undo.json';

export function undoLogPath(folderPath: string): string {
  return path.join(folderPath, UNDO_FILENAME);
}

export function undoLogExists(folderPath: string): boolean {
  return fs.existsSync(undoLogPath(folderPath));
}

/**
 * Structured result from inspecting an undo log.
 *
 * - `no-log`   – file does not exist (safe to treat as empty)
 * - `ok`       – log parsed and validated; `pending` is the count of entries
 *                that still need to be undone. Delete the log ONLY when
 *                `status === 'ok' && pending === 0`.
 * - `invalid`  – JSON parse error or schema validation failure; log is
 *                potentially corrupted but should NOT be deleted.
 * - `mismatch` – folder-path mismatch; log belongs to a different folder and
 *                should NOT be deleted.
 * - `io-error` – transient read error; log should NOT be deleted.
 */
export type UndoLogCheckResult =
  | { status: 'ok'; pending: number }
  | { status: 'no-log' }
  | { status: 'invalid'; error: string }
  | { status: 'mismatch'; error: string }
  | { status: 'io-error'; error: string };

function getParsedUndoLogFolderPath(value: unknown): string | undefined {
  if (!value || typeof value !== 'object') return undefined;

  const candidate = (value as { folderPath?: unknown }).folderPath;
  return typeof candidate === 'string' ? candidate : undefined;
}

export function checkUndoLog(folderPath: string): UndoLogCheckResult {
  const logPath = undoLogPath(folderPath);
  if (!fs.existsSync(logPath)) return { status: 'no-log' };

  let raw: string;
  try {
    raw = fs.readFileSync(logPath, 'utf-8');
  } catch (e) {
    return { status: 'io-error', error: e instanceof Error ? e.message : String(e) };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    return { status: 'invalid', error: `JSON parse error: ${e instanceof Error ? e.message : String(e)}` };
  }

  const parsedFolderPath = getParsedUndoLogFolderPath(parsed);
  if (parsedFolderPath !== undefined && parsedFolderPath !== folderPath) {
    return {
      status: 'mismatch',
      error: `Undo log folderPath mismatch: expected "${folderPath}" but found "${parsedFolderPath}"`,
    };
  }

  try {
    const log = normalizeUndoLog(parsed, folderPath);
    return { status: 'ok', pending: log.operations.filter(isPendingUndo).length };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { status: 'invalid', error: msg };
  }
}

export function writeUndoLog(log: UndoLog): void {
  const logPath = undoLogPath(log.folderPath);
  const json = JSON.stringify(log, null, 2);

  const tmpPath = logPath + '.tmp';
  fs.writeFileSync(tmpPath, json, 'utf-8');
  fs.renameSync(tmpPath, logPath);
}

export function readUndoLog(folderPath: string): UndoLog {
  const logPath = undoLogPath(folderPath);
  const raw = fs.readFileSync(logPath, 'utf-8');
  const parsed: unknown = JSON.parse(raw);
  return normalizeUndoLog(parsed, folderPath);
}

export function deleteUndoLog(folderPath: string): void {
  const logPath = undoLogPath(folderPath);
  if (fs.existsSync(logPath)) {
    fs.unlinkSync(logPath);
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isPendingUndo(entry: UndoEntry): boolean {
  if (entry.applied !== false || entry.currentPath !== undefined) return entry.status !== 'done';
  return false;
}

export function countPendingUndoEntries(folderPath: string): number {
  const logPath = undoLogPath(folderPath);
  if (!fs.existsSync(logPath)) return 0;
  try {
    const log = readUndoLog(folderPath);
    return log.operations.filter(isPendingUndo).length;
  } catch {
    return 0;
  }
}

function normalizeUndoLog(raw: unknown, expectedFolderPath: string): UndoLog {
  if (!isObject(raw)) throw new Error('Malformed undo log');
  const version = raw.version;
  const folderPath = raw.folderPath;
  const operations = raw.operations;
  if (typeof folderPath !== 'string') throw new Error('Malformed undo log folder path');
  if (folderPath !== expectedFolderPath) throw new Error('Undo log folder path mismatch');
  if (!Array.isArray(operations)) throw new Error('Malformed undo log operations');
  if (version !== 1 && version !== 2) throw new Error('Unrecognised undo log version');

  const validStatuses = new Set(['done', 'pending', 'skipped']);
  const normalizedOps: UndoEntry[] = operations.map((entry): UndoEntry => {
    if (!isObject(entry)) throw new Error('Malformed undo log entry');
    if (typeof entry.original !== 'string' || typeof entry.renamed !== 'string') {
      throw new Error('Malformed undo log entry paths');
    }
    return {
      original: entry.original,
      renamed: entry.renamed,
      applied: typeof entry.applied === 'boolean' ? entry.applied : true,
      status: typeof entry.status === 'string' && validStatuses.has(entry.status)
        ? entry.status as UndoEntry['status']
        : 'pending',
      lastError: typeof entry.lastError === 'string' ? entry.lastError : undefined,
      currentPath: typeof entry.currentPath === 'string' ? entry.currentPath : undefined,
    };
  });

  return {
    version: 2,
    timestamp: typeof raw.timestamp === 'string' ? raw.timestamp : new Date().toISOString(),
    folderPath,
    operations: normalizedOps,
  };
}
