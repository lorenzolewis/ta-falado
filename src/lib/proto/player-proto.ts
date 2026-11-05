// PROTOTYPE (#59), never merged. Drives the chosen mini-player, variant A ("bar and sheet"), in
// src/components/proto/PlayerProto.astro: its visual state, the progress line, the artwork and
// the phone's sheet. The real bindings stay in src/lib/player-ui.ts.
//
// `?state=idle|loading|playing|paused|error` on any page forces a state, so each one can be seen
// (and screenshotted) without waiting for it to happen.
import { formatDuration } from '../format';
import { player, type PlayerState } from '../player';
import { allTracks } from '../tracks';

const STATES = ['idle', 'loading', 'playing', 'paused', 'error'] as const;
type State = (typeof STATES)[number];

const wrap = document.querySelector<HTMLElement>('[data-player-wrap]')!;
const sheet = wrap.querySelector<HTMLDialogElement>('[data-proto-sheet]')!;

const time = (seconds: number) => formatDuration(Math.floor(seconds));

function forced(): State | null {
  const value = new URLSearchParams(location.search).get('state');
  return (STATES as readonly string[]).includes(value ?? '') ? (value as State) : null;
}

/** The player's state, as the design draws it. Loading: asked to play, but not enough data yet. */
function stateOf(state: PlayerState): State {
  if (!state.track) return 'idle';
  if (state.error) return 'error';
  if (!state.paused && player.audio.readyState < 3) return 'loading';
  return state.paused ? 'paused' : 'playing';
}

function render() {
  const state = player.state;
  const force = forced();
  const shown = force ?? stateOf(state);
  wrap.dataset.state = shown;

  // A forced state with nothing loaded shows the first lesson, 35% of the way in.
  const track = state.track ?? (force && force !== 'idle' ? allTracks()[0] : null);
  const duration = state.track ? state.duration : (track?.durationSeconds ?? 0);
  const current = state.track ? state.currentTime : duration * 0.35;
  wrap.style.setProperty('--p', String(duration ? current / duration : 0));

  const root = wrap.querySelector<HTMLElement>('[data-player]')!;
  root.hidden = !track;
  for (const el of wrap.querySelectorAll('[data-proto-title]')) el.textContent = track?.title ?? '';
  for (const el of wrap.querySelectorAll('[data-proto-series]')) el.textContent = track?.series ?? '';
  for (const el of wrap.querySelectorAll('[data-proto-left]')) {
    el.textContent = track ? `${time(Math.max(duration - current, 0))} left` : '';
  }
  // A CSS background, not an <img>: Astro's dev-toolbar audit re-fetches every <img> on each DOM
  // change, and the player changes the DOM several times a second. Set only when the track changes.
  const art = track ? `url("${track.artwork}")` : '';
  if (wrap.style.getPropertyValue('--art') !== art) wrap.style.setProperty('--art', art);

  if (!state.track && track) {
    // The real bindings skip updates with no track, so fill what they would have.
    for (const a of wrap.querySelectorAll<HTMLAnchorElement>('[data-title]')) {
      a.textContent = track.title;
      a.href = track.id;
    }
    for (const el of wrap.querySelectorAll('[data-current]')) el.textContent = time(current);
    for (const el of wrap.querySelectorAll('[data-duration]')) el.textContent = time(duration);
    for (const seek of wrap.querySelectorAll<HTMLInputElement>('[data-seek]')) {
      seek.max = String(Math.floor(duration));
      seek.value = String(Math.floor(current));
    }
  }
  if (force) {
    for (const el of wrap.querySelectorAll('[data-status]')) {
      el.textContent = force === 'error' ? 'The audio could not be loaded.' : '';
    }
    for (const toggle of wrap.querySelectorAll('[data-action="toggle"]')) {
      toggle.setAttribute('aria-label', force === 'playing' || force === 'loading' ? 'Pause' : 'Play');
    }
  }
  // The seek track's ipê fill.
  for (const seek of wrap.querySelectorAll<HTMLInputElement>('[data-seek]')) {
    const max = Number(seek.max);
    seek.style.setProperty('--seek', `${max ? (Number(seek.value) / max) * 100 : 0}%`);
  }
}

// After the real bindings (player-ui.ts subscribes first).
player.subscribe(() => queueMicrotask(render));
for (const type of ['waiting', 'canplay', 'playing', 'loadstart', 'stalled']) {
  player.audio.addEventListener(type, render);
}

// The phone's sheet: opened from the bar; closed by its button, Escape, the backdrop or navigating.
const closeSheet = () => sheet.open && sheet.close();
wrap.addEventListener('click', (event) => {
  const action = (event.target as Element).closest<HTMLElement>('[data-proto]')?.dataset.proto;
  if (action === 'open-sheet') sheet.showModal();
  else if (action === 'close-sheet' || event.target === sheet) closeSheet();
});
// The sheet is phone-only: close it if the window grows past the breakpoint.
matchMedia('(min-width: 52rem)').addEventListener('change', (event) => event.matches && closeSheet());
document.addEventListener('astro:before-swap', closeSheet);
document.addEventListener('astro:page-load', render);
