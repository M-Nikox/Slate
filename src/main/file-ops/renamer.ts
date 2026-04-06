import fs from 'fs';
import path from 'path';
import type { RenameOperation, RenameResult, UndoEntry, UndoLog } from '../../shared/types.js';
import { writeUndoLog, readUndoLog, deleteUndoLog } from '../undo/undo-log.js';

// Validates a single rename operation before execution:
// - both paths must be absolute
// - both paths must be inside the same folder
// - source file must exist
// - destination must not already exist (no silent overwrites)
function validateOperation(op: RenameOperation, folderPath: string): string | null {
  const resolvedFolder = path.resolve(folderPath);
  const resolvedFrom   = path.resolve(op.from);
  const resolvedTo     = path.resolve(op.to);

  if (!path.isAbsolute(resolvedFrom) || !path.isAbsolute(resolvedTo)) {
    return 'Paths must be absolute';
  }

  const sep = path.sep;
  if (!resolvedFrom.startsWith(resolvedFolder + sep)) {
    return `Source is outside the target folder: ${resolvedFrom}`;
  }
  if (!resolvedTo.startsWith(resolvedFolder + sep)) {
    return `Destination is outside the target folder: ${resolvedTo}`;
  }

  if (!fs.existsSync(resolvedFrom)) {
    return `Source file does not exist: ${resolvedFrom}`;
  }

  if (fs.existsSync(resolvedTo) && resolvedFrom !== resolvedTo) {
    return `Destination already exists: ${resolvedTo}`;
  }

  return null; // valid
}

export function executeRename(
  folderPath: string,
  operations: RenameOperation[]
): RenameResult {
  const resolvedFolder = path.resolve(folderPath);

  // --- Step 1: Validate ALL operations before touching anything ---
  for (const op of operations) {
    const error = validateOperation(op, resolvedFolder);
    if (error) {
      throw new Error(`Validation failed before rename: ${error}`);
    }
  }

  // --- Step 2: Write undo log BEFORE renaming anything ---
  // If this throws, we stop here and nothing is renamed.
  const undoEntries: UndoEntry[] = operations.map(op => ({
    original: path.resolve(op.from),
    renamed:  path.resolve(op.to),
  }));

  const log: UndoLog = {
    version: 1,
    timestamp: new Date().toISOString(),
    folderPath: resolvedFolder,
    operations: undoEntries,
  };

  writeUndoLog(log); // throws on failure

  // --- Step 3: Rename files one by one ---
  const succeeded: RenameOperation[] = [];

  for (const op of operations) {
    try {
      fs.renameSync(path.resolve(op.from), path.resolve(op.to));
      succeeded.push(op);
    } catch (err) {
      // Stop on first failure. Already-renamed files are in the undo log.
      const message = err instanceof Error ? err.message : String(err);
      return {
        succeeded,
        failed: { op, error: message },
      };
    }
  }

  return { succeeded, failed: null };
}

export function executeUndo(folderPath: string): number {
  const resolvedFolder = path.resolve(folderPath);
  const log = readUndoLog(resolvedFolder); // throws if missing or malformed

  let count = 0;

  // Reverse the operations in reverse order
  for (const entry of [...log.operations].reverse()) {
    const from = path.resolve(entry.renamed);   // current name
    const to   = path.resolve(entry.original);  // original name

    // Safety: both must be inside the folder
    const sep = path.sep;
    if (
      !from.startsWith(resolvedFolder + sep) ||
      !to.startsWith(resolvedFolder + sep)
    ) {
      console.warn(`[undo] Skipping entry outside folder: ${from}`);
      continue;
    }

    // Only undo if the renamed file exists
    if (!fs.existsSync(from)) {
      console.warn(`[undo] Renamed file not found, skipping: ${from}`);
      continue;
    }

    // Don't overwrite an existing file
    if (fs.existsSync(to) && from !== to) {
      console.warn(`[undo] Original path already occupied, skipping: ${to}`);
      continue;
    }

    fs.renameSync(from, to);
    count++;
  }

  // Clean up the log only after all undos complete
  deleteUndoLog(resolvedFolder);
  return count;
}