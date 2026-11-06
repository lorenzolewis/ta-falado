import { afterEach, describe, expect, it, vi } from 'vitest';
import { isFinished, latestUnfinished, resumeAt, timeLeft } from './progress';

describe('progress rules', () => {
  it('counts a lesson finished from 95%', () => {
    expect(isFinished(94, 100)).toBe(false);
    expect(isFinished(95, 100)).toBe(true);
    expect(isFinished(0, 0)).toBe(false);
  });

  it('resumes where it stopped, or from the start once (nearly) done', () => {
    expect(resumeAt(undefined, 100)).toBe(0);
    expect(resumeAt({ position: 42, finished: false, playedAt: 1 }, 100)).toBe(42);
    expect(resumeAt({ position: 97, finished: true, playedAt: 1 }, 100)).toBe(0);
  });

  it('offers the most recently played unfinished lesson', () => {
    expect(
      latestUnfinished({
        '/grammar/01': { position: 10, finished: false, playedAt: 1 },
        '/grammar/02': { position: 0, finished: true, playedAt: 3 },
        '/grammar/03': { position: 20, finished: false, playedAt: 2 },
      }),
    ).toBe('/grammar/03');
    expect(latestUnfinished({})).toBeUndefined();
  });
});

describe('time left', () => {
  it('gives the share played and the whole minutes left, never "0 min" before the end', () => {
    expect(timeLeft(150, 600)).toEqual({ percent: 25, label: '8 min left' });
    expect(timeLeft(570, 600)).toEqual({ percent: 95, label: '1 min left' });
    expect(timeLeft(0, 0)).toEqual({ percent: 0, label: '' });
  });
});

describe('storage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('keeps working in memory when localStorage throws', async () => {
    const blocked = () => {
      throw new DOMException('Blocked', 'SecurityError');
    };
    vi.stubGlobal('localStorage', { getItem: blocked, setItem: blocked });
    const { progress } = await import('./progress');
    progress.savePosition('/grammar/01', 30, 600);
    progress.speed = 1.25;
    expect(progress.get('/grammar/01')).toMatchObject({ position: 30, finished: false });
    expect(progress.continueId).toBe('/grammar/01');
    expect(progress.speed).toBe(1.25);
  });

  it('persists to localStorage under a versioned key', async () => {
    const items = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (k: string) => items.get(k) ?? null, setItem: (k: string, v: string) => items.set(k, v) });
    const { progress } = await import('./progress');
    progress.finish('/pronunciation/01');
    expect(JSON.parse(items.get('tafalado:v1:lessons')!)['/pronunciation/01']).toMatchObject({ position: 0, finished: true });
  });
});
