import type {
  ScannedFile,
  RenameOperation,
  RenameResult,
  CheckUndoResult,
  UpdateCheckResponse,
} from '../shared/types.js';

interface ElectronAPI {
  pickFolder:   () => Promise<string | null>;
  scanFolder:   (folderPath: string) => Promise<ScannedFile[]>;
  renameFiles:  (folderPath: string, ops: RenameOperation[]) => Promise<RenameResult>;
  checkUndo:    (folderPath: string) => Promise<CheckUndoResult>;
  executeUndo:  (folderPath: string) => Promise<number>;
  checkForUpdates: () => Promise<UpdateCheckResponse>;
  setTitle:     (title: string) => void;
  getPathForFile: (file: File) => string;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export const bridge = {
  pickFolder:  () => window.electronAPI.pickFolder(),
  scanFolder:  (p: string) => window.electronAPI.scanFolder(p),
  renameFiles: (p: string, ops: RenameOperation[]) => window.electronAPI.renameFiles(p, ops),
  checkUndo:   (p: string) => window.electronAPI.checkUndo(p),
  executeUndo: (p: string) => window.electronAPI.executeUndo(p),
  checkForUpdates: () => window.electronAPI.checkForUpdates(),
  setTitle:    (t: string) => window.electronAPI.setTitle(t),
  getPathForFile: (file: File) => window.electronAPI.getPathForFile(file),
};
