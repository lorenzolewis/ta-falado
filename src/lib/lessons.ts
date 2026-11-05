import { getCollection, type CollectionEntry } from 'astro:content';
import type { Track } from './player';
import { SERIES_LABEL, type Series } from './series';

export { SERIES, type Series } from './series';
export type Lesson = CollectionEntry<'lessons'>;

let cache: Promise<Lesson[]> | undefined;

/** Every lesson in episode order (1–46). Fails the build if episodes or series numbers repeat. */
export function getLessons(): Promise<Lesson[]> {
  cache ??= getCollection('lessons').then((lessons) => {
    assertUnique(lessons, (l) => `episode ${l.data.episode}`);
    assertUnique(lessons, (l) => `${l.data.series} ${l.data.number}`);
    for (const lesson of lessons) {
      if (!lesson.body?.trim()) throw new Error(`Lesson "${lesson.id}" has no intro (the Markdown body is empty).`);
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

/** `/pronunciation/01`, `/grammar/12`, `/supplementary/02`. */
export function lessonPath({ series, number }: { series: Series; number: number }): string {
  return `/${series}/${String(number).padStart(2, '0')}`;
}

/** What the player needs to know about a lesson (also keys its saved progress by path). */
export function toTrack({ data }: Lesson): Track {
  return {
    id: lessonPath(data),
    title: `${SERIES_LABEL[data.series]} ${data.number}: ${data.title}`,
    src: data.audio.url,
    durationSeconds: data.audio.durationSeconds,
    episode: data.episode,
  };
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
