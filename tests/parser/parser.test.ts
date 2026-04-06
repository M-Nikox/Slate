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

  it('returns null for non-consecutive double episode pattern', () => {
    expect(parseFilename('Arcane.S01E01E03.mkv')).toBeNull();
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
