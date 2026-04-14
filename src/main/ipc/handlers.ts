import { ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { IPC } from '../../shared/ipc-channels.js';
import { scanFolder } from '../file-ops/scanner.js';
import { executeRename, executeUndo } from '../file-ops/renamer.js';
import { checkUndoLog } from '../undo/undo-log.js';
import electronUpdater from 'electron-updater';
const { autoUpdater } = electronUpdater;
import { compare as compareSemver } from 'semver';
import type { RenameOperation, UpdateCheckResponse } from '../../shared/types.js';

function compareVersions(a: string, b: string): number {
  return compareSemver(a.trim(), b.trim());
}

function resolveValidDirectoryPath(folderPath: unknown): string {
  if (typeof folderPath !== 'string' || !folderPath.trim()) {
    throw new Error('Invalid folder path received over IPC');
  }

  const resolved = path.resolve(folderPath);

  if (!path.isAbsolute(resolved)) {
    throw new Error('Folder path must be absolute');
  }

  let stat: fs.Stats;
  try {
    stat = fs.statSync(resolved);
  } catch {
    throw new Error(`Path does not exist: ${resolved}`);
  }

  if (!stat.isDirectory()) {
    throw new Error(`Path is not a valid directory: ${resolved}`);
  }

  return resolved;
}

function validateRenameOperations(operations: unknown): RenameOperation[] {
  if (!Array.isArray(operations) || operations.length === 0) {
    throw new Error('No operations provided');
  }

  const validated: RenameOperation[] = [];

  for (const op of operations) {
    if (
      typeof op !== 'object' ||
      op === null ||
      typeof (op as RenameOperation).from !== 'string' ||
      typeof (op as RenameOperation).to !== 'string'
    ) {
      throw new Error('Malformed rename operation');
    }

    validated.push({
      from: (op as RenameOperation).from,
      to: (op as RenameOperation).to,
    });
  }

  return validated;
}

export function registerHandlers(): void {
  // Defensive: avoid duplicate handler registration in edge startup paths/tests.
  ipcMain.removeHandler(IPC.PICK_FOLDER);
  ipcMain.removeHandler(IPC.SCAN_FOLDER);
  ipcMain.removeHandler(IPC.VALIDATE_FOLDER);
  ipcMain.removeHandler(IPC.RENAME_FILES);
  ipcMain.removeHandler(IPC.CHECK_UNDO);
  ipcMain.removeHandler(IPC.EXECUTE_UNDO);
  ipcMain.removeHandler(IPC.CHECK_FOR_UPDATES);

  ipcMain.handle(IPC.PICK_FOLDER, async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Select a folder containing media files',
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  ipcMain.handle(IPC.SCAN_FOLDER, (_event, folderPath: unknown) => {
    const resolved = resolveValidDirectoryPath(folderPath);
    return scanFolder(resolved);
  });

  ipcMain.handle(IPC.VALIDATE_FOLDER, (_event, folderPath: unknown) => {
    try {
      resolveValidDirectoryPath(folderPath);
      return true;
    } catch {
      return false;
    }
  });

  ipcMain.handle(IPC.RENAME_FILES, (_event, folderPath: unknown, operations: unknown) => {
    const resolvedFolder = resolveValidDirectoryPath(folderPath);
    const validatedOps = validateRenameOperations(operations);
    return executeRename(resolvedFolder, validatedOps);
  });

  ipcMain.handle(IPC.CHECK_UNDO, (_event, folderPath: unknown) => {
    if (typeof folderPath !== 'string' || !folderPath.trim()) {
      return { exists: false, count: 0 };
    }
    const resolved = path.resolve(folderPath);
    const result = checkUndoLog(resolved);
    if (result.status === 'ok') {
      return { exists: result.pending > 0, count: result.pending };
    }
    return { exists: false, count: 0 };
  });

  ipcMain.handle(IPC.EXECUTE_UNDO, (_event, folderPath: unknown) => {
    const resolvedFolder = resolveValidDirectoryPath(folderPath);
    return executeUndo(resolvedFolder);
  });

  ipcMain.handle(IPC.CHECK_FOR_UPDATES, async (): Promise<UpdateCheckResponse> => {
    try {
      const result = await autoUpdater.checkForUpdates();
      const updateInfo = result?.updateInfo;

      if (!updateInfo) {
        return {
          status: 'error',
          message:
            'Update check completed without version information. Automatic updates may be unavailable or not configured for this build.',
        };
      }

      if (compareVersions(updateInfo.version, autoUpdater.currentVersion.version) <= 0) {
        return { status: 'up-to-date', message: 'You are on the latest version.' };
      }

      return {
        status: 'update-available',
        message: `Update available: ${updateInfo.version}`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        status: 'error',
        message: `Unable to check for updates: ${message}`,
      };
    }
  });
}