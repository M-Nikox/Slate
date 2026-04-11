import fs from 'fs';
import path from 'path';
import type { RenameOperation, RenameResult, UndoEntry, UndoLog } from '../../shared/types.js';
import { writeUndoLog, readUndoLog, deleteUndoLog } from '../undo/undo-log.js';

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

  if (!fs.existsSync(resolvedFrom)) {
    return `Source file does not exist: ${resolvedFrom}`;
  }

  if (fs.existsSync(resolvedTo) && resolvedFrom !== resolvedTo) {
    return `Destination already exists: ${resolvedTo}`;
  }

  return null;
}

export function executeRename(folderPath: string, operations: RenameOperation[]): RenameResult {
  const resolvedFolder = path.resolve(folderPath);

  for (const op of operations) {
    const error = validateOperation(op, resolvedFolder);
    if (error) {
      throw new Error(`Validation failed before rename: ${error}`);
    }
  }

  const undoEntries: UndoEntry[] = operations.map(op => ({
    original: path.resolve(op.from),
    renamed: path.resolve(op.to),
  }));

  const log: UndoLog = {
    version: 1,
    timestamp: new Date().toISOString(),
    folderPath: resolvedFolder,
    operations: undoEntries,
  };

  writeUndoLog(log);

  const succeeded: RenameOperation[] = [];

  for (const op of operations) {
    const from = path.resolve(op.from);
    const to = path.resolve(op.to);

    try {
      fs.renameSync(from, to);
      succeeded.push({ from, to });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        succeeded,
        failed: { op: { from, to }, error: message },
      };
    }
  }

  return { succeeded, failed: null };
}

export function executeUndo(folderPath: string): number {
  const resolvedFolder = path.resolve(folderPath);
  const log = readUndoLog(resolvedFolder);

  let count = 0;

  for (const entry of [...log.operations].reverse()) {
    const from = path.resolve(entry.renamed);
    const to = path.resolve(entry.original);

    if (!isSubPath(resolvedFolder, from) || !isSubPath(resolvedFolder, to)) {
      console.warn(`[undo] Skipping entry outside folder: ${from}`);
      continue;
    }

    if (!fs.existsSync(from)) {
      console.warn(`[undo] Renamed file not found, skipping: ${from}`);
      continue;
    }

    if (fs.existsSync(to) && from !== to) {
      console.warn(`[undo] Original path already occupied, skipping: ${to}`);
      continue;
    }

    fs.renameSync(from, to);
    count++;
  }

  deleteUndoLog(resolvedFolder);
  return count;
}