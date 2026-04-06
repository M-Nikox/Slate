// Ordered list of patterns to strip from filenames before parsing.
// Order matters — brackets first, then specific tags, then separators.

const JUNK_PATTERNS: RegExp[] = [
  // Release groups and bracketed tags: [YIFY], [SubsPlease], (GROUP), etc.
  /[\[(][^\]/)]+[\])]/g,

  // Quality
  /\b(2160p|1080p|720p|480p|4K|UHD|SD)\b/gi,

  // Codecs
  /\b(x264|x265|h264|h265|HEVC|AVC|xvid|divx|av1)\b/gi,

  // Source
  /\b(BluRay|BDRip|BRRip|WEB-?DL|WEBRip|HDTV|DVDRip|DVDSCR|CAM|REMUX)\b/gi,

  // Streaming service tags
  /\b(NF|AMZN|DSNP|HMAX|ATVP|PCOK|CRKL|HBO|SHO)\b/g,

  // Release type
  /\b(RERELEASE|REPACK|PROPER|EXTENDED|THEATRICAL|UNRATED|RETAIL|DUBBED|SUBBED|MULTI)\b/gi,

  // Audio
  /\b(AAC|AC3|DTS|FLAC|TrueHD|Atmos|DD5\.1|DDP5\.1|MP3|EAC3|5\.1|7\.1)\b/gi,

  // Leftover dashes/underscores used as word separators (NOT between words — handled in cleanShowName)
  /_/g,
];

export function stripJunk(filename: string): string {
  let result = filename;
  for (const pattern of JUNK_PATTERNS) {
    result = result.replace(pattern, ' ');
  }
  // Collapse multiple spaces
  return result.replace(/\s{2,}/g, ' ').trim();
}