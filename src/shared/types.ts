export type Confidence = 'high' | 'low';

export interface ParseResult {
  showName: string;
  season: number;
  episode: number;
  episodeEnd?: number;
  extension: string;
  confidence: Confidence;
  ambiguous?: boolean;
  warnings?: string[];
}

export interface ManualModeConfig {
  showName: string;
  season: number;
  startEpisode: number;
}

export interface RowOverride {
  showName: string;
  episode: number;
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
  applied?: boolean;
  status?: 'pending' | 'done' | 'skipped';
  lastError?: string;
  /**
   * Set when a cycle/swap staging rename moves the file to a temporary path
   * (e.g. `.slate-tmp-*`) before the final rename step completes. Tracks the
   * actual on-disk location of the file during an in-progress batch so that
   * crash recovery can locate and restore it even when `applied` is still
   * false. Cleared once the final rename for this entry succeeds.
   */
  currentPath?: string;
}

export interface UndoLog {
  version: 1 | 2;
  timestamp: string;
  folderPath: string;
  operations: UndoEntry[];
}

export type RenameIssueSeverity = 'warning' | 'blocked';

export interface RenameIssue {
  severity: RenameIssueSeverity;
  code: string;
  message: string;
  op?: RenameOperation;
}

export interface RenameResult {
  succeeded: RenameOperation[];
  failed: { op: RenameOperation; error: string } | null;
  issues?: RenameIssue[];
}

export interface CheckUndoResult {
  exists: boolean;
  count: number;
}

export interface UpdateCheckResponse {
  status: 'checking' | 'update-available' | 'up-to-date' | 'error';
  message: string;
}
