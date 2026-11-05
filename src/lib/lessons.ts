import { getCollection, type CollectionEntry } from 'astro:content';
import { episodeCoverPath } from './artwork';
import type { Track } from './player';
import { SERIES_LABEL, lessonPath, lessonTitle, type Series } from './series';

export { SERIES, lessonPath, lessonTitle, type Series } from './series';
export type Lesson = CollectionEntry<'lessons'>;

let cache: Promise<Lesson[]> | undefined;

/** Every lesson in episode order (1–46). Fails the build if episodes or series numbers repeat. */
export function getLessons(): Promise<Lesson[]> {
  cache ??= getCollection('lessons').then((lessons) => {
    assertUnique(lessons, (l) => `episode ${l.data.episode}`);
    assertUnique(lessons, (l) => `${l.data.series} ${l.data.number}`);
    for (const lesson of lessons) {
      if (!lesson.body?.trim()) throw new Error(`Lesson "${lesson.id}" has no intro (the Markdown body is empty).`);
      assertIntroLangs(lesson);
    }
    return lessons.toSorted((a, b) => a.data.episode - b.data.episode);
  });
  return cache;
}

/** The lessons of one series, in their original order. */
export async function lessonsBySeries(series: Series): Promise<Lesson[]> {
  return (await getLessons()).filter((l) => l.data.series === series).toSorted((a, b) => a.data.number - b.data.number);
}

export async function getLesson(series: Series, number: number): Promise<Lesson | undefined> {
  return (await getLessons()).find((l) => l.data.series === series && l.data.number === number);
}

/** The lesson after this one in episode order (across series), or undefined after the last. */
export async function nextLesson(lesson: Lesson): Promise<Lesson | undefined> {
  return (await getLessons()).find((l) => l.data.episode > lesson.data.episode);
}

/**
 * The title without a leading "Pronunciation of", for places that already show the series:
 * "/i/" rather than "Pronunciation of /i/". Used by the feed and the artwork.
 */
export function shortTitle({ series, title }: { series: Series; title: string }): string {
  return series === 'pronunciation' ? title.replace(/^Pronunciation of /, '') : title;
}

/** What the player needs to know about a lesson (also keys its saved progress by path). */
export function toTrack({ data }: Lesson): Track {
  return {
    id: lessonPath(data),
    title: lessonTitle(data),
    series: SERIES_LABEL[data.series],
    artwork: episodeCoverPath(data),
    src: data.audio.url,
    durationSeconds: data.audio.durationSeconds,
    episode: data.episode,
  };
}

/** The languages an intro may mark (docs/lesson-schema.md): `<i lang="pt-BR">` and `<i lang="es">`. */
const INTRO_LANGS = new Set(['pt-BR', 'es']);

function assertIntroLangs(lesson: Lesson): void {
  for (const [, lang] of lesson.body!.matchAll(/\blang=["']?([^"'\s>]*)/g)) {
    if (!INTRO_LANGS.has(lang))
      throw new Error(`Lesson "${lesson.id}" marks a word as lang="${lang}". Use lang="pt-BR" or lang="es".`);
  }
}

function assertUnique(lessons: Lesson[], key: (lesson: Lesson) => string): void {
  const seen = new Map<string, string>();
  for (const lesson of lessons) {
    const k = key(lesson);
    const other = seen.get(k);
    if (other) throw new Error(`Lessons "${other}" and "${lesson.id}" both have ${k}. Each must be unique.`);
    seen.set(k, lesson.id);
  }
}
