import type { Series } from './series';

// Where the generated artwork lives (#17). src/pages/artwork/ builds the files at these paths,
// and the feed and pages link them. Keep the paths stable: apps cache artwork by URL.
// Safe to import in the browser; the renderer is in ./artwork-render.

type LessonRef = { series: Series; number: number };

/** The podcast cover's file name, beside the episode covers (never a lesson's `series-NN`). */
export const PODCAST_COVER_SLUG = 'cover';
/** The podcast cover: 3000×3000, Apple's maximum. */
export const COVER_SIZE = 3000;

/** The podcast cover (3000×3000, RGB, no transparency). */
export const PODCAST_COVER_PATH = `/artwork/${PODCAST_COVER_SLUG}.png`;

/** Episode covers: 1400×1400, Apple's minimum, which keeps 46 of them quick to build. */
export const EPISODE_COVER_SIZE = 1400;

/** One cover per episode, for `itunes:image` and Media Session: `/artwork/pronunciation-01.png`. */
export function episodeCoverPath(lesson: LessonRef): string {
  return `/artwork/${artworkSlug(lesson)}.png`;
}

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

/** The Open Graph image of a lesson page (1200×630): `/artwork/og/pronunciation-01.png`. */
export function ogImagePath(lesson: LessonRef): string {
  return `/artwork/og/${artworkSlug(lesson)}.png`;
}

/** `pronunciation-01`: the file name both per-lesson images share. */
export function artworkSlug({ series, number }: LessonRef): string {
  return `${series}-${String(number).padStart(2, '0')}`;
}
