import type { ParseResult } from '../types.js';

function padSeason(n: number): string {
  return String(n).padStart(2, '0');
}

function padEpisode(n: number): string {
  // Use 3-digit padding for episodes above 99 (e.g. One Piece ep 1000)
  return String(n).padStart(n > 99 ? 3 : 2, '0');
}

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
