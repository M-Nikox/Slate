import { stripJunk } from './strip-junk.js';
import type { Confidence, ParseResult } from '../types.js';

const LOWERCASE_WORDS = new Set([
  'a', 'an', 'the', 'and', 'but', 'or', 'nor', 'for', 'so', 'yet',
  'at', 'by', 'in', 'of', 'on', 'to', 'up', 'as', 'is', 'it',
]);

interface EpisodePattern {
  regex: RegExp;
  hasSeasonGroup: boolean;   // false = no season captured, defaultSeason is used
  defaultSeason?: number;
  confidence: Confidence;
}

const EPISODE_PATTERNS: EpisodePattern[] = [
  // S01E001E002 — double episode, long format
  { regex: /[Ss](\d{1,2})[Ee](\d{1,3})(?!\d)[Ee](\d{1,3})(?!\d)/, hasSeasonGroup: true, confidence: 'high' },
  // S01E001 — standard, long format
  { regex: /[Ss](\d{1,2})[Ee](\d{1,3})(?!\d)/, hasSeasonGroup: true, confidence: 'high' },
  // 1x001 — alternate, long format
  { regex: /(\d{1,2})x(\d{1,3})(?!\d)/i, hasSeasonGroup: true, confidence: 'high' },
  // Season 1 Episode 1 — verbose
  { regex: /[Ss]eason\s*(\d{1,2})\s*[Ee]pisode\s*(\d{1,3})(?!\d)/i, hasSeasonGroup: true, confidence: 'high' },
  // "Episode 7" / "Ep 7" — no season, defaults to 1
  { regex: /\b[Ee]p(?:isode)?\s*(\d{1,3})\b/i, hasSeasonGroup: false, defaultSeason: 1, confidence: 'high' },
  // Anime style: "Show Name - 07", "Show Name – 07", or "Show Name — 07" — no season, defaults to 1
  // Matches a hyphen/en dash/em dash before a 2–3 digit episode number, optionally followed by "v2"
  { regex: /[-–—]\s*(\d{2,3})(?:v\d+)?(?=\s*(?:\[|\(|$))/, hasSeasonGroup: false, defaultSeason: 1, confidence: 'low' },
  // NNN compact format: first digit = season, last two = episode (e.g. 307 → S03E07)
  // Allows dot/underscore separators, blocks alphanumeric suffixes (e.g. 1080p)
  { regex: /(?<!\d)([1-9])(\d{2})(?![\dA-Za-z])/, hasSeasonGroup: true, confidence: 'low' },
];

function getExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) return '';
  return filename.slice(lastDot).toLowerCase();
}

function titleCase(raw: string): string {
  const spaced = raw.replace(/[._]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!spaced) return spaced;
  return spaced
    .split(' ')
    .map((word, index) => {
      const lower = word.toLowerCase();
      if (index === 0 || !LOWERCASE_WORDS.has(lower)) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
      return lower;
    })
    .join(' ');
}

function cleanShowName(raw: string): string {
  const trimmed = raw.replace(/[-–—\s._]+$/, '').trim();
  return titleCase(trimmed);
}

export function parseFilename(filename: string): ParseResult | null {
  const ext = getExtension(filename);
  const base = filename.slice(0, filename.length - ext.length);

  for (const pattern of EPISODE_PATTERNS) {
    const match = base.match(pattern.regex);
    if (!match || match.index === undefined) continue;

    const rawShowName = base.slice(0, match.index);
    const stripped = stripJunk(rawShowName);
    const showName = cleanShowName(stripped);

    if (!showName) continue;

    let season: number;
    let episode: number;
    let episodeEnd: number | undefined;

    if (pattern.hasSeasonGroup) {
      season = parseInt(match[1], 10);
      episode = parseInt(match[2], 10);
      episodeEnd = match[3] !== undefined ? parseInt(match[3], 10) : undefined;

      // Non-consecutive multi-episode (e.g. S01E01E03) — don't treat as a range.
      // Fall through to the S01E01 pattern below, which will parse just the first episode.
      if (episodeEnd !== undefined && episodeEnd !== episode + 1) {
        continue;
      }
    } else {
      // Anime style — no season group, episode is capture group 1
      season = pattern.defaultSeason ?? 1;
      episode = parseInt(match[1], 10);
      episodeEnd = undefined;
    }

    return { showName, season, episode, episodeEnd, extension: ext, confidence: pattern.confidence };
  }

  return null;
}
