// Wires up the home-page lesson filter (#20). Bundled scripts run once per visit under
// <ClientRouter /> (ADR 0001), so the listener below is added once, and each page load binds the
// page's own elements with a signal that is aborted before the next swap. Nothing is bound twice.
import { createFilter } from './filter';

/** How long typing must pause before the result count is read out. */
const ANNOUNCE_DELAY = 500;

function bindFilter(root: HTMLElement, signal: AbortSignal) {
  const input = root.querySelector<HTMLInputElement>('[data-filter-input]')!;
  const status = root.querySelector<HTMLElement>('[data-filter-status]')!;
  const empty = document.querySelector<HTMLElement>('[data-filter-empty]')!;
  const sections = [...document.querySelectorAll<HTMLElement>('[data-filter-section]')];
  const items = [...document.querySelectorAll<HTMLElement>('[data-search]')];
  const search = createFilter(items.map((li, id) => ({ id, text: li.dataset.search! })));

  let timer: ReturnType<typeof setTimeout> | undefined;
  signal.addEventListener('abort', () => clearTimeout(timer));

  function apply() {
    const hits = search(input.value);
    items.forEach((li, id) => (li.hidden = !!hits && !hits.has(id)));
    for (const section of sections) section.hidden = !section.querySelector('[data-search]:not([hidden])');
    const shown = hits ? hits.size : items.length;
    empty.hidden = shown > 0;

    clearTimeout(timer);
    const message = !hits ? '' : shown === 0 ? 'No lessons match.' : `${shown} of ${items.length} lessons match.`;
    timer = setTimeout(() => (status.textContent = message), ANNOUNCE_DELAY);

    const url = new URL(location.href);
    if (input.value.trim()) url.searchParams.set('q', input.value);
    else url.searchParams.delete('q');
    // Keep the router's own history state; only the URL changes.
    if (url.href !== location.href) history.replaceState(history.state, '', url);
  }

  input.value = new URL(location.href).searchParams.get('q') ?? input.value;
  input.addEventListener('input', apply, { signal });
  apply();
}

let page: AbortController | undefined;
document.addEventListener('astro:page-load', () => {
  page?.abort();
  const root = document.querySelector<HTMLElement>('[data-filter]');
  if (!root) return;
  page = new AbortController();
  bindFilter(root, page.signal);
});
document.addEventListener('astro:before-swap', () => page?.abort());
