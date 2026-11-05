// What the mini-player draws (#60), derived from the player's state (src/lib/player.ts). Pure, so
// src/lib/player-ui.ts only has to put the results on the page.
import { formatDuration } from './format';
import type { PlayerState } from './player';

/** idle: nothing loaded (the player is hidden). loading: asked to play, but not enough audio yet. */
export type PlayerStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

export function playerStatus(state: PlayerState): PlayerStatus {
  if (!state.track) return 'idle';
  if (state.error) return 'error';
  if (state.paused) return 'paused';
  return state.ready ? 'playing' : 'loading';
}

/** Under the title on the phone's bar: "7:37 left". */
export function timeLeft({ currentTime, duration }: PlayerState): string {
  return `${formatDuration(Math.floor(Math.max(duration - currentTime, 0)))} left`;
}

/** How far through the lesson, from 0 to 1 (0 while the duration is unknown): the bar's progress line. */
export function progress({ currentTime, duration }: PlayerState): number {
  return duration > 0 ? Math.min(Math.max(currentTime / duration, 0), 1) : 0;
}
