// The embedded lesson list, shared by the player's browser modules.
import type { Track } from './player';

let tracks: Track[] | undefined;
/** Every lesson in episode order, embedded once in the persisted player (src/components/Player.astro). */
export function allTracks(): Track[] {
  tracks ??= JSON.parse(document.querySelector('[data-tracks]')?.textContent || '[]') as Track[];
  return tracks;
}
