import path from 'path';
import type { RenameIssue } from '../../shared/types.js';

const INVALID_FILENAME_CHARS = /[<>:"/\\|?*\u0000-\u001F]/;
const WINDOWS_RESERVED_NAME = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i;
const MAX_BASENAME_LENGTH = 255;
const MAX_PATH_LENGTH_WINDOWS = 260;

export function validateDestinationName(destinationPath: string): RenameIssue[] {
  const issues: RenameIssue[] = [];
  const baseName = path.basename(destinationPath);

  if (!baseName || baseName === '.' || baseName === '..') {
    issues.push({
      severity: 'blocked',
      code: 'invalid-basename',
      message: 'Destination filename is empty or invalid.',
    });
    return issues;
  }

  if (INVALID_FILENAME_CHARS.test(baseName)) {
    issues.push({
      severity: 'blocked',
      code: 'invalid-characters',
      message: `Destination filename "${baseName}" contains illegal characters.`,
    });
  }

  if (WINDOWS_RESERVED_NAME.test(baseName)) {
    issues.push({
      severity: 'blocked',
      code: 'reserved-name',
      message: `Destination filename "${baseName}" is reserved on Windows.`,
    });
  }

  if (/[. ]$/.test(baseName)) {
    issues.push({
      severity: 'blocked',
      code: 'trailing-dot-space',
      message: `Destination filename "${baseName}" ends with a dot or space and is not portable.`,
    });
  }

  if (baseName.length > MAX_BASENAME_LENGTH) {
    issues.push({
      severity: 'blocked',
      code: 'basename-too-long',
      message: `Destination filename "${baseName}" exceeds ${MAX_BASENAME_LENGTH} characters.`,
    });
  }

  if (process.platform === 'win32' && destinationPath.length >= MAX_PATH_LENGTH_WINDOWS) {
    issues.push({
      severity: 'blocked',
      code: 'path-too-long',
      message: `Destination path exceeds ${MAX_PATH_LENGTH_WINDOWS} characters on Windows.`,
    });
  }

  return issues;
}
