import type { ParseResult } from '../types.js';
import { padSeason, padEpisode } from './pad.js';

export const DEFAULT_TEMPLATE = '{Show} - S{SeasonZ}E{EpisodeZ}';

export const TEMPLATE_TOKENS = [
  { token: '{Show}',         description: 'Show name' },
  { token: '{Season}',       description: 'Season number (1, 2…)' },
  { token: '{SeasonZ}',      description: 'Season, 2-digit padded (01, 02…)' },
  { token: '{Episode}',      description: 'Episode number (1, 2…)' },
  { token: '{EpisodeZ}',     description: 'Episode, padded (01, 02… 198). Expands to a range for double episodes.' },
  { token: '{EpisodeTitle}', description: 'Episode title (if provided)' },
  { token: '{OriginalName}', description: 'Original filename without extension' },
] as const;

export type TemplateToken = typeof TEMPLATE_TOKENS[number]['token'];

export function applyTemplate(
  result: ParseResult,
  template: string,
  originalName?: string,
  episodeTitle?: string,
): string {
  const originalBase = originalName
    ? originalName.slice(0, originalName.lastIndexOf('.')) || originalName
    : '';

  // {EpisodeZ} expands to a range when episodeEnd is present: "01-E02"
  const episodeZValue = result.episodeEnd !== undefined
    ? `${padEpisode(result.episode)}-E${padEpisode(result.episodeEnd)}`
    : padEpisode(result.episode);

  const output = template
    .replace(/\{Show\}/g,           result.showName)
    .replace(/\{Season\}/g,         String(result.season))
    .replace(/\{SeasonZ\}/g,        padSeason(result.season))
    .replace(/\{Episode\}/g,        String(result.episode))
    .replace(/\{EpisodeZ\}/g,       episodeZValue)
    .replace(/\{EpisodeTitle\}/g,   episodeTitle?.trim() ?? '')
    .replace(/\{OriginalName\}/g,   originalBase);

  return `${output}${result.extension}`;
}

// Convenience wrapper using the default template.
// Accepts an optional overrideName for backwards-compatible call sites
// that haven't yet moved show-name resolution upstream into usePreviews.
export function buildName(result: ParseResult, overrideName?: string): string {
  const effective = overrideName?.trim()
    ? { ...result, showName: overrideName.trim() }
    : result;
  return applyTemplate(effective, DEFAULT_TEMPLATE);
}
