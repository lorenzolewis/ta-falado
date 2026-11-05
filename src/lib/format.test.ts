import { describe, expect, it } from 'vitest';
import { formatKilobytes, formatMinutes } from './format';

describe('formatMinutes', () => {
  it('rounds to whole minutes, never 0', () => {
    expect(formatMinutes(584)).toBe('10 min');
    expect(formatMinutes(565)).toBe('9 min');
    expect(formatMinutes(20)).toBe('1 min');
  });
});

describe('formatKilobytes', () => {
  it('rounds to whole kilobytes of 1024 bytes', () => {
    expect(formatKilobytes(150171)).toBe('147 KB');
    expect(formatKilobytes(100)).toBe('1 KB');
  });
});
