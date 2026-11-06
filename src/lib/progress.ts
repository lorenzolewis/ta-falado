// Learner progress, stored on this device only (ADR 0004, #19): a resume position and a finished
// flag per lesson, and the playback speed. Lessons are keyed by their path (`Track.id`).
import { RATES } from './player';
import { read, write } from './storage';

export interface LessonProgress {
  /** Seconds into the lesson where it was last stopped. */
  position: number;
  /** Set at 95% or at the end, and kept when the lesson is played again. */
  finished: boolean;
  /** `Date.now()` of the last save, to find the most recent lesson. */
  playedAt: number;
}

export type ProgressMap = Record<string, LessonProgress>;

/** A lesson counts as finished from this share of its duration. */
export const FINISHED_AT = 0.95;

export function isFinished(position: number, duration: number): boolean {
  return duration > 0 && position >= duration * FINISHED_AT;
}

/** Where to start a lesson: its saved position, or the beginning if there is none or it was (nearly) done. */
export function resumeAt(entry: LessonProgress | undefined, duration: number): number {
  if (!entry || isFinished(entry.position, duration)) return 0;
  return entry.position;
}

/** The most recently played lesson that isn't finished, for the Continue card. */
export function latestUnfinished(lessons: ProgressMap): string | undefined {
  let latest: [string, LessonProgress] | undefined;
  for (const entry of Object.entries(lessons)) {
    if (!entry[1].finished && (!latest || entry[1].playedAt > latest[1].playedAt)) latest = entry;
  }
  return latest?.[0];
}

/** For the Continue card: how far into a lesson, and "7 min left" (rounded up, so never "0 min"). */
export function timeLeft(position: number, duration: number): { percent: number; label: string } {
  if (duration <= 0) return { percent: 0, label: '' };
  const left = Math.max(0, duration - position);
  return {
    percent: Math.min(100, (position / duration) * 100),
    label: `${Math.max(1, Math.ceil(left / 60))} min left`,
  };
}

const isEntry = (value: unknown): value is LessonProgress => {
  const v = value as LessonProgress;
  return typeof v?.position === 'number' && typeof v.finished === 'boolean' && typeof v.playedAt === 'number';
};
const isProgressMap = (value: unknown): value is ProgressMap =>
  typeof value === 'object' && value !== null && !Array.isArray(value) && Object.values(value).every(isEntry);
const isRate = (value: unknown): value is number => RATES.some((rate) => rate === value);

class Progress extends EventTarget {
  #lessons: ProgressMap = read('lessons', isProgressMap) ?? {};

  get(id: string): LessonProgress | undefined {
    return this.#lessons[id];
  }

  /** The id of the lesson the Continue card offers, if any. */
  get continueId(): string | undefined {
    return latestUnfinished(this.#lessons);
  }

  /** Saves where a lesson was stopped; marks it finished once past 95%. */
  savePosition(id: string, position: number, duration: number): void {
    const finished = this.#lessons[id]?.finished || isFinished(position, duration);
    this.#set(id, { position, finished, playedAt: Date.now() });
  }

  /** The lesson played to its end: finished, and the next play starts from the beginning. */
  finish(id: string): void {
    this.#set(id, { position: 0, finished: true, playedAt: Date.now() });
  }

  get speed(): number | undefined {
    return read('speed', isRate);
  }

  set speed(rate: number) {
    if (isRate(rate) && rate !== this.speed) write('speed', rate);
  }

  /** Calls `fn` now and whenever a lesson's progress changes; `signal` unsubscribes. */
  subscribe(fn: () => void, { signal }: { signal?: AbortSignal } = {}): void {
    this.addEventListener('change', fn, { signal });
    fn();
  }

  #set(id: string, entry: LessonProgress) {
    this.#lessons = { ...this.#lessons, [id]: entry };
    write('lessons', this.#lessons);
    this.dispatchEvent(new Event('change'));
  }
}

export type { Progress };
export const progress = new Progress();
