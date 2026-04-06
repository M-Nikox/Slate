import { describe, it, expect, vi } from 'vitest';
import { loadFolderWithRecovery } from '../../src/renderer/load-folder.js';

describe('loadFolderWithRecovery', () => {
  it('sets loading false when folder validation fails', async () => {
    const setLoading = vi.fn();
    const setStatus = vi.fn();

    await loadFolderWithRecovery('/bad/path', {
      validateFolder: vi.fn(async () => false),
      scanFolder: vi.fn(async () => []),
      checkForUndo: vi.fn(async () => {}),
      setFolderPath: vi.fn(),
      setOverrideName: vi.fn(),
      setSelected: vi.fn(),
      setStatus,
      setFiles: vi.fn(),
      setLoading,
    });

    expect(setLoading).toHaveBeenNthCalledWith(1, true);
    expect(setStatus).toHaveBeenCalledWith({ type: 'error', message: 'Dropped item is not a valid folder.' });
    expect(setLoading).toHaveBeenLastCalledWith(false);
  });

  it('sets loading false when scan throws', async () => {
    const setLoading = vi.fn();
    const setStatus = vi.fn();

    await loadFolderWithRecovery('/ok/path', {
      validateFolder: vi.fn(async () => true),
      scanFolder: vi.fn(async () => {
        throw new Error('scan failed');
      }),
      checkForUndo: vi.fn(async () => {}),
      setFolderPath: vi.fn(),
      setOverrideName: vi.fn(),
      setSelected: vi.fn(),
      setStatus,
      setFiles: vi.fn(),
      setLoading,
    });

    expect(setLoading).toHaveBeenNthCalledWith(1, true);
    expect(setStatus).toHaveBeenCalledWith({ type: 'error', message: 'scan failed' });
    expect(setLoading).toHaveBeenLastCalledWith(false);
  });
});
