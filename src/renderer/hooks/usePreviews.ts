import { useMemo } from 'react';
import { parseFilename } from '../../shared/parser/parse-filename.js';
import { buildName } from '../../shared/parser/build-name.js';
import { padSeason, padEpisode } from '../../shared/parser/pad.js';
import type { Confidence, ManualModeConfig, ParseResult, RowOverride, ScannedFile } from '../../shared/types.js';

export interface PreviewRow {
  file: ScannedFile;
  proposedName: string | null;    // null = could not parse
  parsed: boolean;
  confidence: Confidence | null;  // null = unparsed
  overridden: boolean;            // true = user has edited this row
  parsedResult: ParseResult | null; // raw parser output
  effectiveShowName: string | null; // actual show name used in proposedName
  effectiveEpisode: number | null;  // actual episode number used in proposedName
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
        return files.map(file => ({
          file, proposedName: null, parsed: false, confidence: null,
          overridden: false, parsedResult: null, effectiveShowName: null, effectiveEpisode: null,
        }));
      }
      return files.map((file, index) => {
        const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
        const epNum = manualConfig.startEpisode + index;
        const proposedName = `${showName} - S${padSeason(manualConfig.season)}E${padEpisode(epNum)}${ext}`;
        return {
          file, proposedName, parsed: true, confidence: 'high' as const,
          overridden: false, parsedResult: null,
          effectiveShowName: showName, effectiveEpisode: epNum,
        };
      });
    }

    return files.map(file => {
      const result = parseFilename(file.name);
      if (!result) {
        return {
          file, proposedName: null, parsed: false, confidence: null,
          overridden: false, parsedResult: null, effectiveShowName: null, effectiveEpisode: null,
        };
      }
      const override = rowOverrides.get(file.path);
      const effectiveShowName = override?.showName ?? (overrideName.trim() || result.showName);
      const effectiveEpisode = override?.episode ?? result.episode;
      const merged = { ...result, showName: effectiveShowName, episode: effectiveEpisode };
      const proposed = buildName(merged);
      return {
        file, proposedName: proposed, parsed: true, confidence: result.confidence,
        overridden: !!override, parsedResult: result,
        effectiveShowName, effectiveEpisode,
      };
    });
  }, [files, overrideName, manualMode, manualConfig, rowOverrides]);
}
