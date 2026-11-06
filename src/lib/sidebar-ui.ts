// Wires the persisted sidebar (src/components/Sidebar.astro) and the phone's views (#53). Imported
// once by the sidebar, so it runs once per visit: the sidebar is kept across navigations, so its
// filter is bound once, while the current row and the phone's view are updated on every page.
import { navigate } from 'astro:transitions/client';
import { createLessonFilter, filterView } from './lesson-filter';
import { LESSONS_ID, pagePath, viewOf } from './nav';

const bound = new WeakSet<Element>();
/** How long the lesson filter waits after a keystroke before showing results. */
const SEARCH_DELAY_MS = 120;
/** Shows one series' lessons with no query (or every series, for null). Set once the sidebar is bound. */
let showOnly: ((id: string | null) => void) | undefined;

function bindSidebar(root: HTMLElement) {
  if (bound.has(root)) return;
  bound.add(root);

  const $ = <T extends Element>(selector: string) => root.querySelector<T>(selector)!;
  const input = $<HTMLInputElement>('#lesson-filter');
  const search = $<HTMLElement>('#lesson-search');
  const toggle = $<HTMLButtonElement>('[data-search-toggle]');
  const status = $<HTMLElement>('#lesson-filter-status');
  const empty = $<HTMLElement>('[data-empty]');
  const pillAll = $<HTMLButtonElement>('[data-pill-all]');
  const pills = [...root.querySelectorAll<HTMLButtonElement>('[data-pill]')];
  const rows = [...root.querySelectorAll<HTMLElement>('[data-filter-text]')];
  const rowSeries = rows.map((row) => row.dataset.series!);
  const filter = createLessonFilter(rows.map((row) => row.dataset.filterText!));
  let series: string | null = null;

  function update() {
    const view = filterView({ query: input.value, matches: filter(input.value), rowSeries, series });
    rows.forEach((row, i) => (row.hidden = view.hidden[i]!));
    for (const pill of pills) {
      const id = pill.dataset.pill!;
      pill.hidden = !view.pills[id];
      pill.setAttribute('aria-pressed', String(id === series));
      pill.querySelector('[data-pill-count]')!.textContent = String(view.counts[id] ?? 0);
    }
    // "All episodes": pressed when no series is, counting the query's matches across every series.
    pillAll.setAttribute('aria-pressed', String(series === null));
    const all = Object.values(view.counts).reduce((sum, n) => sum + n, 0);
    pillAll.querySelector('[data-pill-count]')!.textContent = String(all);
    empty.hidden = !view.empty;
    if (status.textContent !== view.status) status.textContent = view.status;
  }

  function setSeries(id: string | null) {
    series = id;
    update();
  }
  showOnly = (id) => {
    input.value = '';
    openSearch(false);
    setSeries(id);
  };
  // The results follow typing after a short pause, so the list reads as the filter at work rather
  // than flickering on every keystroke. Pills and Clear stay immediate.
  let pending: number | undefined;
  input.addEventListener('input', () => {
    clearTimeout(pending);
    pending = window.setTimeout(update, SEARCH_DELAY_MS);
  });
  for (const pill of pills) {
    pill.addEventListener('click', () => setSeries(series === pill.dataset.pill ? null : pill.dataset.pill!));
  }
  pillAll.addEventListener('click', () => setSeries(null));
  $('[data-clear]').addEventListener('click', () => {
    input.value = '';
    setSeries(null);
    input.focus();
  });
  // The search button opens the field; closing it clears the filter.
  function openSearch(open: boolean) {
    search.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
  }
  toggle.addEventListener('click', () => {
    const open = Boolean(search.hidden);
    openSearch(open);
    if (open) input.focus();
    else if (input.value) {
      input.value = '';
      update();
    }
  });
  if (input.value) openSearch(true); // the browser may have restored a value
  update();
}

/** Marks the current page in the sidebar, and picks the phone's view from the URL. */
function syncPage() {
  const sidebar = document.querySelector<HTMLElement>('[data-sidebar]');
  const app = document.querySelector<HTMLElement>('[data-app]');
  if (!sidebar || !app) return;
  const view = viewOf(location.pathname, location.hash);
  const here = pagePath(location.pathname);
  const mark = (el: Element | null, on: boolean) =>
    on ? el?.setAttribute('aria-current', 'page') : el?.removeAttribute('aria-current');

  mark(sidebar.querySelector('[data-nav="home"]'), here === '/');
  for (const link of sidebar.querySelectorAll('.list a')) mark(link, link.getAttribute('href') === here);
  app.dataset.view = view;
}

const LESSONS_HASH = `#${LESSONS_ID}`;

/**
 * Opens the phone's Lessons view: #lessons on the current page. Through the ClientRouter, so the
 * history entry is one it can go Back from (it ignores the entries of plain fragment links), and
 * then synced here, since a same-page hash navigation fires no event of its own.
 */
async function openLessons() {
  if (location.hash !== LESSONS_HASH) await navigate(LESSONS_HASH);
  syncPage();
  scrollTo(0, 0);
}

/**
 * "All 46 lessons" on the home page (shown only on a phone): the Lessons view with the whole list,
 * no series or query, from its top. Exported for the home page's script.
 */
export function showAllLessons() {
  showOnly?.(null);
  document.querySelector('[data-sidebar] .list')?.scrollTo(0, 0);
  void openLessons();
}

// Links to #lessons (the phone's "‹ Lessons" button). Captured before the ClientRouter's
// own click handler, which then leaves the click alone.
document.addEventListener(
  'click',
  (event) => {
    const link = (event.target as Element).closest?.('a');
    if (!link || link.getAttribute('href') !== LESSONS_HASH || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    void openLessons();
  },
  { capture: true },
);

document.addEventListener('astro:page-load', () => {
  const sidebar = document.querySelector<HTMLElement>('[data-sidebar]');
  if (sidebar) bindSidebar(sidebar);
  syncPage();
});
// Before the new page is painted, so the phone never flashes the wrong view.
document.addEventListener('astro:after-swap', syncPage);
// Back and Forward into and out of #lessons on the same page swap nothing.
addEventListener('popstate', syncPage);
