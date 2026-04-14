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
  // Empty name is a hard block — nothing useful can be inferred.
  const trimmedName = name.trim();
  if (!trimmedName) {
    return { safety: 'blocked', reasons: ['Destination name is empty.'] };
  }

  // For all other structural issues, emit a warning rather than blocked.
  // The main process runs validateDestinationName (the authoritative policy)
  // during preflight, so the renderer avoids false positives by not blocking
  // early on checks it cannot fully replicate (e.g. full-path length on Windows).
  const advisoryReasons: string[] = [];
  const invalidChars = /[<>:"/\\|?*\u0000-\u001F]/;
  const reserved = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i;

  if (invalidChars.test(name)) {
    advisoryReasons.push('Destination name may be rejected: contains illegal characters (confirmed during preflight).');
  }
  if (reserved.test(name)) {
    advisoryReasons.push('Destination name may be rejected: uses a reserved Windows filename (confirmed during preflight).');
  }
  if (/[. ]$/.test(name)) {
    advisoryReasons.push('Destination name may be rejected: ends with a dot or space (confirmed during preflight).');
  }
  if (name.length > 255) {
    advisoryReasons.push('Destination name may be rejected: exceeds 255 characters (confirmed during preflight).');
  }

  return advisoryReasons.length > 0
    ? { safety: 'warning', reasons: advisoryReasons }
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
      const merged = applyEpisodeOverrideIfValid({ ...result, showName: effectiveShowName }, override?.episode);
      // Derive effectiveEpisode from the validated merged object so the UI
      // always reflects the episode number that will actually be used in the
      // rename (applyEpisodeOverrideIfValid silently ignores invalid overrides
      // such as 0 or NaN).
      const effectiveEpisode = merged.episode;
      const proposed = buildName(merged);
      const reasons = [...(result.warnings ?? [])];
      let safety: 'safe' | 'warning' | 'blocked' = result.ambiguous ? 'warning' : 'safe';
      if (result.ambiguous) {
        reasons.push('Ambiguous low-confidence parse; review before renaming.');
      }
      const nameValidation = validateProposedName(proposed);
      if (nameValidation.safety !== 'safe') {
        // 'blocked' (empty name) overrides any prior safety; 'warning' only
        // escalates — it won't downgrade an existing 'blocked' from elsewhere.
        if (nameValidation.safety === 'blocked' || safety === 'safe') {
          safety = nameValidation.safety;
        }
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