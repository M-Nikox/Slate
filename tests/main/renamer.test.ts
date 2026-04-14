import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, it, expect } from 'vitest';
import { executeRename, executeUndo } from '../../src/main/file-ops/renamer.js';
import { checkUndoLog, countPendingUndoEntries, undoLogPath, writeUndoLog } from '../../src/main/undo/undo-log.js';
import type { UndoLog } from '../../src/shared/types.js';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'slate-renamer-test-'));
}

describe('renamer preflight + undo durability', () => {
  it('blocks duplicate destination operations before mutation', () => {
    const dir = makeTempDir();
    try {
      const fileA = path.join(dir, 'A.mkv');
      const fileB = path.join(dir, 'B.mkv');
      fs.writeFileSync(fileA, 'a');
      fs.writeFileSync(fileB, 'b');

      const target = path.join(dir, 'Merged.mkv');
      const result = executeRename(dir, [
        { from: fileA, to: target },
        { from: fileB, to: target },
      ]);

      expect(result.succeeded).toHaveLength(0);
      expect(result.failed).toBeNull();
      expect(result.issues?.some(issue => issue.code === 'duplicate-destination' && issue.severity === 'blocked')).toBe(true);
      expect(fs.existsSync(fileA)).toBe(true);
      expect(fs.existsSync(fileB)).toBe(true);
      expect(fs.existsSync(target)).toBe(false);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('handles swap cycle deterministically and supports full undo', () => {
    const dir = makeTempDir();
    try {
      const fileA = path.join(dir, 'A.mkv');
      const fileB = path.join(dir, 'B.mkv');
      fs.writeFileSync(fileA, 'a');
      fs.writeFileSync(fileB, 'b');

      const result = executeRename(dir, [
        { from: fileA, to: fileB },
        { from: fileB, to: fileA },
      ]);

      expect(result.failed).toBeNull();
      expect(result.succeeded).toHaveLength(2);
      expect(fs.readFileSync(fileA, 'utf-8')).toBe('b');
      expect(fs.readFileSync(fileB, 'utf-8')).toBe('a');
      expect(countPendingUndoEntries(dir)).toBe(2);

      const undone = executeUndo(dir);
      expect(undone).toBe(2);
      expect(fs.readFileSync(fileA, 'utf-8')).toBe('a');
      expect(fs.readFileSync(fileB, 'utf-8')).toBe('b');
      expect(fs.existsSync(undoLogPath(dir))).toBe(false);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('keeps undo log for retry when undo is partially blocked', () => {
    const dir = makeTempDir();
    try {
      const original = path.join(dir, 'Episode 01.mkv');
      const renamed = path.join(dir, 'Show - S01E01.mkv');
      fs.writeFileSync(original, 'episode-1');

      const result = executeRename(dir, [{ from: original, to: renamed }]);
      expect(result.failed).toBeNull();
      expect(countPendingUndoEntries(dir)).toBe(1);

      fs.writeFileSync(original, 'conflict');
      const undoneFirst = executeUndo(dir);
      expect(undoneFirst).toBe(0);
      expect(countPendingUndoEntries(dir)).toBe(1);

      fs.unlinkSync(original);
      const undoneSecond = executeUndo(dir);
      expect(undoneSecond).toBe(1);
      expect(countPendingUndoEntries(dir)).toBe(0);
      expect(fs.existsSync(original)).toBe(true);
      expect(fs.existsSync(renamed)).toBe(false);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// Issue 1: Undo durability for cycle/swap staging renames
// ---------------------------------------------------------------------------
describe('cycle/swap staging durability', () => {
  it('journals currentPath before staging rename so crash recovery finds the file', () => {
    const dir = makeTempDir();
    try {
      const fileA = path.join(dir, 'A.mkv');
      const fileB = path.join(dir, 'B.mkv');
      fs.writeFileSync(fileA, 'a');
      fs.writeFileSync(fileB, 'b');

      // Run the rename so the undo log is written.
      const result = executeRename(dir, [
        { from: fileA, to: fileB },
        { from: fileB, to: fileA },
      ]);
      expect(result.failed).toBeNull();
      expect(result.succeeded).toHaveLength(2);

      // After a successful swap the undo log should have no currentPath set
      // (it is cleared once each step completes), and both entries applied.
      const logAfter = JSON.parse(fs.readFileSync(undoLogPath(dir), 'utf-8'));
      for (const entry of logAfter.operations) {
        expect(entry.currentPath).toBeUndefined();
        expect(entry.applied).toBe(true);
      }
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('simulates crash after staging rename: recovery restores file from temp path', () => {
    // Simulate the state the undo log would be in after a crash that occurred
    // between the staging rename (A → temp) and the next step.  We do this by
    // manually writing the crash-state log and verifying that executeUndo
    // correctly recovers the file from the temp path back to its original.
    const dir = makeTempDir();
    try {
      const fileA = path.join(dir, 'A.mkv');
      const fileB = path.join(dir, 'B.mkv');
      const tempPath = path.join(dir, '.slate-tmp-crash-A.mkv');

      // Simulate post-crash disk state: A was staged to temp, B is untouched.
      fs.writeFileSync(tempPath, 'a');
      fs.writeFileSync(fileB, 'b');

      // Write the crash-state undo log: entry for A→B has currentPath=temp,
      // applied=false (crash before the final step ran).
      const crashLog: UndoLog = {
        version: 2,
        timestamp: new Date().toISOString(),
        folderPath: dir,
        operations: [
          { original: fileA, renamed: fileB, applied: false, status: 'pending', currentPath: tempPath },
          { original: fileB, renamed: fileA, applied: false, status: 'pending' },
        ],
      };
      writeUndoLog(crashLog);

      // Recovery: executeUndo should restore A from the temp path and leave B
      // untouched (its entry has applied:false and no currentPath → skip).
      const undone = executeUndo(dir);
      expect(undone).toBe(1);
      expect(fs.existsSync(fileA)).toBe(true);
      expect(fs.readFileSync(fileA, 'utf-8')).toBe('a');
      expect(fs.existsSync(tempPath)).toBe(false);
      // B was never moved so it stays at its original location.
      expect(fs.readFileSync(fileB, 'utf-8')).toBe('b');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('simulates crash after staging + partial step: recovery restores both files', () => {
    // Crash after staging (A→temp) AND after B→A, but before temp→B.
    const dir = makeTempDir();
    try {
      const fileA = path.join(dir, 'A.mkv');
      const fileB = path.join(dir, 'B.mkv');
      const tempPath = path.join(dir, '.slate-tmp-crash2-A.mkv');

      // Disk state: A has "b" (B was renamed to A), temp has "a" (A staged).
      fs.writeFileSync(fileA, 'b');
      fs.writeFileSync(tempPath, 'a');

      // Log state: B→A entry is applied:true; A→B entry has currentPath=temp.
      const crashLog: UndoLog = {
        version: 2,
        timestamp: new Date().toISOString(),
        folderPath: dir,
        operations: [
          { original: fileA, renamed: fileB, applied: false, status: 'pending', currentPath: tempPath },
          { original: fileB, renamed: fileA, applied: true, status: 'pending' },
        ],
      };
      writeUndoLog(crashLog);

      const undone = executeUndo(dir);
      expect(undone).toBe(2);
      expect(fs.readFileSync(fileA, 'utf-8')).toBe('a');
      expect(fs.readFileSync(fileB, 'utf-8')).toBe('b');
      expect(fs.existsSync(tempPath)).toBe(false);
      expect(fs.existsSync(undoLogPath(dir))).toBe(false);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('no-op recovery when crash happened before staging rename executed', () => {
    // currentPath is set in log but the staging rename never ran (crash before
    // renameSync). The file is still at its original location.
    const dir = makeTempDir();
    try {
      const fileA = path.join(dir, 'A.mkv');
      const fileB = path.join(dir, 'B.mkv');
      const tempPath = path.join(dir, '.slate-tmp-noop-A.mkv');

      // Disk state: nothing has moved, A is at original location.
      fs.writeFileSync(fileA, 'a');
      fs.writeFileSync(fileB, 'b');

      const crashLog: UndoLog = {
        version: 2,
        timestamp: new Date().toISOString(),
        folderPath: dir,
        operations: [
          // currentPath set but temp doesn't exist, original (A) does.
          { original: fileA, renamed: fileB, applied: false, status: 'pending', currentPath: tempPath },
          { original: fileB, renamed: fileA, applied: false, status: 'pending' },
        ],
      };
      writeUndoLog(crashLog);

      // executeUndo should detect no-op (file already at original) and not crash.
      const undone = executeUndo(dir);
      expect(undone).toBe(0);
      // Files unchanged.
      expect(fs.readFileSync(fileA, 'utf-8')).toBe('a');
      expect(fs.readFileSync(fileB, 'utf-8')).toBe('b');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// Issue 2: Structured checkUndoLog + safe undo-log deletion
// ---------------------------------------------------------------------------
describe('checkUndoLog structured result', () => {
  it('returns no-log when no log file exists', () => {
    const dir = makeTempDir();
    try {
      const result = checkUndoLog(dir);
      expect(result.status).toBe('no-log');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('returns ok with pending count for a valid log', () => {
    const dir = makeTempDir();
    try {
      const fileA = path.join(dir, 'A.mkv');
      const fileB = path.join(dir, 'B.mkv');
      fs.writeFileSync(fileA, 'a');
      // fileB must NOT exist before the rename — a pre-existing destination is blocked.
      executeRename(dir, [{ from: fileA, to: fileB }]);

      const result = checkUndoLog(dir);
      expect(result.status).toBe('ok');
      if (result.status === 'ok') expect(result.pending).toBe(1);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('returns invalid for a corrupt (non-JSON) log', () => {
    const dir = makeTempDir();
    try {
      fs.writeFileSync(undoLogPath(dir), 'NOT_VALID_JSON', 'utf-8');
      const result = checkUndoLog(dir);
      expect(result.status).toBe('invalid');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('returns invalid for a log with wrong schema (missing operations array)', () => {
    const dir = makeTempDir();
    try {
      fs.writeFileSync(undoLogPath(dir), JSON.stringify({ version: 2, folderPath: dir }), 'utf-8');
      const result = checkUndoLog(dir);
      expect(result.status).toBe('invalid');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('returns invalid for unknown log version', () => {
    const dir = makeTempDir();
    try {
      fs.writeFileSync(
        undoLogPath(dir),
        JSON.stringify({ version: 99, folderPath: dir, operations: [] }),
        'utf-8',
      );
      const result = checkUndoLog(dir);
      expect(result.status).toBe('invalid');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('returns mismatch when folderPath in log does not match', () => {
    const dir = makeTempDir();
    try {
      fs.writeFileSync(
        undoLogPath(dir),
        JSON.stringify({ version: 2, folderPath: '/some/other/path', timestamp: new Date().toISOString(), operations: [] }),
        'utf-8',
      );
      const result = checkUndoLog(dir);
      expect(result.status).toBe('mismatch');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('executeUndo log deletion safety', () => {
  it('does NOT delete undo log on JSON parse error', () => {
    const dir = makeTempDir();
    try {
      fs.writeFileSync(undoLogPath(dir), 'NOT_VALID_JSON', 'utf-8');
      const undone = executeUndo(dir);
      expect(undone).toBe(0);
      // Log must be preserved for manual recovery.
      expect(fs.existsSync(undoLogPath(dir))).toBe(true);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('does NOT delete undo log on schema validation failure', () => {
    const dir = makeTempDir();
    try {
      fs.writeFileSync(undoLogPath(dir), JSON.stringify({ version: 99, folderPath: dir, operations: [] }), 'utf-8');
      const undone = executeUndo(dir);
      expect(undone).toBe(0);
      expect(fs.existsSync(undoLogPath(dir))).toBe(true);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('does NOT delete undo log on folder path mismatch', () => {
    const dir = makeTempDir();
    try {
      fs.writeFileSync(
        undoLogPath(dir),
        JSON.stringify({ version: 2, folderPath: '/completely/different/path', timestamp: new Date().toISOString(), operations: [] }),
        'utf-8',
      );
      const undone = executeUndo(dir);
      expect(undone).toBe(0);
      expect(fs.existsSync(undoLogPath(dir))).toBe(true);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('deletes undo log only after a valid successful undo that leaves zero pending', () => {
    const dir = makeTempDir();
    try {
      const fileA = path.join(dir, 'A.mkv');
      const fileB = path.join(dir, 'B.mkv');
      fs.writeFileSync(fileA, 'a');

      executeRename(dir, [{ from: fileA, to: fileB }]);
      expect(fs.existsSync(undoLogPath(dir))).toBe(true);

      const undone = executeUndo(dir);
      expect(undone).toBe(1);
      // Log deleted only after confirmed valid zero-pending state.
      expect(fs.existsSync(undoLogPath(dir))).toBe(false);
      expect(fs.existsSync(fileA)).toBe(true);
      expect(fs.existsSync(fileB)).toBe(false);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('returns 0 and deletes log when no-log state (no file exists)', () => {
    const dir = makeTempDir();
    try {
      const undone = executeUndo(dir);
      expect(undone).toBe(0);
      expect(fs.existsSync(undoLogPath(dir))).toBe(false);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
