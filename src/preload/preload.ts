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
    // Defensive guard: avoid weird renderer misuse
    if (!(file instanceof File)) return '';
    return webUtils.getPathForFile(file);
  },

  setTitle: (title: string): void => {
    if (typeof title !== 'string') return;
    ipcRenderer.send(IPC.SET_TITLE, title);
  },
});

console.log('[preload] electronAPI exposed');