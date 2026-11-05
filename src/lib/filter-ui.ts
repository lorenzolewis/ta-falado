// Wires up the home-page lesson filter (#20). Bundled scripts run once per visit under
// <ClientRouter /> (ADR 0001), so the listener below is added once, and each page load binds the
// page's own elements with a signal that is aborted before the next swap. Nothing is bound twice.
import { matches, queryTerms } from './filter';

/** How long typing must pause before the result count is read out. */
const ANNOUNCE_DELAY = 500;

function bindFilter(root: HTMLElement, signal: AbortSignal) {
  const input = root.querySelector<HTMLInputElement>('[data-filter-input]')!;
  const status = root.querySelector<HTMLElement>('[data-filter-status]')!;
  const empty = document.querySelector<HTMLElement>('[data-filter-empty]')!;
  const sections = [...document.querySelectorAll<HTMLElement>('[data-filter-section]')];
  const rows = sections.map((section) => ({
    section,
    items: [...section.querySelectorAll<HTMLElement>('[data-search]')].map((li) => ({ li, text: li.dataset.search! })),
  }));
  const total = rows.reduce((n, { items }) => n + items.length, 0);

  let timer: ReturnType<typeof setTimeout> | undefined;
  signal.addEventListener('abort', () => clearTimeout(timer));

  function apply() {
    const terms = queryTerms(input.value);
    let shown = 0;
    for (const { section, items } of rows) {
      let inSection = 0;
      for (const { li, text } of items) {
        const hit = matches(text, terms);
        li.hidden = !hit;
        if (hit) inSection++;
      }
      section.hidden = inSection === 0;
      shown += inSection;
    }
    empty.hidden = shown > 0;

    clearTimeout(timer);
    const message = terms.length === 0 ? '' : shown === 0 ? 'No lessons match.' : `${shown} of ${total} lessons match.`;
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
