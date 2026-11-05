// PROTOTYPE (#59), never merged. Drives the three mini-player variants in
// src/components/proto/PlayerProto.astro: which one shows, its visual state, the progress
// fill, the expanded states, and the floating switcher. The real bindings stay in
// src/lib/player-ui.ts.
import { formatDuration } from '../format';
import { player, type PlayerState } from '../player';
import { allTracks } from '../tracks';

const VARIANTS = ['a', 'b', 'c'] as const;
type Variant = (typeof VARIANTS)[number];
const NAMES: Record<Variant, string> = { a: 'Bar and sheet', b: 'Full deck', c: 'Floating card' };
const SIMS = ['live', 'idle', 'loading', 'playing', 'paused', 'error'] as const;
type Sim = (typeof SIMS)[number];

const read = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {}
};

const wrap = document.querySelector<HTMLElement>('[data-player-wrap]')!;
let variant: Variant = (VARIANTS as readonly string[]).includes(read('proto-player') ?? '') ? (read('proto-player') as Variant) : 'a';
let sim: Sim = 'live';

const time = (seconds: number) => formatDuration(Math.floor(seconds));

/** idle · loading · playing · paused · error, from the real player or the switcher's override. */
function realState(state: PlayerState): Sim {
  if (!state.track) return 'idle';
  if (state.error) return 'error';
  if (!state.paused && player.audio.readyState < 3) return 'loading';
  return state.paused ? 'paused' : 'playing';
}

function render() {
  const state = player.state;
  const shown = sim === 'live' ? realState(state) : sim;
  wrap.dataset.variant = variant;
  wrap.dataset.state = shown;

  // With a forced state and nothing loaded, show the first lesson so the variant has content.
  const track = state.track ?? (sim !== 'live' && sim !== 'idle' ? allTracks()[0] : null);
  const duration = state.track ? state.duration : (track?.durationSeconds ?? 0);
  const current = state.track ? state.currentTime : duration * 0.35;
  wrap.style.setProperty('--p', String(duration ? current / duration : 0));

  for (const root of wrap.querySelectorAll<HTMLElement>('[data-player]')) {
    root.hidden = !track && root.dataset.idle !== 'show';
  }
  for (const el of wrap.querySelectorAll<HTMLElement>('[data-proto-title]')) el.textContent = track?.title ?? '';
  for (const el of wrap.querySelectorAll<HTMLElement>('[data-proto-series]')) el.textContent = track?.series ?? '';
  for (const el of wrap.querySelectorAll<HTMLElement>('[data-proto-left]')) {
    el.textContent = track ? `${time(Math.max(duration - current, 0))} left` : '';
  }
  // A CSS background, not an <img>: Astro's dev-toolbar audit re-fetches every <img> on each DOM
  // change, and the player changes the DOM several times a second, so the dev server re-rendered
  // the artwork endlessly. Set only when the track changes.
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
    for (const el of wrap.querySelectorAll('[data-status]')) {
      el.textContent = shown === 'error' ? 'The audio could not be loaded.' : '';
    }
  }
  if (sim === 'error' && state.track) {
    for (const el of wrap.querySelectorAll('[data-status]')) el.textContent = 'The audio could not be loaded.';
  }
  for (const seek of wrap.querySelectorAll<HTMLInputElement>('[data-seek]')) {
    seek.style.setProperty('--seek', `${duration ? (Number(seek.value) / Number(seek.max || 1)) * 100 : 0}%`);
  }
  for (const toggle of wrap.querySelectorAll<HTMLButtonElement>('[data-action="toggle"]')) {
    toggle.disabled = shown === 'idle';
    if (sim !== 'live') toggle.setAttribute('aria-label', shown === 'playing' || shown === 'loading' ? 'Pause' : 'Play');
  }

  const label = wrap.querySelector<HTMLElement>('[data-proto-label]')!;
  label.textContent = `${variant.toUpperCase()} · ${NAMES[variant]}`;
}

// Re-render after the real bindings have run (they subscribe first, from player-ui.ts).
player.subscribe(() => queueMicrotask(render));
for (const type of ['waiting', 'canplay', 'playing', 'loadstart', 'stalled']) {
  player.audio.addEventListener(type, render);
}

function setVariant(next: Variant) {
  variant = next;
  write('proto-player', next);
  closeSheet();
  render();
}

function cycle(step: 1 | -1) {
  const i = VARIANTS.indexOf(variant);
  setVariant(VARIANTS[(i + step + VARIANTS.length) % VARIANTS.length]);
}

// Variant A: the bar opens a sheet on the phone.
const sheet = wrap.querySelector<HTMLDialogElement>('[data-proto-sheet]')!;
function closeSheet() {
  if (sheet.open) sheet.close();
}
// Variant C: the card expands in place.
const card = wrap.querySelector<HTMLElement>('[data-proto-card]')!;

wrap.addEventListener('click', (event) => {
  const target = (event.target as Element).closest<HTMLElement>('[data-proto]');
  if (!target) {
    // A click on the sheet's backdrop lands on the dialog itself.
    if (event.target === sheet) closeSheet();
    return;
  }
  const action = target.dataset.proto;
  if (action === 'prev') cycle(-1);
  else if (action === 'next') cycle(1);
  else if (action === 'open-sheet') sheet.showModal();
  else if (action === 'close-sheet') closeSheet();
  else if (action === 'expand') {
    const open = card.dataset.expanded !== 'true';
    card.dataset.expanded = String(open);
    target.setAttribute('aria-expanded', String(open));
    target.setAttribute('aria-label', open ? 'Fewer controls' : 'More controls');
  }
});
wrap.querySelector<HTMLSelectElement>('[data-proto-sim]')!.addEventListener('change', (event) => {
  sim = (event.target as HTMLSelectElement).value as Sim;
  render();
});

// [ and ] cycle variants (the arrow keys already jump back and forward in the audio).
document.addEventListener('keydown', (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if ((event.target as Element).closest('input, textarea, select, [contenteditable]')) return;
  if (event.key === '[') cycle(-1);
  else if (event.key === ']') cycle(1);
});

document.addEventListener('astro:before-swap', closeSheet);
// /proto/player-a, -b and -c pick their variant on arrival.
document.addEventListener('astro:page-load', () => {
  const set = document.querySelector<HTMLElement>('[data-proto-set-variant]')?.dataset.protoSetVariant as Variant | undefined;
  if (set && set !== variant) setVariant(set);
  else render();
});
