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

export function checkUndoLog(folderPath: string): number {
  const logPath = undoLogPath(folderPath);
  if (!fs.existsSync(logPath)) return 0;

  try {
    const raw = fs.readFileSync(logPath, 'utf-8');
    const log = normalizeUndoLog(JSON.parse(raw), folderPath);
    return log.operations.filter(isPendingUndo).length;
  } catch {
    return 0;
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
  if (entry.applied === false) return false;
  return entry.status !== 'done';
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
    };
  });

  return {
    version: 2,
    timestamp: typeof raw.timestamp === 'string' ? raw.timestamp : new Date().toISOString(),
    folderPath,
    operations: normalizedOps,
  };
}
