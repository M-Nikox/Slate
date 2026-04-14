import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, it, expect } from 'vitest';
import { executeRename, executeUndo } from '../../src/main/file-ops/renamer.js';
import { checkUndoLog, undoLogPath } from '../../src/main/undo/undo-log.js';

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
      expect(checkUndoLog(dir)).toBe(2);

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
      expect(checkUndoLog(dir)).toBe(1);

      fs.writeFileSync(original, 'conflict');
      const undoneFirst = executeUndo(dir);
      expect(undoneFirst).toBe(0);
      expect(checkUndoLog(dir)).toBe(1);

      fs.unlinkSync(original);
      const undoneSecond = executeUndo(dir);
      expect(undoneSecond).toBe(1);
      expect(checkUndoLog(dir)).toBe(0);
      expect(fs.existsSync(original)).toBe(true);
      expect(fs.existsSync(renamed)).toBe(false);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
