import { describe, it, expect } from 'vitest';
import { parseFilename } from '../../src/shared/parser/parse-filename.js';
import { buildName } from '../../src/shared/parser/build-name.js';

// ---------------------------------------------------------------------------
// parseFilename
// ---------------------------------------------------------------------------

describe('parseFilename — standard S01E01 format', () => {
  it('parses a clean S01E01 filename', () => {
    const r = parseFilename('Breaking.Bad.S03E07.mkv');
    expect(r).not.toBeNull();
    expect(r!.showName).toBe('Breaking Bad');
    expect(r!.season).toBe(3);
    expect(r!.episode).toBe(7);
    expect(r!.extension).toBe('.mkv');
  });

  it('parses lowercase s01e01', () => {
    const r = parseFilename('the.office.s02e14.mp4');
    expect(r!.showName).toBe('The Office');
    expect(r!.season).toBe(2);
    expect(r!.episode).toBe(14);
  });

  it('strips quality tags', () => {
    const r = parseFilename('Breaking.Bad.S03E07.1080p.BluRay.x264.mkv');
    expect(r!.showName).toBe('Breaking Bad');
    expect(r!.season).toBe(3);
    expect(r!.episode).toBe(7);
  });

  it('strips release group brackets', () => {
    const r = parseFilename("JoJo's Bizarre Adventure RERELEASE [Kaos] - S01E01 - Episode First.mkv");
    expect(r!.showName).toBe("JoJo's Bizarre Adventure");
    expect(r!.season).toBe(1);
    expect(r!.episode).toBe(1);
  });

  it('strips streaming tags', () => {
    const r = parseFilename('Succession.S04E01.NF.WEB-DL.1080p.mkv');
    expect(r!.showName).toBe('Succession');
  });

  it('strips audio tags', () => {
    const r = parseFilename('Chernobyl.S01E02.DTS.FLAC.mkv');
    expect(r!.showName).toBe('Chernobyl');
  });

  it('strips HDR tags', () => {
    const r = parseFilename('The.Bear.HDR10.S01E01.mkv');
    expect(r!.showName).toBe('The Bear');
  });

  it('strips Dolby Vision tag', () => {
    const r = parseFilename('Succession.DV.S04E01.mkv');
    expect(r!.showName).toBe('Succession');
  });

  it('strips curly brace tags', () => {
    const r = parseFilename('Dark{HQ}.S01E01.mkv');
    expect(r!.showName).toBe('Dark');
  });

  it('handles underscores as separators', () => {
    const r = parseFilename('dark_S02E06_720p.mkv');
    expect(r!.showName).toBe('Dark');
  });

  it('handles mixed separators', () => {
    const r = parseFilename('The.Wire_S03E10.mkv');
    expect(r!.showName).toBe('The Wire');
  });
});

describe('parseFilename — double episode format', () => {
  it('parses S01E01E02', () => {
    const r = parseFilename('Arcane.S01E01E02.mkv');
    expect(r!.season).toBe(1);
    expect(r!.episode).toBe(1);
    expect(r!.episodeEnd).toBe(2);
  });

  it('parses double episode with junk', () => {
    const r = parseFilename('Attack.on.Titan.S04E28E29.1080p.WEB-DL.mkv');
    expect(r!.showName).toBe('Attack on Titan');
    expect(r!.episodeEnd).toBe(29);
  });

  it('falls back to first episode for non-consecutive double episode pattern', () => {
    const r = parseFilename('Arcane.S01E01E03.mkv');
    expect(r).not.toBeNull();
    expect(r!.season).toBe(1);
    expect(r!.episode).toBe(1);
    expect(r!.episodeEnd).toBeUndefined();
  });
});

describe('parseFilename — alternate formats', () => {
  it('parses 1x01 format', () => {
    const r = parseFilename('Firefly.1x01.mkv');
    expect(r!.showName).toBe('Firefly');
    expect(r!.season).toBe(1);
    expect(r!.episode).toBe(1);
  });

  it('parses 3x05 format', () => {
    const r = parseFilename('Seinfeld.3x05.avi');
    expect(r!.season).toBe(3);
    expect(r!.episode).toBe(5);
  });

  it('parses verbose Season 1 Episode 1', () => {
    const r = parseFilename('Fargo Season 2 Episode 5.mkv');
    expect(r!.showName).toBe('Fargo');
    expect(r!.season).toBe(2);
    expect(r!.episode).toBe(5);
  });

  it('parses Episode X without season (defaults to season 1)', () => {
    const r = parseFilename('Cowboy Bebop Episode 06.mkv');
    expect(r!.showName).toBe('Cowboy Bebop');
    expect(r!.season).toBe(1);
    expect(r!.episode).toBe(6);
  });

  it('parses Ep X shorthand (defaults to season 1)', () => {
    const r = parseFilename('Samurai Champloo Ep 19.mkv');
    expect(r!.showName).toBe('Samurai Champloo');
    expect(r!.season).toBe(1);
    expect(r!.episode).toBe(19);
  });

  it('parses EP X uppercase (defaults to season 1)', () => {
    const r = parseFilename('Samurai Champloo EP 19.mkv');
    expect(r!.showName).toBe('Samurai Champloo');
    expect(r!.season).toBe(1);
    expect(r!.episode).toBe(19);
  });

  it('parses EPISODE X uppercase (defaults to season 1)', () => {
    const r = parseFilename('Cowboy Bebop EPISODE 06.mkv');
    expect(r!.showName).toBe('Cowboy Bebop');
    expect(r!.season).toBe(1);
    expect(r!.episode).toBe(6);
  });
});

describe('parseFilename — extensions', () => {
  it('preserves .mkv', () => expect(parseFilename('Show.S01E01.mkv')!.extension).toBe('.mkv'));
  it('preserves .mp4', () => expect(parseFilename('Show.S01E01.mp4')!.extension).toBe('.mp4'));
  it('preserves .avi', () => expect(parseFilename('Show.S01E01.avi')!.extension).toBe('.avi'));
  it('normalises extension to lowercase', () => {
    expect(parseFilename('Show.S01E01.MKV')!.extension).toBe('.mkv');
  });
});

describe('parseFilename — title casing', () => {
  it('title-cases show name', () => {
    expect(parseFilename('breaking bad S01E01.mkv')!.showName).toBe('Breaking Bad');
  });

  it('keeps minor words lowercase after first word', () => {
    expect(parseFilename('Game.of.Thrones.S01E01.mkv')!.showName).toBe('Game of Thrones');
  });

  it('capitalises first word even if minor', () => {
    expect(parseFilename('the.office.S02E01.mkv')!.showName).toBe('The Office');
  });
});

describe('parseFilename — unrecognised input', () => {
  it('returns null for a filename with no episode pattern', () => {
    expect(parseFilename('some-random-movie-file.mkv')).toBeNull();
  });

  it('returns null for a bare filename', () => {
    expect(parseFilename('video.mkv')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// buildName
// ---------------------------------------------------------------------------

describe('buildName', () => {
  it('builds a standard name', () => {
    const r = parseFilename('Breaking.Bad.S03E07.mkv')!;
    expect(buildName(r)).toBe('Breaking Bad - S03E07.mkv');
  });

  it('builds a double-episode name', () => {
    const r = parseFilename('Arcane.S01E01E02.mkv')!;
    expect(buildName(r)).toBe('Arcane - S01E01-E02.mkv');
  });

  it('pads single-digit season and episode', () => {
    const r = parseFilename('Firefly.1x01.mkv')!;
    expect(buildName(r)).toBe('Firefly - S01E01.mkv');
  });

  it('respects overrideName', () => {
    const r = parseFilename('breaking.bad.S01E01.mkv')!;
    expect(buildName(r, 'Breaking Bad (2008)')).toBe('Breaking Bad (2008) - S01E01.mkv');
  });

  it('trims whitespace from overrideName', () => {
    const r = parseFilename('Show.S01E01.mkv')!;
    expect(buildName(r, '  My Show  ')).toBe('My Show - S01E01.mkv');
  });
});

describe('parseFilename — anime bracket format', () => {
  it('parses anime-style [Group] Show - 07 [tags]', () => {
    const r = parseFilename('[Erai-raws] Uma Musume Cinderella Gray Part 2 - 07 [1080p AMZN WEBRip HEVC EAC3][MultiSub][D1376F31].mp4');
    expect(r).not.toBeNull();
    expect(r!.showName).toBe('Uma Musume Cinderella Gray Part 2');
    expect(r!.season).toBe(1);
    expect(r!.episode).toBe(7);
    expect(r!.extension).toBe('.mp4');
  });

  it('builds correct name for anime format', () => {
    const r = parseFilename('[SubsPlease] Frieren - 28 [1080p].mkv');
    expect(r).not.toBeNull();
    expect(buildName(r!)).toBe('Frieren - S01E28.mkv');
  });

  it('handles anime episode with version tag v2', () => {
    const r = parseFilename('[Group] My Show - 03v2 [720p].mkv');
    expect(r!.episode).toBe(3);
    expect(r!.showName).toBe('My Show');
  });
});

// ---------------------------------------------------------------------------
// confidence
// ---------------------------------------------------------------------------

describe('parseFilename — confidence', () => {
  it('S01E01 is high confidence', () => {
    expect(parseFilename('Breaking.Bad.S03E07.mkv')!.confidence).toBe('high');
  });

  it('S01E01E02 double episode is high confidence', () => {
    expect(parseFilename('Arcane.S01E01E02.mkv')!.confidence).toBe('high');
  });

  it('1x01 is high confidence', () => {
    expect(parseFilename('Firefly.1x01.mkv')!.confidence).toBe('high');
  });

  it('Season X Episode Y is high confidence', () => {
    expect(parseFilename('Fargo Season 2 Episode 5.mkv')!.confidence).toBe('high');
  });

  it('Episode X is high confidence', () => {
    expect(parseFilename('Cowboy Bebop Episode 06.mkv')!.confidence).toBe('high');
  });

  it('anime dash style is low confidence', () => {
    expect(parseFilename('[SubsPlease] Frieren - 28 [1080p].mkv')!.confidence).toBe('low');
  });

  it('anime dash style without group tag is low confidence', () => {
    expect(parseFilename('My Show - 07.mkv')!.confidence).toBe('low');
  });

  it('NNN compact format is low confidence', () => {
    expect(parseFilename('One Piece 307.mkv')!.confidence).toBe('low');
  });
});

// ---------------------------------------------------------------------------
// long episode numbers
// ---------------------------------------------------------------------------

describe('parseFilename — long episode numbers', () => {
  it('parses S01E198 three-digit episode', () => {
    const r = parseFilename('One.Piece.S01E198.mkv');
    expect(r!.season).toBe(1);
    expect(r!.episode).toBe(198);
    expect(r!.confidence).toBe('high');
  });

  it('parses 1x198 three-digit episode', () => {
    const r = parseFilename('One.Piece.1x198.mkv');
    expect(r!.season).toBe(1);
    expect(r!.episode).toBe(198);
  });

  it('parses verbose Season 20 Episode 198', () => {
    const r = parseFilename('One Piece Season 20 Episode 198.mkv');
    expect(r!.season).toBe(20);
    expect(r!.episode).toBe(198);
  });

  it('parses double episode S01E197E198', () => {
    const r = parseFilename('One.Piece.S01E197E198.mkv');
    expect(r!.episode).toBe(197);
    expect(r!.episodeEnd).toBe(198);
  });
});

// ---------------------------------------------------------------------------
// NNN compact format
// ---------------------------------------------------------------------------

describe('parseFilename — NNN compact format', () => {
  it('parses 307 as S03E07', () => {
    const r = parseFilename('One Piece 307.mkv');
    expect(r!.season).toBe(3);
    expect(r!.episode).toBe(7);
    expect(r!.confidence).toBe('low');
  });

  it('parses dot-separated NNN format', () => {
    const r = parseFilename('One.Piece.307.mkv');
    expect(r!.season).toBe(3);
    expect(r!.episode).toBe(7);
  });

  it('parses 114 as S01E14', () => {
    const r = parseFilename('Breaking Bad 114.mkv');
    expect(r!.season).toBe(1);
    expect(r!.episode).toBe(14);
  });

  it('does not match when surrounded by other digits', () => {
    expect(parseFilename('Show.1080p.mkv')).toBeNull();
  });

  it('does not parse NNN as episode when part of resolution tag', () => {
    expect(parseFilename('Show.S01E1080p.mkv')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// buildName — episode padding
// ---------------------------------------------------------------------------

describe('buildName — episode padding', () => {
  it('pads 2-digit episodes with leading zero', () => {
    const r = parseFilename('One.Piece.S01E07.mkv')!;
    expect(buildName(r)).toBe('One Piece - S01E07.mkv');
  });

  it('uses 3-digit padding for episodes above 99', () => {
    const r = parseFilename('One.Piece.S01E198.mkv')!;
    expect(buildName(r)).toBe('One Piece - S01E198.mkv');
  });
});
