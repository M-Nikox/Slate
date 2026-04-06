import type { ScannedFile } from '../shared/types.js';

export type AppStatus =
  | { type: 'idle' }
  | { type: 'renaming' }
  | { type: 'undoing' }
  | { type: 'error'; message: string };

interface LoadFolderDeps {
  validateFolder: (folderPath: string) => Promise<boolean>;
  scanFolder: (folderPath: string) => Promise<ScannedFile[]>;
  checkForUndo: (folderPath: string) => Promise<void>;
  setFolderPath: (folderPath: string) => void;
  setOverrideName: (value: string) => void;
  setSelected: (value: Set<string>) => void;
  setStatus: (status: AppStatus) => void;
  setFiles: (files: ScannedFile[]) => void;
  setLoading: (loading: boolean) => void;
}

export async function loadFolderWithRecovery(picked: string, deps: LoadFolderDeps): Promise<void> {
  deps.setLoading(true);
  try {
    const isDirectory = await deps.validateFolder(picked);
    if (!isDirectory) {
      deps.setStatus({ type: 'error', message: 'Dropped item is not a valid folder.' });
      return;
    }

    deps.setFolderPath(picked);
    deps.setOverrideName('');
    deps.setSelected(new Set());
    deps.setStatus({ type: 'idle' });

    const [scanned] = await Promise.all([
      deps.scanFolder(picked),
      deps.checkForUndo(picked),
    ]);
    deps.setFiles(scanned);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    deps.setStatus({ type: 'error', message });
  } finally {
    deps.setLoading(false);
  }
}
