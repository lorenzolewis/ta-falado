// Shared by the collection schema (src/content.config.ts) and the helpers (src/lib/lessons.ts).

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
