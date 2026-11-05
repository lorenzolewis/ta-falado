// PROTOTYPE (#55): wires a variant's play control to the persistent player and this device's progress.
// Sets on [data-proto-lesson]: data-state = fresh | started | finished | playing | paused | loading,
// --done (0–100) and fills [data-proto-left] ("6 min left") and [data-proto-label] (Play / Resume / Pause).
import { player, type Track } from '../../lib/player';
import { progress, timeLeft } from '../../lib/progress';

let page: AbortController | undefined;

document.addEventListener('astro:page-load', () => {
  page?.abort();
  const root = document.querySelector<HTMLElement>('[data-proto-lesson]');
  if (!root) return;
  page = new AbortController();
  const { signal } = page;
  const track: Track = JSON.parse(root.dataset.protoLesson!);

  for (const button of root.querySelectorAll('[data-proto-play]')) {
    button.addEventListener(
      'click',
      () => (player.state.track?.id === track.id ? player.toggle() : player.play(track)),
      { signal },
    );
  }

  const update = () => {
    const s = player.state;
    const mine = s.track?.id === track.id;
    const saved = progress.get(track.id);
    const position = mine ? s.currentTime : (saved?.position ?? 0);
    const duration = mine && s.duration ? s.duration : track.durationSeconds;
    const state = mine
      ? s.paused
        ? 'paused'
        : s.ready
          ? 'playing'
          : 'loading'
      : saved?.finished && !saved.position
        ? 'finished'
        : position > 0
          ? 'started'
          : 'fresh';
    root.dataset.state = state;
    const { percent, label } = timeLeft(position, duration);
    root.style.setProperty('--done', String(state === 'finished' ? 100 : percent));
    const label2 =
      state === 'playing' || state === 'loading' ? 'Pause' : state === 'started' || state === 'paused' ? 'Resume' : state === 'finished' ? 'Play again' : 'Play';
    for (const el of root.querySelectorAll('[data-proto-label]')) el.textContent = label2;
    for (const el of root.querySelectorAll('[data-proto-left]'))
      el.textContent = state === 'fresh' ? '' : state === 'finished' ? 'Finished' : label;
  };
  player.subscribe(update, { signal });
  progress.subscribe(update, { signal });
});
