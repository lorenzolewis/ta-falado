// Matching for the home-page lesson filter (#20), with MiniSearch for word-level fuzzy and
// prefix matching. Pure (no DOM), so it can be unit tested.
import MiniSearch from 'minisearch';

/** Lower case, accents stripped: "Ação" → "acao". */
export function normalize(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

export interface FilterDoc {
  id: number;
  text: string;
}

/**
 * Returns a function from a query to the ids of the matching documents, or `undefined` when the
 * query is blank (everything shown). Every word must match, as a prefix ("pronun") or with a typo
 * or two once it is longer than 3 letters ("pronunciaton").
 */
export function createFilter(docs: FilterDoc[]): (query: string) => Set<number> | undefined {
  const index = new MiniSearch<FilterDoc>({
    fields: ['text'],
    processTerm: (term) => normalize(term),
    searchOptions: {
      combineWith: 'AND',
      prefix: true,
      fuzzy: (term) => (term.length > 3 ? 0.2 : false),
    },
  });
  index.addAll(docs);
  return (query) => (query.trim() ? new Set(index.search(query).map((r) => r.id as number)) : undefined);
}
