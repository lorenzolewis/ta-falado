import { describe, expect, it } from 'vitest';
import { createLessonFilter } from './lesson-filter';

// Each lesson's searchable text: title, topic and intro.
const lessons = [
  "Plurals with 'l' Gas Stations The plural of Brazil would be Brasis.",
  'Nasal vowels Ação de Graças Words like ação and coração end in a nasal sound.',
  'The verb ficar Weather Ficar means to stay, to become, or to be located.',
];

describe('lesson filter', () => {
  it('ignores accents and case', () => {
    const filter = createLessonFilter(lessons);
    expect(filter('acao')).toEqual([1]);
    expect(filter('AÇÃO')).toEqual([1]);
  });

  it('matches words from the title, topic and intro in any order', () => {
    const filter = createLessonFilter(lessons);
    expect(filter('brasis gas')).toEqual([0]);
    expect(filter('located weather')).toEqual([2]);
    expect(filter('xylophone')).toEqual([]);
  });

  it('tolerates one typo per word', () => {
    const filter = createLessonFilter(lessons);
    expect(filter('corazao')).toEqual([1]);
    expect(filter('plurls')).toEqual([0]);
  });

  it('keeps every lesson when the query is blank', () => {
    const filter = createLessonFilter(lessons);
    expect(filter('')).toEqual([0, 1, 2]);
    expect(filter('   ')).toEqual([0, 1, 2]);
  });
});
