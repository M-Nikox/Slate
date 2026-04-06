import fs from 'fs';
import path from 'path';
import type { ScannedFile } from '../../shared/types.js';

const MEDIA_EXTENSIONS = new Set([
  '.mkv', '.mp4', '.avi', '.mov', '.m4v', '.wmv', '.flv', '.webm',
]);

export function scanFolder(folderPath: string): ScannedFile[] {
  // Resolve to an absolute, canonical path — no symlink tricks, no relative paths
  const resolvedFolder = path.resolve(folderPath);

  // Verify the folder actually exists and is a directory
  const stat = fs.statSync(resolvedFolder);
  if (!stat.isDirectory()) {
    throw new Error(`Not a directory: ${resolvedFolder}`);
  }

  const entries = fs.readdirSync(resolvedFolder, { withFileTypes: true });

  const results: ScannedFile[] = [];

  for (const entry of entries) {
    if (!entry.isFile()) continue;

    const ext = path.extname(entry.name).toLowerCase();
    if (!MEDIA_EXTENSIONS.has(ext)) continue;

    // Construct and re-resolve the full path
    const filePath = path.resolve(resolvedFolder, entry.name);

    // SAFETY: ensure the resolved file path is strictly inside the folder.
    // This prevents path traversal attacks (e.g. a symlink pointing outside).
    const insideFolder = filePath.startsWith(resolvedFolder + path.sep);
    if (!insideFolder) {
      console.warn(`[scanner] Skipping file outside folder: ${filePath}`);
      continue;
    }

    results.push({ name: entry.name, path: filePath });
  }

  return results;
}