import type { Series } from './series';

// Where the podcast artwork lives. The feed links these paths now; #17 generates the files at
// build time. Keep the paths stable: apps cache artwork by URL.

/** The podcast cover (3000×3000, RGB, no transparency). */
export const PODCAST_COVER_PATH = '/artwork/cover.jpg';

/** One cover per episode: `/artwork/pronunciation-01.jpg`. */
export function episodeCoverPath({ series, number }: { series: Series; number: number }): string {
  return `/artwork/${series}-${String(number).padStart(2, '0')}.jpg`;
}
