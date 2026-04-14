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

const HIGH_CONFIDENCE_PATTERNS: EpisodePattern[] = [
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
  // "E7" / "E198" — no season, defaults to 1 unless a standalone season token exists
  { regex: /\b[Ee](\d{1,3})\b/, hasSeasonGroup: false, defaultSeason: 1, confidence: 'high' },
];

const LOW_CONFIDENCE_PATTERNS: EpisodePattern[] = [
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

function normalizeFilenameText(filename: string): string {
  return filename
    .normalize('NFC')
    .replace(/[\u00A0\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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

function extractTrailingSeason(raw: string): { season: number; remaining: string } | null {
  const match = raw.match(/(?:^|[\s._-])[Ss](?:eason)?\s*(\d{1,2})[\s._-]*$/i);
  if (!match || match.index === undefined) return null;
  const season = parseInt(match[1], 10);
  if (!Number.isFinite(season) || season <= 0) return null;
  return { season, remaining: raw.slice(0, match.index) };
}

function parseWithPattern(base: string, ext: string, pattern: EpisodePattern): ParseResult | null {
  const match = base.match(pattern.regex);
  if (!match || match.index === undefined) return null;

  const rawShowName = base.slice(0, match.index);
  let showNameSource = rawShowName;

  let season: number;
  let episode: number;
  let episodeEnd: number | undefined;

  if (pattern.hasSeasonGroup) {
    season = parseInt(match[1], 10);
    episode = parseInt(match[2], 10);
    episodeEnd = match[3] !== undefined ? parseInt(match[3], 10) : undefined;

    // Non-consecutive multi-episode (e.g. S01E01E03) — do not parse as range.
    if (episodeEnd !== undefined && episodeEnd !== episode + 1) {
      return null;
    }
  } else {
    const hinted = extractTrailingSeason(rawShowName);
    if (hinted) {
      season = hinted.season;
      showNameSource = hinted.remaining;
    } else {
      season = pattern.defaultSeason ?? 1;
    }
    episode = parseInt(match[1], 10);
    episodeEnd = undefined;
  }

  if (!Number.isFinite(season) || !Number.isFinite(episode) || season <= 0 || episode <= 0) {
    return null;
  }
  if (episodeEnd !== undefined && (!Number.isFinite(episodeEnd) || episodeEnd <= episode)) {
    return null;
  }

  const stripped = stripJunk(showNameSource);
  const showName = cleanShowName(stripped);
  if (!showName) return null;

  return { showName, season, episode, episodeEnd, extension: ext, confidence: pattern.confidence };
}

function parseDistinctKey(result: ParseResult): string {
  return `${result.showName}\u0000${result.season}\u0000${result.episode}\u0000${result.episodeEnd ?? ''}`;
}

export function parseFilename(filename: string): ParseResult | null {
  const normalized = normalizeFilenameText(filename);
  const ext = getExtension(normalized);
  const base = normalized.slice(0, normalized.length - ext.length);

  // Stage 1: high-confidence patterns (strict precedence)
  for (const pattern of HIGH_CONFIDENCE_PATTERNS) {
    const parsed = parseWithPattern(base, ext, pattern);
    if (parsed) return parsed;
  }

  // Stage 2: low-confidence patterns with explicit ambiguity signaling
  const lowCandidates = LOW_CONFIDENCE_PATTERNS
    .map(pattern => parseWithPattern(base, ext, pattern))
    .filter((v): v is ParseResult => v !== null);

  if (lowCandidates.length === 0) return null;

  const distinct = new Map<string, ParseResult>();
  for (const candidate of lowCandidates) {
    distinct.set(parseDistinctKey(candidate), candidate);
  }

  const selected = lowCandidates[0];
  if (distinct.size > 1) {
    selected.ambiguous = true;
    selected.warnings = ['ambiguous-low-confidence-parse'];
  }
  return selected;
}
