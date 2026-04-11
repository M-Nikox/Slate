import fs from 'fs';
import path from 'path';
import type { UndoLog } from '../../shared/types.js';

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
    const log: UndoLog = JSON.parse(raw);
    if (log.version !== 1) return 0;
    if (!Array.isArray(log.operations)) return 0;
    return log.operations.length;
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
  const log: UndoLog = JSON.parse(raw);

  if (log.version !== 1) throw new Error('Unrecognised undo log version');
  if (log.folderPath !== folderPath) throw new Error('Undo log folder path mismatch');
  if (!Array.isArray(log.operations)) throw new Error('Malformed undo log operations');

  return log;
}

export function deleteUndoLog(folderPath: string): void {
  const logPath = undoLogPath(folderPath);
  if (fs.existsSync(logPath)) {
    fs.unlinkSync(logPath);
  }
}