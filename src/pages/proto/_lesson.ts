// PROTOTYPE (#55), never merged. Data for the chosen lesson page at /proto/lesson/<lesson>, built
// for a few sample lessons. Underscore-prefixed, so Astro doesn't route this file.
import { statSync } from 'node:fs';
import { getLessons, lessonPath, toTrack, type Lesson } from '../../lib/lessons';
import { formatDate, formatDuration, isoDate } from '../../lib/format';
import { SERIES_LABEL } from '../../lib/series';

/**
 * Picked for the awkward cases: PT + ES words, one word in both languages, a long title, a
 * near-square and a panoramic photo, each series' paper colour, no photo, no topic.
 */
export const SAMPLES = [
  'grammar-17',
  'grammar-15',
  'grammar-14',
  'pronunciation-11',
  'pronunciation-16',
  'pronunciation-01',
  'supplementary-01',
] as const;

/**
 * The language of each *italic* in the intro, in order. Hand-marked for the prototype only: the real
 * build needs a Markdown convention for it (see PROTOTYPE.md). 'em' = plain emphasis or a name.
 */
const ITALICS: Record<string, ('pt-BR' | 'es' | 'em')[]> = {
  'grammar-17': ['es', 'pt-BR'],
  'grammar-15': ['es', 'es', 'pt-BR'],
  'pronunciation-01': ['em', 'em', 'em', 'em'],
};

export async function sampleStaticPaths() {
  const lessons = await getLessons();
  return SAMPLES.map((slug) => ({ params: { lesson: slug }, props: { lesson: lessons.find((l) => l.id === slug)! } }));
}

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** The intro as HTML paragraphs, with PT and ES italics marked by `lang` and a class to style them. */
export function introHtml(lesson: Lesson): string {
  const langs = ITALICS[lesson.id] ?? [];
  let i = 0;
  return lesson
    .body!.trim()
    .split(/\n\s*\n/)
    .map((p) => {
      const html = escape(p).replace(/\*([^*]+)\*/g, (_, text) => {
        const lang = langs[i++] ?? 'em';
        return lang === 'em' ? `<em>${text}</em>` : `<i lang="${lang}" class="w-${lang === 'es' ? 'es' : 'pt'}">${text}</i>`;
      });
      return `<p>${html}</p>`;
    })
    .join('');
}

function kb(bytes: number) {
  return `${Math.round(bytes / 1024)} KB`;
}

/** Everything a variant shows, formatted. */
export function view(lesson: Lesson) {
  const d = lesson.data;
  const pdfBytes = d.pdf.url.startsWith('/') ? statSync(`public${d.pdf.url}`).size : undefined;
  return {
    track: toTrack(lesson),
    trackJson: JSON.stringify(toTrack(lesson)),
    path: lessonPath(d),
    series: SERIES_LABEL[d.series],
    number: d.number,
    title: d.title,
    topic: d.topic,
    date: formatDate(d.date),
    isoDate: isoDate(d.date),
    duration: formatDuration(d.audio.durationSeconds),
    minutes: `${Math.round(d.audio.durationSeconds / 60)} min`,
    photo: d.photo,
    pdf: d.pdf.url,
    pdfSize: pdfBytes ? kb(pdfBytes) : undefined,
    intro: introHtml(lesson),
  };
}
