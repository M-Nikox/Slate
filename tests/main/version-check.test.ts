import { describe, it, expect } from 'vitest';
import { compareVersions } from '../../src/main/ipc/handlers.js';

describe('compareVersions (native semver comparison)', () => {
  it('detects a newer minor version', () => {
    expect(compareVersions('0.7.0', '0.6.2')).toBeGreaterThan(0);
  });

  it('detects a newer patch version', () => {
    expect(compareVersions('0.6.3', '0.6.2')).toBeGreaterThan(0);
  });

  it('detects a newer major version', () => {
    expect(compareVersions('1.0.0', '0.9.9')).toBeGreaterThan(0);
  });

  it('detects an older version', () => {
    expect(compareVersions('0.6.1', '0.6.2')).toBeLessThan(0);
  });

  it('recognizes equal versions', () => {
    expect(compareVersions('0.6.2', '0.6.2')).toBe(0);
  });

  it('handles "v" prefix gracefully', () => {
    expect(compareVersions('v0.7.0', '0.6.2')).toBeGreaterThan(0);
    expect(compareVersions('0.7.0', 'v0.7.0')).toBe(0);
    expect(compareVersions('v1.2.3', 'v1.2.3')).toBe(0);
  });

  it('handles versions with prerelease tags', () => {
    expect(compareVersions('0.7.0-beta', '0.6.2')).toBeGreaterThan(0);
    expect(compareVersions('0.6.2-rc1', '0.6.2')).toBe(0);
  });

  it('handles irregular lengths and whitespace', () => {
    expect(compareVersions('  0.6.2  ', '0.6.2')).toBe(0);
    expect(compareVersions('1.0', '1.0.0')).toBe(0);
    expect(compareVersions('1.0.1', '1.0')).toBeGreaterThan(0);
  });
});
