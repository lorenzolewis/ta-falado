// Connects the page to the player state module (src/lib/player.ts). Imported once by
// src/components/Player.astro; under <ClientRouter /> it runs once per visit, so everything
// that touches a page's own elements happens in `astro:page-load`.
import { formatDuration } from './format';
import { bindMediaSession } from './media-session';
import { JUMP_BACK, JUMP_FORWARD, player, type Track } from './player';
import { allTracks } from './tracks';

const time = (seconds: number) => formatDuration(Math.floor(seconds));

const bound = new WeakSet<Element>();

/**
 * The mini-player is persisted across navigations, so it must be wired up only once: binding it
 * again on each page load would stack listeners and make every click act twice (or more).
 */
function bindMiniPlayer(root: HTMLElement) {
  if (bound.has(root)) return;
  bound.add(root);

  // PROTOTYPE (#59): a variant can repeat a control (variant A's bar and its sheet), so every
  // copy is bound and updated.
  const $$ = <T extends Element>(selector: string) => [...root.querySelectorAll<T>(selector)];
  const titles = $$<HTMLAnchorElement>('[data-title]');
  const toggles = $$<HTMLButtonElement>('[data-action="toggle"]');
  const mutes = $$<HTMLButtonElement>('[data-action="mute"]');
  const rates = $$<HTMLSelectElement>('[data-rate]');
  const seeks = $$<HTMLInputElement>('[data-seek]');
  const currents = $$<HTMLElement>('[data-current]');
  const durations = $$<HTMLElement>('[data-duration]');
  const statuses = $$<HTMLElement>('[data-status]');

  root.addEventListener('click', (event) => {
    const action = (event.target as Element).closest<HTMLElement>('[data-action]')?.dataset.action;
    if (action === 'toggle') player.toggle();
    else if (action === 'back') player.skip(-JUMP_BACK);
    else if (action === 'forward') player.skip(JUMP_FORWARD);
    else if (action === 'mute') player.toggleMute();
  });
  // The player is sticky at the bottom, so keep focused and scrolled-to content clear of it.
  // PROTOTYPE: the variants share one persisted wrapper, which is what takes up the space.
  const box = root.closest<HTMLElement>('[data-player-wrap]') ?? root;
  new ResizeObserver(() => {
    document.documentElement.style.setProperty('--player-block-size', `${box.offsetHeight}px`);
  }).observe(box);
  for (const rate of rates) rate.addEventListener('change', () => player.setRate(Number(rate.value)));
  for (const seek of seeks) seek.addEventListener('input', () => player.seek(Number(seek.value)));

  player.subscribe((state) => {
    if (!state.track) return;
    root.hidden = false;
    for (const title of titles) {
      title.textContent = state.track.title;
      title.href = state.track.id;
    }
    for (const toggle of toggles) toggle.setAttribute('aria-label', state.paused ? 'Play' : 'Pause');
    for (const mute of mutes) mute.setAttribute('aria-pressed', String(state.muted));
    for (const rate of rates) rate.value = String(state.rate);
    for (const seek of seeks) {
      seek.max = String(Math.floor(state.duration));
      seek.value = String(Math.floor(state.currentTime));
      seek.setAttribute('aria-valuetext', `${time(state.currentTime)} of ${time(state.duration)}`);
    }
    for (const el of currents) el.textContent = time(state.currentTime);
    for (const el of durations) el.textContent = time(state.duration);
    const message = state.error ? 'The audio could not be loaded.' : '';
    for (const status of statuses) if (status.textContent !== message) status.textContent = message;
  });
}

/** "Play lesson" buttons belong to a page, so they are wired on every page load and released on swap. */
function bindPlayButtons(signal: AbortSignal) {
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-play]')) {
    const track: Track = JSON.parse(button.dataset.play!);
    button.addEventListener(
      'click',
      () => {
        if (player.state.track?.id === track.id) player.toggle();
        else player.play(track);
      },
      { signal },
    );
    player.subscribe(
      ({ track: current, paused }) => {
        button.textContent = current?.id === track.id && !paused ? 'Pause lesson' : 'Play lesson';
      },
      { signal },
    );
  }
}

/** Shortcuts are skipped while typing, and keys a focused control handles itself are left to it. */
function onKeydown(event: KeyboardEvent) {
  if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
  if (!player.state.track) return;
  const target = event.target as HTMLElement;
  if (target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return;

  switch (event.key) {
    case ' ':
      // A focused button or link already acts on Space.
      if (target.closest('button, a, summary')) return;
      player.toggle();
      break;
    case 'ArrowLeft':
      player.skip(-JUMP_BACK);
      break;
    case 'ArrowRight':
      player.skip(JUMP_FORWARD);
      break;
    case '<':
      player.stepRate(-1);
      break;
    case '>':
      player.stepRate(1);
      break;
    case 'm':
    case 'M':
      player.toggleMute();
      break;
    default:
      return;
  }
  event.preventDefault();
}

document.addEventListener('keydown', onKeydown);

// Lock-screen and notification controls, where the browser has them.
if ('mediaSession' in navigator) bindMediaSession(navigator.mediaSession, player, allTracks());

let page: AbortController | undefined;
document.addEventListener('astro:page-load', () => {
  for (const root of document.querySelectorAll<HTMLElement>('[data-player]')) bindMiniPlayer(root);
  page = new AbortController();
  bindPlayButtons(page.signal);
});
document.addEventListener('astro:before-swap', () => page?.abort());
