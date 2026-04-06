import { useMemo } from 'react';
import { parseFilename } from '../../shared/parser/parse-filename.js';
import { buildName } from '../../shared/parser/build-name.js';
import type { ScannedFile } from '../../shared/types.js';

export interface PreviewRow {
  file: ScannedFile;
  proposedName: string | null;  // null = could not parse
  parsed: boolean;
}

export function usePreviews(
  files: ScannedFile[],
  overrideName: string
): PreviewRow[] {
  return useMemo(() => {
    return files.map(file => {
      const result = parseFilename(file.name);
      if (!result) {
        return { file, proposedName: null, parsed: false };
      }
      const proposed = buildName(result, overrideName || undefined);
      return { file, proposedName: proposed, parsed: true };
    });
  }, [files, overrideName]);
}