import { useMemo } from 'react';
import { parseFilename } from '../../shared/parser/parse-filename.js';
import { applyTemplate, DEFAULT_TEMPLATE } from '../../shared/parser/build-name.js';
import { padSeason, padEpisode } from '../../shared/parser/pad.js';
import type { Confidence, ManualModeConfig, ParseResult, RowOverride, ScannedFile } from '../../shared/types.js';

export interface PreviewRow {
  file: ScannedFile;
  proposedName: string | null;
  parsed: boolean;
  confidence: Confidence | null;
  overridden: boolean;
  parsedResult: ParseResult | null;
  effectiveShowName: string | null;
  effectiveEpisode: number | null;
  safety: 'safe' | 'warning' | 'blocked';
  reasons: string[];
}

function parserWarningMessage(code: string): string {
  if (code === 'ambiguous-low-confidence-parse') return 'Ambiguous low-confidence parse; review before renaming.';
  if (code === 'trailing-episode-marker') return 'Additional episode marker detected after parsed match; verify multi-episode formatting.';
  return code;
}

function validateProposedName(name: string): { safety: 'safe' | 'warning' | 'blocked'; reasons: string[] } {
  const trimmedName = name.trim();
  if (!trimmedName) {
    return { safety: 'blocked', reasons: ['Destination name is empty.'] };
  }

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
    return { ...result, episode: overrideEpisode, episodeEnd: overrideEpisode + span };
  }
  return { ...result, episode: overrideEpisode, episodeEnd: undefined };
}

export function usePreviews(
  files: ScannedFile[],
  overrideName: string,
  manualMode: boolean,
  manualConfig: ManualModeConfig | null,
  rowOverrides: Map<string, RowOverride>,
  template: string,
): PreviewRow[] {
  return useMemo(() => {
    const activeTemplate = template.trim() || DEFAULT_TEMPLATE;

    if (manualMode) {
      const showName = manualConfig?.showName.trim();
      if (!manualConfig || !showName) {
        return files.map(file => ({
          file, proposedName: null, parsed: false, confidence: null,
          overridden: false, parsedResult: null, effectiveShowName: null, effectiveEpisode: null,
          safety: 'blocked' as const, reasons: ['Manual mode requires a show name.'],
        }));
      }
      return files.map((file, index) => {
        const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
        const epNum = manualConfig.startEpisode + index;
        // Construct a minimal ParseResult so the template applies in manual mode too
        const fakeResult: ParseResult = {
          showName, season: manualConfig.season, episode: epNum,
          extension: ext, confidence: 'high',
        };
        const proposedName = applyTemplate(fakeResult, activeTemplate, file.name);
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
          safety: 'blocked' as const, reasons: ['Could not parse filename.'],
        };
      }
      const override = rowOverrides.get(file.path);
      const effectiveShowName = override?.showName ?? (overrideName.trim() || result.showName);
      const merged = applyEpisodeOverrideIfValid({ ...result, showName: effectiveShowName }, override?.episode);
      const effectiveEpisode = merged.episode;
      const proposed = applyTemplate(merged, activeTemplate, file.name);
      const reasons = (result.warnings ?? []).map(parserWarningMessage);
      let safety: 'safe' | 'warning' | 'blocked' = result.ambiguous ? 'warning' : 'safe';
      const nameValidation = validateProposedName(proposed);
      if (nameValidation.safety !== 'safe') {
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
  }, [files, overrideName, manualMode, manualConfig, rowOverrides, template]);
}
