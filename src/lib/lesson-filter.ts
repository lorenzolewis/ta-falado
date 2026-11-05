// The home page's lesson filter (#20), a thin wrapper over uFuzzy. Accents are stripped from both
// sides with uFuzzy's own latinize(), so "acao" matches "ação"; uFuzzy already ignores case.
import uFuzzy from '@leeoniya/ufuzzy';

// intraMode 1 (SingleError) allows one typo per word: "corazao" still finds "coração".
const fuzzy = new uFuzzy({ intraMode: 1 });
/** How many words of a query are permuted (3! = 6 searches); uFuzzy warns against going much higher. */
const MAX_PERMUTED_WORDS = 3;

/** Takes each lesson's searchable text, returns a function from a query to the matching indexes. */
export function createLessonFilter(texts: string[]): (query: string) => number[] {
  const haystack = uFuzzy.latinize(texts);
  const all = texts.map((_, i) => i);
  // search() gives null for a query with no terms (blank), and [] when nothing matches. Up to
  // MAX_PERMUTED_WORDS words are tried in every order, so "gas plurals" finds "Plurals … Gas Stations".
  return (query) => fuzzy.search(haystack, uFuzzy.latinize(query), MAX_PERMUTED_WORDS)[0] ?? all;
}
