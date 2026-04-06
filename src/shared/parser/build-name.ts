import type { ParseResult } from '../types.js';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function buildName(result: ParseResult, overrideName?: string): string {
  const show = overrideName?.trim() || result.showName;
  const s = pad(result.season);
  const e = pad(result.episode);

  const episodePart =
    result.episodeEnd !== undefined
      ? `S${s}E${e}-E${pad(result.episodeEnd)}`
      : `S${s}E${e}`;

  return `${show} - ${episodePart}${result.extension}`;
}
