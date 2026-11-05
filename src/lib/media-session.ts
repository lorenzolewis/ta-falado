// Lock-screen and notification controls through the Media Session API (#18). Bound once per
// visit by src/lib/player-ui.ts; it only listens to the player (src/lib/player.ts) and drives it.
import { EPISODE_COVER_SIZE } from './artwork';
import { JUMP_BACK, JUMP_FORWARD, type Player, type Track } from './player';

/** The parts of the player the Media Session needs, so tests can stand in for it. */
export type MediaSessionPlayer = Pick<Player, 'state' | 'play' | 'pause' | 'seek' | 'skip' | 'subscribe' | 'addEventListener'>;

/**
 * Shows the current lesson on the lock screen and wires its controls to `player`.
 * Previous and next move through `tracks` (every lesson, in episode order) and are hidden at the ends.
 */
export function bindMediaSession(session: MediaSession, player: MediaSessionPlayer, tracks: readonly Track[]): void {
  const handle = (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => {
    // Browsers throw for actions they don't support; the rest still work.
    try {
      session.setActionHandler(action, handler);
    } catch {}
  };

  handle('play', () => player.play());
  handle('pause', () => player.pause());
  handle('seekbackward', ({ seekOffset }) => player.skip(-(seekOffset ?? JUMP_BACK)));
  handle('seekforward', ({ seekOffset }) => player.skip(seekOffset ?? JUMP_FORWARD));
  handle('seekto', ({ seekTime }) => seekTime !== undefined && player.seek(seekTime));

  player.addEventListener('trackchange', () => {
    const track = player.state.track;
    if (!track) return;
    session.metadata = new MediaMetadata({
      title: track.title,
      artist: track.series,
      album: 'Tá Falado',
      artwork: [{ src: track.artwork, sizes: `${EPISODE_COVER_SIZE}x${EPISODE_COVER_SIZE}`, type: 'image/png' }],
    });
    const i = tracks.findIndex((t) => t.id === track.id);
    const previous = i > 0 ? tracks[i - 1] : undefined;
    const next = i !== -1 ? tracks[i + 1] : undefined;
    handle('previoustrack', previous ? () => player.play(previous) : null);
    handle('nexttrack', next ? () => player.play(next) : null);
  });

  player.subscribe(({ track, paused, currentTime, duration, rate }) => {
    if (!track) return;
    session.playbackState = paused ? 'paused' : 'playing';
    // setPositionState throws without a positive duration, or with a position past it.
    if (!(duration > 0) || !Number.isFinite(duration)) return;
    try {
      session.setPositionState({ duration, playbackRate: rate, position: Math.min(Math.max(currentTime, 0), duration) });
    } catch {}
  });
}
