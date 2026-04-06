import { describe, it, expect } from 'vitest';
import { extractDroppedPath } from '../../src/renderer/components/drop-utils.js';

describe('extractDroppedPath', () => {
  it('prefers dataTransfer.files path when present', () => {
    const path = extractDroppedPath({
      files: [{ path: '/media/Shows' }],
      items: [],
    });
    expect(path).toBe('/media/Shows');
  });

  it('falls back to item.getAsFile path', () => {
    const path = extractDroppedPath({
      files: [],
      items: [{ kind: 'file', getAsFile: () => ({ path: '/media/Fallback' }) }],
    });
    expect(path).toBe('/media/Fallback');
  });

  it('returns null for missing/blank paths', () => {
    const path = extractDroppedPath({
      files: [{ path: '   ' }],
      items: [{ kind: 'file', getAsFile: () => ({ path: '' }) }],
    });
    expect(path).toBeNull();
  });

  it('extracts path from text/uri-list when file.path is unavailable', () => {
    const path = extractDroppedPath({
      files: [],
      items: [],
      getData: (format: string) => format === 'text/uri-list'
        ? 'file:///home/runner/Shows'
        : '',
    });
    expect(path).toBe('/home/runner/Shows');
  });

  it('extracts windows path from file URI', () => {
    const path = extractDroppedPath({
      files: [],
      items: [],
      getData: (format: string) => format === 'text/plain'
        ? 'file:///C:/Users/Alice/Videos'
        : '',
    });
    expect(path).toBe('C:/Users/Alice/Videos');
  });

  it('uses bridge resolver when file.path is unavailable', () => {
    const droppedFile = { name: 'TestSlate' } as unknown as File;
    const path = extractDroppedPath(
      {
        files: [droppedFile],
        items: [],
      },
      () => '/Users/Alice/Desktop/TestSlate',
    );
    expect(path).toBe('/Users/Alice/Desktop/TestSlate');
  });
});
