import { useMemo } from 'react';
import { parseFilename } from '../../shared/parser/parse-filename.js';
import { buildName } from '../../shared/parser/build-name.js';
import type { Confidence, ManualModeConfig, ScannedFile } from '../../shared/types.js';

export interface PreviewRow {
  file: ScannedFile;
  proposedName: string | null;  // null = could not parse
  parsed: boolean;
  confidence: Confidence | null;  // null = unparsed
}

export function usePreviews(
  files: ScannedFile[],
  overrideName: string,
  manualMode: boolean,
  manualConfig: ManualModeConfig | null,
): PreviewRow[] {
  return useMemo(() => {
    if (manualMode && manualConfig && manualConfig.showName.trim()) {
      return files.map((file, index) => {
        const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
        const ep = String(manualConfig.startEpisode + index).padStart(2, '0');
        const season = String(manualConfig.season).padStart(2, '0');
        const proposedName = `${manualConfig.showName.trim()} - S${season}E${ep}${ext}`;
        return { file, proposedName, parsed: true, confidence: 'high' };
      });
    }

    return files.map(file => {
      const result = parseFilename(file.name);
      if (!result) {
        return { file, proposedName: null, parsed: false, confidence: null };
      }
      const proposed = buildName(result, overrideName || undefined);
      return { file, proposedName: proposed, parsed: true, confidence: result.confidence };
    });
  }, [files, overrideName, manualMode, manualConfig]);
}