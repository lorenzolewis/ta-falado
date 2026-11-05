// PROTOTYPE (#53): client helpers shared by the home variants. The real filter and progress code
// does the work; this only adds what the variants show beyond it.
import { createLessonFilter } from '../../lib/lesson-filter';

export interface FilterState {
  query: string;
  matches: Set<number>;
  rows: HTMLElement[];
}

/** Wires `input` to filter every `[data-filter-text]` row; calls `update` on every keystroke. */
export function wireFilter(input: HTMLInputElement, update: (s: FilterState) => void, signal: AbortSignal) {
  const rows = [...document.querySelectorAll<HTMLElement>('[data-filter-text]')];
  const filter = createLessonFilter(rows.map((row) => row.dataset.filterText!));
  const run = () => update({ query: input.value.trim(), matches: new Set(filter(input.value)), rows });
  input.addEventListener('input', run, { signal });
  run();
  return run;
}

interface Entry {
  position: number;
  finished: boolean;
  playedAt: number;
}
function readProgress(): Record<string, Entry> {
  try {
    return JSON.parse(localStorage.getItem('tafalado:v1:lessons') ?? '{}');
  } catch {
    return {};
  }
}

/**
 * Shows progress the real progress-ui doesn't yet: the Continue bar (`[data-continue-bar]`, as --p),
 * time left (`[data-continue-left]`), `data-state` on rows (`finished` / `started`), and finished
 * counts per series (`[data-finished-count="grammar"]`, `[data-finished-bar="grammar"]`).
 */
export function showProgress() {
  const map = readProgress();
  const open = Object.entries(map)
    .filter(([, e]) => !e.finished)
    .sort((a, b) => b[1].playedAt - a[1].playedAt)[0];
  for (const row of document.querySelectorAll<HTMLElement>('[data-path]')) {
    const e = map[row.dataset.path!];
    row.dataset.state = e?.finished ? 'finished' : e ? 'started' : '';
  }
  if (open) {
    const row = document.querySelector<HTMLElement>(`[data-path="${open[0]}"]`);
    const total = Number(row?.dataset.seconds ?? 0);
    const pct = total ? (open[1].position / total) * 100 : 0;
    for (const bar of document.querySelectorAll<HTMLElement>('[data-continue-bar]')) bar.style.setProperty('--p', `${pct}%`);
    const left = Math.max(0, Math.round((total - open[1].position) / 60));
    for (const el of document.querySelectorAll<HTMLElement>('[data-continue-left]')) el.textContent = `${left} min left`;
  }
  for (const el of document.querySelectorAll<HTMLElement>('[data-finished-count]')) {
    const series = el.dataset.finishedCount!;
    const n = Object.entries(map).filter(([id, e]) => e.finished && id.startsWith(`/${series}/`)).length;
    el.textContent = String(n);
    el.closest<HTMLElement>('[data-has-finished]')?.toggleAttribute('hidden', n === 0);
  }
  for (const el of document.querySelectorAll<HTMLElement>('[data-finished-bar]')) {
    const series = el.dataset.finishedBar!;
    const n = Object.entries(map).filter(([id, e]) => e.finished && id.startsWith(`/${series}/`)).length;
    el.style.setProperty('--p', `${(n / Number(el.dataset.size)) * 100}%`);
  }
}

/** Runs `fn` on every visit to a page (the ClientRouter runs module scripts once), with an abort signal. */
export function onPage(fn: (signal: AbortSignal) => void) {
  let page: AbortController | undefined;
  document.addEventListener('astro:page-load', () => {
    page?.abort();
    page = new AbortController();
    fn(page.signal);
  });
  document.addEventListener('astro:before-swap', () => page?.abort());
}
