import type { ParseResult } from '../types.js';
import { padSeason, padEpisode } from './pad.js';

export function buildName(result: ParseResult, overrideName?: string): string {
  const show = overrideName?.trim() || result.showName;
  const s = padSeason(result.season);
  const e = padEpisode(result.episode);

  const episodePart =
    result.episodeEnd !== undefined
      ? `S${s}E${e}-E${padEpisode(result.episodeEnd)}`
      : `S${s}E${e}`;

  return `${show} - ${episodePart}${result.extension}`;
}
