import fs from 'fs';
import path from 'path';
import type { UndoLog } from '../../shared/types.js';

export const UNDO_FILENAME = '.slate-undo.json';

export function undoLogPath(folderPath: string): string {
  return path.join(folderPath, UNDO_FILENAME);
}

// Returns true if an undo log exists in this folder
export function undoLogExists(folderPath: string): boolean {
  return fs.existsSync(undoLogPath(folderPath));
}

// Returns the number of operations in the undo log, or 0 if none
export function checkUndoLog(folderPath: string): number {
  const logPath = undoLogPath(folderPath);
  if (!fs.existsSync(logPath)) return 0;
  try {
    const raw = fs.readFileSync(logPath, 'utf-8');
    const log: UndoLog = JSON.parse(raw);
    if (log.version !== 1) return 0;
    return log.operations.length;
  } catch {
    return 0;
  }
}

// Writes the undo log. Throws if the write fails — caller must not proceed with rename if this throws.
export function writeUndoLog(log: UndoLog): void {
  const logPath = undoLogPath(log.folderPath);
  const json = JSON.stringify(log, null, 2);
  // Write to a temp file first, then rename atomically
  const tmpPath = logPath + '.tmp';
  fs.writeFileSync(tmpPath, json, 'utf-8');
  fs.renameSync(tmpPath, logPath);
}

// Reads the undo log. Throws if it can't be read or is malformed.
export function readUndoLog(folderPath: string): UndoLog {
  const logPath = undoLogPath(folderPath);
  const raw = fs.readFileSync(logPath, 'utf-8');
  const log: UndoLog = JSON.parse(raw);
  if (log.version !== 1) throw new Error('Unrecognised undo log version');
  if (log.folderPath !== folderPath) throw new Error('Undo log folder path mismatch');
  return log;
}

// Deletes the undo log after a successful undo
export function deleteUndoLog(folderPath: string): void {
  const logPath = undoLogPath(folderPath);
  if (fs.existsSync(logPath)) {
    fs.unlinkSync(logPath);
  }
}