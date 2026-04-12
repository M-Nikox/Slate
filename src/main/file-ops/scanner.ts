import fs from 'fs';
import path from 'path';
import type { ScannedFile } from '../../shared/types.js';

const MEDIA_EXTENSIONS = new Set([
  '.mkv', '.mp4', '.avi', '.mov', '.m4v', '.wmv', '.flv', '.webm',
]);

function isSubPath(parent: string, child: string): boolean {
  const rel = path.relative(parent, child);
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
}

export function scanFolder(folderPath: string): ScannedFile[] {
  const resolvedFolder = path.resolve(folderPath);

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

    const filePath = path.resolve(resolvedFolder, entry.name);

    if (!isSubPath(resolvedFolder, filePath)) {
      console.warn(`[scanner] Skipping file outside folder: ${filePath}`);
      continue;
    }

    results.push({ name: entry.name, path: filePath });
  }

  return results;
}