// Connects the page to the player state module (src/lib/player.ts). Imported once by
// src/components/Player.astro; under <ClientRouter /> it runs once per visit, so everything
// that touches a page's own elements happens in `astro:page-load`.
import { formatDuration } from './format';
import { JUMP_BACK, JUMP_FORWARD, player, type Track } from './player';

const time = (seconds: number) => formatDuration(Math.floor(seconds));

/** The mini-player is persisted across navigations, so it is wired up only once. */
function bindMiniPlayer(root: HTMLElement) {
  if (root.dataset.bound) return;
  root.dataset.bound = '';

  const $ = <T extends Element>(selector: string) => root.querySelector<T>(selector)!;
  const title = $<HTMLAnchorElement>('[data-title]');
  const toggle = $<HTMLButtonElement>('[data-action="toggle"]');
  const mute = $<HTMLButtonElement>('[data-action="mute"]');
  const rate = $<HTMLSelectElement>('[data-rate]');
  const seek = $<HTMLInputElement>('[data-seek]');
  const current = $<HTMLElement>('[data-current]');
  const duration = $<HTMLElement>('[data-duration]');
  const status = $<HTMLElement>('[data-status]');

  root.addEventListener('click', (event) => {
    const action = (event.target as Element).closest<HTMLElement>('[data-action]')?.dataset.action;
    if (action === 'toggle') player.toggle();
    else if (action === 'back') player.skip(-JUMP_BACK);
    else if (action === 'forward') player.skip(JUMP_FORWARD);
    else if (action === 'mute') player.toggleMute();
  });
  // The player is sticky at the bottom, so keep focused and scrolled-to content clear of it.
  new ResizeObserver(() => {
    document.documentElement.style.setProperty('--player-block-size', `${root.offsetHeight}px`);
  }).observe(root);
  rate.addEventListener('change', () => player.setRate(Number(rate.value)));
  seek.addEventListener('input', () => player.seek(Number(seek.value)));

  player.subscribe((state) => {
    if (!state.track) return;
    root.hidden = false;
    title.textContent = state.track.title;
    title.href = state.track.id;
    toggle.textContent = state.paused ? 'Play' : 'Pause';
    mute.setAttribute('aria-pressed', String(state.muted));
    rate.value = String(state.rate);
    seek.max = String(Math.floor(state.duration));
    seek.value = String(Math.floor(state.currentTime));
    seek.setAttribute('aria-valuetext', `${time(state.currentTime)} of ${time(state.duration)}`);
    current.textContent = time(state.currentTime);
    duration.textContent = time(state.duration);
    const message = state.error ? 'The audio could not be loaded.' : '';
    if (status.textContent !== message) status.textContent = message;
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

let page: AbortController | undefined;
document.addEventListener('astro:page-load', () => {
  const root = document.querySelector<HTMLElement>('[data-player]');
  if (root) bindMiniPlayer(root);
  page = new AbortController();
  bindPlayButtons(page.signal);
});
document.addEventListener('astro:before-swap', () => page?.abort());
