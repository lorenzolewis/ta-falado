import { describe, expect, it } from 'vitest';
import { seriesOf } from './nav';

describe('seriesOf', () => {
  it("gives a lesson page's series", () => {
    expect(seriesOf('/grammar/03')).toBe('grammar');
    expect(seriesOf('/supplementary/01')).toBe('supplementary');
    // The static build may serve the .html path.
    expect(seriesOf('/pronunciation/12.html')).toBe('pronunciation');
  });

  it('gives nothing for any other page', () => {
    expect(seriesOf('/')).toBeUndefined();
    expect(seriesOf('/feed.xml')).toBeUndefined();
    expect(seriesOf('/grammar')).toBeUndefined();
    expect(seriesOf('/grammar/3')).toBeUndefined();
  });
});
