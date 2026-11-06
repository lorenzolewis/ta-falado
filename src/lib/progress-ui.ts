// Connects device-local progress (src/lib/progress.ts) to the player and the pages (#19). Imported
// once by src/components/Player.astro, so it runs once per visit: the player hooks below are added
// once, and per-page elements are wired in `astro:page-load` and released on swap.
import { formatDuration } from './format';
import { player, type Track } from './player';
import { progress, resumeAt, timeLeft } from './progress';
import { allTracks } from './tracks';

/** How often, at most, the position is saved while playing. */
const SAVE_EVERY_MS = 5000;

const trackById = (id: string) => allTracks().find((t) => t.id === id);

// --- Player hooks (once per visit) -------------------------------------------------------------

const speed = progress.speed;
if (speed) player.setRate(speed);

/** The last state seen for the current track, so it can be saved when the track changes. */
let last: { id: string; time: number; duration: number } | undefined;
let savedAt = 0;
let wasPaused = true;

function save() {
  if (last) progress.savePosition(last.id, last.time, last.duration);
  savedAt = Date.now();
}

player.addEventListener('trackchange', () => {
  save(); // the previous lesson, where it was left
  const track = player.state.track!;
  last = undefined;
  savedAt = Date.now();
  const at = resumeAt(progress.get(track.id), track.durationSeconds);
  if (at > 0) player.seek(at);
});

player.subscribe(({ track, currentTime, duration, paused, rate }) => {
  progress.speed = rate;
  if (!track) return;
  last = { id: track.id, time: currentTime, duration };
  // Save on pause, then at most every few seconds while playing.
  if ((paused && !wasPaused) || (!paused && Date.now() - savedAt >= SAVE_EVERY_MS)) save();
  wasPaused = paused;
});

player.addEventListener('ended', () => {
  const current = player.state.track;
  if (!current) return;
  progress.finish(current.id);
  last = undefined;
  const next = allTracks().find((t) => t.episode > current.episode);
  if (next) player.play(next);
});

// Leaving or hiding the page (closing the tab, switching apps on a phone).
addEventListener('pagehide', save);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') save();
});

// --- Page elements (every page load) -----------------------------------------------------------

/**
 * `[data-finished="/grammar/03"]` marks are shown for finished lessons, and sidebar rows
 * (`[data-lesson="/grammar/03"]`) get `data-state="finished"` or `"started"` for their number square.
 */
function bindFinishedMarks(signal: AbortSignal) {
  const marks = document.querySelectorAll<HTMLElement>('[data-finished]');
  const rows = document.querySelectorAll<HTMLElement>('[data-lesson]');
  progress.subscribe(
    () => {
      for (const mark of marks) mark.hidden = !progress.get(mark.dataset.finished!)?.finished;
      for (const row of rows) {
        const entry = progress.get(row.dataset.lesson!);
        row.dataset.state = entry?.finished ? 'finished' : entry ? 'started' : '';
      }
    },
    { signal },
  );
}

/**
 * The home page's Continue card. With a lesson in progress: "Continue where you left off", its bar
 * and Resume. With none: the first unfinished lesson in episode order, so a first visit offers
 * Pronunciation 1 (as the page is rendered) and a returning learner what comes next. Hidden once
 * every lesson is finished.
 */
function bindContinueCard(signal: AbortSignal) {
  const card = document.querySelector<HTMLElement>('[data-continue]');
  if (!card) return;
  const $ = <T extends HTMLElement>(name: string) => card.querySelector<T>(`[data-continue-${name}]`)!;
  const heading = $('heading');
  const link = $<HTMLAnchorElement>('link');
  const time = $('time');
  const button = $<HTMLButtonElement>('play');
  const verb = $('verb');
  const meter = $('meter');
  const bar = $('bar');
  const left = $('left');
  let track: Track | undefined;

  button.addEventListener('click', () => track && player.play(track), { signal });
  progress.subscribe(
    () => {
      const id = progress.continueId;
      const tracks = allTracks();
      track = id ? trackById(id) : tracks.find((t) => !progress.get(t.id)?.finished);
      card.hidden = !track;
      if (!track) return;
      link.href = track.id;
      link.textContent = track.title;
      meter.hidden = !id;
      if (id) {
        heading.textContent = 'Continue where you left off';
        verb.textContent = 'Resume';
        const position = Math.floor(progress.get(track.id)!.position);
        time.textContent = `stopped at ${formatDuration(position)} of ${formatDuration(track.durationSeconds)}`;
        const { percent, label } = timeLeft(position, track.durationSeconds);
        bar.style.inlineSize = `${percent}%`;
        left.textContent = label;
      } else {
        const played = tracks.some((t) => progress.get(t.id));
        heading.textContent = played ? 'Up next' : 'Start with the first lesson';
        verb.textContent = 'Play';
        time.textContent = '';
        left.textContent = `${Math.ceil(track.durationSeconds / 60)} min`;
      }
    },
    { signal },
  );
}

let page: AbortController | undefined;
document.addEventListener('astro:page-load', () => {
  page?.abort();
  page = new AbortController();
  bindFinishedMarks(page.signal);
  bindContinueCard(page.signal);
});
document.addEventListener('astro:before-swap', () => page?.abort());
