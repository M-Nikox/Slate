import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, it, expect } from 'vitest';
import { scanFolder } from '../../src/main/file-ops/scanner.js';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'slate-scanner-test-'));
}

describe('scanFolder ordering', () => {
  it('returns deterministic filename order', () => {
    const dir = makeTempDir();
    try {
      fs.writeFileSync(path.join(dir, 'Episode 10.mkv'), '10');
      fs.writeFileSync(path.join(dir, 'Episode 2.mkv'), '2');
      fs.writeFileSync(path.join(dir, 'Episode 01.mkv'), '1');
      fs.writeFileSync(path.join(dir, 'ignore.txt'), 'x');

      const first = scanFolder(dir).map(f => f.name);
      const second = scanFolder(dir).map(f => f.name);

      expect(first).toEqual(second);
      expect(first).toEqual(['Episode 01.mkv', 'Episode 2.mkv', 'Episode 10.mkv']);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
