// Series facts and lesson naming, with no `astro:content` import, so the collection schema
// (src/content.config.ts), the helpers (src/lib/lessons.ts) and unit-tested modules (./seo) can all use it.

export const SERIES = ['pronunciation', 'grammar', 'supplementary'] as const;
export type Series = (typeof SERIES)[number];

/** How many lessons each series has in the original course. */
export const SERIES_SIZE: Record<Series, number> = { pronunciation: 24, grammar: 20, supplementary: 2 };

/** The series name as shown in the interface. */
export const SERIES_LABEL: Record<Series, string> = {
  pronunciation: 'Pronunciation',
  grammar: 'Grammar',
  supplementary: 'Supplementary',
};

/** `/pronunciation/01`, `/grammar/12`, `/supplementary/02`. */
export function lessonPath({ series, number }: { series: Series; number: number }): string {
  return `/${series}/${String(number).padStart(2, '0')}`;
}

/** "Grammar 1: Gostar vs. Gustar": a lesson's full name, as its page and the player show it. */
export function lessonTitle({ series, number, title }: { series: Series; number: number; title: string }): string {
  return `${SERIES_LABEL[series]} ${number}: ${title}`;
}
