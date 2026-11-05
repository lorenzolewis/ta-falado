import { describe, expect, it } from 'vitest';
import { createLessonFilter, filterView } from './lesson-filter';

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

describe('filter view', () => {
  // Two pronunciation lessons, then two grammar lessons, then one supplementary.
  const rowSeries = ['pronunciation', 'pronunciation', 'grammar', 'grammar', 'supplementary'];

  it('shows the matching lessons, with match counts per series', () => {
    const view = filterView({ query: 'nh', matches: [1, 2, 3], rowSeries, series: null });
    expect(view.hidden).toEqual([true, false, false, false, true]);
    expect(view.counts).toEqual({ pronunciation: 1, grammar: 2, supplementary: 0 });
    expect(view.status).toBe('3 lessons match');
    expect(view.empty).toBe(false);
  });

  it('combines the query with a pressed series pill, hiding the other pills', () => {
    const view = filterView({ query: 'nh', matches: [1, 2, 3], rowSeries, series: 'grammar' });
    expect(view.hidden).toEqual([true, true, false, false, true]);
    expect(view.status).toBe('2 lessons match');
    expect(view.pills).toEqual({ pronunciation: false, grammar: true, supplementary: false });
  });

  it('hides the pills of series with no matches while a query is typed', () => {
    const view = filterView({ query: 'nh', matches: [1, 2, 3], rowSeries, series: null });
    expect(view.pills).toEqual({ pronunciation: true, grammar: true, supplementary: false });
  });

  it('shows every lesson and pill, with no status, for a blank query', () => {
    const view = filterView({ query: ' ', matches: [0, 1, 2, 3, 4], rowSeries, series: null });
    expect(view.hidden).toEqual([false, false, false, false, false]);
    expect(view.counts).toEqual({ pronunciation: 2, grammar: 2, supplementary: 1 });
    expect(view.pills).toEqual({ pronunciation: true, grammar: true, supplementary: true });
    expect(view.status).toBe('');
  });

  it('keeps the pressed pill even when none of its lessons match', () => {
    const view = filterView({ query: 'gas', matches: [4], rowSeries, series: 'grammar' });
    expect(view.pills).toEqual({ pronunciation: false, grammar: true, supplementary: false });
    expect(view.empty).toBe(true);
  });

  it('says when nothing matches, and in the singular for one match', () => {
    expect(filterView({ query: 'xyz', matches: [], rowSeries, series: null })).toMatchObject({
      status: 'No lessons match.',
      empty: true,
    });
    expect(filterView({ query: 'gas', matches: [4], rowSeries, series: null }).status).toBe('1 lesson matches');
  });
});
