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
  safety: 'safe' | 'warning' | 'blocked';
  reasons: string[];
}

function validateProposedName(name: string): { safety: 'safe' | 'warning' | 'blocked'; reasons: string[] } {
  const reasons: string[] = [];
  const invalidChars = /[<>:"/\\|?*\u0000-\u001F]/;
  const reserved = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i;

  if (!name.trim()) reasons.push('Destination name is empty.');
  if (invalidChars.test(name)) reasons.push('Destination name contains illegal characters.');
  if (reserved.test(name)) reasons.push('Destination name uses a reserved Windows name.');
  if (/[. ]$/.test(name)) reasons.push('Destination name ends with dot/space (not portable).');
  if (name.length > 255) reasons.push('Destination name is too long.');

  return reasons.length > 0
    ? { safety: 'blocked', reasons }
    : { safety: 'safe', reasons: [] };
}

function applyEpisodeOverrideIfValid(result: ParseResult, overrideEpisode: number | undefined): ParseResult {
  if (overrideEpisode === undefined || !Number.isFinite(overrideEpisode) || overrideEpisode <= 0) {
    return result;
  }

  if (result.episodeEnd !== undefined && result.episodeEnd > result.episode) {
    const span = result.episodeEnd - result.episode;
    return {
      ...result,
      episode: overrideEpisode,
      episodeEnd: overrideEpisode + span,
    };
  }

  return {
    ...result,
    episode: overrideEpisode,
    episodeEnd: undefined,
  };
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
          safety: 'blocked', reasons: ['Manual mode requires a show name.'],
        }));
      }
      return files.map((file, index) => {
        const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
        const epNum = manualConfig.startEpisode + index;
        const proposedName = `${showName} - S${padSeason(manualConfig.season)}E${padEpisode(epNum)}${ext}`;
        const nameValidation = validateProposedName(proposedName);
        return {
          file, proposedName, parsed: true, confidence: 'high' as const,
          overridden: false, parsedResult: null,
          effectiveShowName: showName, effectiveEpisode: epNum,
          safety: nameValidation.safety, reasons: nameValidation.reasons,
        };
      });
    }

    return files.map(file => {
      const result = parseFilename(file.name);
      if (!result) {
        return {
          file, proposedName: null, parsed: false, confidence: null,
          overridden: false, parsedResult: null, effectiveShowName: null, effectiveEpisode: null,
          safety: 'blocked', reasons: ['Could not parse filename.'],
        };
      }
      const override = rowOverrides.get(file.path);
      const effectiveShowName = override?.showName ?? (overrideName.trim() || result.showName);
      const effectiveEpisode = override?.episode ?? result.episode;
      const merged = applyEpisodeOverrideIfValid({ ...result, showName: effectiveShowName }, override?.episode);
      const proposed = buildName(merged);
      const reasons = [...(result.warnings ?? [])];
      let safety: 'safe' | 'warning' | 'blocked' = result.ambiguous ? 'warning' : 'safe';
      if (result.ambiguous) {
        reasons.push('Ambiguous low-confidence parse; review before renaming.');
      }
      const nameValidation = validateProposedName(proposed);
      if (nameValidation.safety === 'blocked') {
        safety = 'blocked';
        reasons.push(...nameValidation.reasons);
      }
      return {
        file, proposedName: proposed, parsed: true, confidence: result.confidence,
        overridden: !!override, parsedResult: result,
        effectiveShowName, effectiveEpisode,
        safety, reasons,
      };
    });
  }, [files, overrideName, manualMode, manualConfig, rowOverrides]);
}
