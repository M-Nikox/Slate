import { ipcMain, dialog, app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { IPC } from '../../shared/ipc-channels.js';
import { scanFolder } from '../file-ops/scanner.js';
import { executeRename, executeUndo } from '../file-ops/renamer.js';
import { checkUndoLog } from '../undo/undo-log.js';
import type { RenameOperation, UpdateCheckResponse } from '../../shared/types.js';

/**
 * Compare two semver-like version strings (e.g. "0.6.2" vs "0.7.0" or "v1.2.3").
 * Returns:
 *   > 0 if a > b (a is newer)
 *   < 0 if a < b (b is newer)
 *   0 if equal
 */
export function compareVersions(a: string, b: string): number {
  const cleanA = a.trim().replace(/^v/i, '');
  const cleanB = b.trim().replace(/^v/i, '');

  const partsA = cleanA.split('-')[0].split('.').map(n => parseInt(n, 10) || 0);
  const partsB = cleanB.split('-')[0].split('.').map(n => parseInt(n, 10) || 0);

  const maxLen = Math.max(partsA.length, partsB.length, 3);
  for (let i = 0; i < maxLen; i++) {
    const valA = partsA[i] ?? 0;
    const valB = partsB[i] ?? 0;
    if (valA !== valB) {
      return valA - valB;
    }
  }

  return 0;
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
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 7000);

      const response = await fetch('https://api.github.com/repos/M-Nikox/Slate/releases/latest', {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': `Slate/${app.getVersion()}`,
        },
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout));

      if (!response.ok) {
        if (response.status === 404) {
          return {
            status: 'up-to-date',
            message: 'You are on the latest version.',
          };
        }
        throw new Error(`GitHub responded with HTTP ${response.status}`);
      }

      const releaseData = (await response.json()) as { tag_name?: string; name?: string };
      const remoteTag = releaseData.tag_name || releaseData.name;

      if (!remoteTag || typeof remoteTag !== 'string') {
        return {
          status: 'error',
          message:
            'Update check completed without version information. Release data was missing expected tag.',
        };
      }

      const currentVersion = app.getVersion();
      if (compareVersions(remoteTag, currentVersion) <= 0) {
        return { status: 'up-to-date', message: 'You are on the latest version.' };
      }

      return {
        status: 'update-available',
        message: `Update available: ${remoteTag.replace(/^v/i, '')}`,
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