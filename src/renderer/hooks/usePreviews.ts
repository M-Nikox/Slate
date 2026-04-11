import { useMemo } from 'react';
import { parseFilename } from '../../shared/parser/parse-filename.js';
import { buildName } from '../../shared/parser/build-name.js';
import type { Confidence, ManualModeConfig, RowOverride, ScannedFile } from '../../shared/types.js';

export interface PreviewRow {
  file: ScannedFile;
  proposedName: string | null;  // null = could not parse
  parsed: boolean;
  confidence: Confidence | null;  // null = unparsed
  overridden: boolean;            // true = user has edited this row
}

export function usePreviews(
  files: ScannedFile[],
  overrideName: string,
  manualMode: boolean,
  manualConfig: ManualModeConfig | null,
  rowOverrides: Map<string, RowOverride>,
): PreviewRow[] {
  return useMemo(() => {
    if (manualMode) {
      const showName = manualConfig?.showName.trim();
      if (!manualConfig || !showName) {
        return files.map(file => ({ file, proposedName: null, parsed: false, confidence: null, overridden: false }));
      }
      return files.map((file, index) => {
        const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
        const ep = String(manualConfig.startEpisode + index).padStart(2, '0');
        const season = String(manualConfig.season).padStart(2, '0');
        const proposedName = `${showName} - S${season}E${ep}${ext}`;
        return { file, proposedName, parsed: true, confidence: 'high' as const, overridden: false };
      });
    }

    return files.map(file => {
      const result = parseFilename(file.name);
      if (!result) {
        return { file, proposedName: null, parsed: false, confidence: null, overridden: false };
      }
      const override = rowOverrides.get(file.path);
      const merged = override
        ? { ...result, showName: override.showName, episode: override.episode }
        : result;
      const proposed = buildName(merged, override ? undefined : (overrideName || undefined));
      return { file, proposedName: proposed, parsed: true, confidence: result.confidence, overridden: !!override };
    });
  }, [files, overrideName, manualMode, manualConfig, rowOverrides]);
}