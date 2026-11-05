import { expect, test } from 'vitest';
import { createFilter } from './filter';

const filter = createFilter([
  { id: 1, text: 'Gostar vs. Gustar Sitting on the Grass' },
  { id: 2, text: "Plural of Words That End in 'ão' Car Insurance. Ação e emoção." },
  { id: 3, text: 'Pronunciation of /i/ Getting the Check at a Restaurant' },
]);
const ids = (query: string) => [...(filter(query) ?? [])].sort();

test('ignores accents and case', () => {
  expect(ids('acao')).toEqual([2]);
  expect(ids('AÇÃO')).toEqual([2]);
});

test('matches prefixes and tolerates typos', () => {
  expect(ids('pronun')).toEqual([3]);
  expect(ids('pronunciaton')).toEqual([3]);
  expect(ids('resturant')).toEqual([3]);
});

test('every word must match', () => {
  expect(ids('grass gostar')).toEqual([1]);
  expect(ids('grass insurance')).toEqual([]);
});

test('a blank query filters nothing', () => {
  expect(filter('   ')).toBeUndefined();
});
