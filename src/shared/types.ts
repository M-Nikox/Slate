export interface ParseResult {
  showName: string;
  season: number;
  episode: number;
  episodeEnd?: number;
  extension: string;
}

export interface ScannedFile {
  name: string;
  path: string;
}

export interface RenameOperation {
  from: string;   // absolute path, original
  to: string;     // absolute path, proposed
}

export interface UndoEntry {
  original: string;   // absolute path before rename
  renamed: string;    // absolute path after rename
}

export interface UndoLog {
  version: 1;
  timestamp: string;
  folderPath: string;
  operations: UndoEntry[];
}

export interface RenameResult {
  succeeded: RenameOperation[];
  failed: { op: RenameOperation; error: string } | null;
}

export interface CheckUndoResult {
  exists: boolean;
  count: number;
}

export interface UpdateCheckResponse {
  status: 'checking' | 'update-available' | 'up-to-date' | 'error';
  message: string;
}
