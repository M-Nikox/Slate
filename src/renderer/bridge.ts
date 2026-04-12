import type {
  ScannedFile,
  RenameOperation,
  RenameResult,
  CheckUndoResult,
  UpdateCheckResponse,
} from '../shared/types.js';

interface ElectronAPI {
  pickFolder: () => Promise<string | null>;
  scanFolder: (folderPath: string) => Promise<ScannedFile[]>;
  renameFiles: (folderPath: string, ops: RenameOperation[]) => Promise<RenameResult>;
  checkUndo: (folderPath: string) => Promise<CheckUndoResult>;
  executeUndo: (folderPath: string) => Promise<number>;
  checkForUpdates: () => Promise<UpdateCheckResponse>;
  setTitle: (title: string) => void;
  getPathForFile: (file: File) => string;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

function requireElectronAPI(): ElectronAPI {
  if (!window.electronAPI) {
    throw new Error('electronAPI is not available. Check preload configuration.');
  }
  return window.electronAPI;
}

export const bridge = {
  pickFolder: () => requireElectronAPI().pickFolder(),
  scanFolder: (p: string) => requireElectronAPI().scanFolder(p),
  renameFiles: (p: string, ops: RenameOperation[]) => requireElectronAPI().renameFiles(p, ops),
  checkUndo: (p: string) => requireElectronAPI().checkUndo(p),
  executeUndo: (p: string) => requireElectronAPI().executeUndo(p),
  checkForUpdates: () => requireElectronAPI().checkForUpdates(),
  setTitle: (t: string) => requireElectronAPI().setTitle(t),
  getPathForFile: (file: File) => requireElectronAPI().getPathForFile(file),
};