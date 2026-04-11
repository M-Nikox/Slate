export function padSeason(n: number): string {
  return String(n).padStart(2, '0');
}

export function padEpisode(n: number): string {
  // Use 3-digit padding for episodes above 99 (e.g. ep 123)
  return String(n).padStart(n > 99 ? 3 : 2, '0');
}
