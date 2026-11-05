import { expect, test } from 'vitest';
import { matches, normalize, queryTerms } from './filter';

const row = normalize('Gostar vs. Gustar, Sitting on the Grass. Ação e emoção.');

test('ignores accents and case', () => {
  expect(matches(row, queryTerms('acao'))).toBe(true);
  expect(matches(row, queryTerms('AÇÃO'))).toBe(true);
  expect(matches(normalize('Ação'), queryTerms('acao'))).toBe(true);
});

test('every word must match, in any order', () => {
  expect(matches(row, queryTerms('grass gostar'))).toBe(true);
  expect(matches(row, queryTerms('grass ficar'))).toBe(false);
});

test('a blank query matches everything', () => {
  expect(queryTerms('   ')).toEqual([]);
  expect(matches(row, queryTerms(''))).toBe(true);
});
