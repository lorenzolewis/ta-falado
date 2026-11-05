// Matching for the home-page lesson filter (#20). Pure, so the build (which writes each row's
// searchable text) and the browser (which matches the query against it) normalize the same way.

/** Lower case, accents stripped: "Ação" → "acao". */
export function normalize(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/** The query's words, normalized. Empty when the query is blank. */
export function queryTerms(query: string): string[] {
  return normalize(query).split(/\s+/).filter(Boolean);
}

/** True when every term appears somewhere in `haystack` (already normalized). No terms match all. */
export function matches(haystack: string, terms: string[]): boolean {
  return terms.every((term) => haystack.includes(term));
}
