import { contextBridge, ipcRenderer, webUtils } from 'electron';
import { IPC } from '../shared/ipc-channels.js';
import type {
  ScannedFile,
  RenameOperation,
  RenameResult,
  CheckUndoResult,
  UpdateCheckResponse,
} from '../shared/types.js';

contextBridge.exposeInMainWorld('electronAPI', {
  pickFolder: (): Promise<string | null> =>
    ipcRenderer.invoke(IPC.PICK_FOLDER),

  scanFolder: (folderPath: string): Promise<ScannedFile[]> =>
    ipcRenderer.invoke(IPC.SCAN_FOLDER, folderPath),

  renameFiles: (
    folderPath: string,
    operations: RenameOperation[]
  ): Promise<RenameResult> =>
    ipcRenderer.invoke(IPC.RENAME_FILES, folderPath, operations),

  checkUndo: (folderPath: string): Promise<CheckUndoResult> =>
    ipcRenderer.invoke(IPC.CHECK_UNDO, folderPath),

  executeUndo: (folderPath: string): Promise<number> =>
    ipcRenderer.invoke(IPC.EXECUTE_UNDO, folderPath),

  checkForUpdates: (): Promise<UpdateCheckResponse> =>
    ipcRenderer.invoke(IPC.CHECK_FOR_UPDATES),

  getPathForFile: (file: File): string => {
    // Duck-type check instead of instanceof to avoid cross-realm failures
    // under contextIsolation (renderer and preload live in different V8 contexts).
    if (
      !file ||
      typeof file !== 'object' ||
      typeof (file as { name?: unknown }).name !== 'string'
    ) {
      return '';
    }
    try {
      return webUtils.getPathForFile(file);
    } catch {
      return '';
    }
  },

  setTitle: (title: string): void => {
    if (typeof title !== 'string') return;
    ipcRenderer.send(IPC.SET_TITLE, title);
  },
});

console.log('[preload] electronAPI exposed');