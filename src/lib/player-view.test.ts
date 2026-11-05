import { describe, expect, it } from 'vitest';
import type { PlayerState, Track } from './player';
import { playerStatus, progress, timeLeft } from './player-view';

const track: Track = {
  id: '/pronunciation/01',
  title: 'Pronunciation 1: Pronunciation of /i/',
  series: 'Pronunciation',
  artwork: '/artwork/pronunciation-01.png',
  src: '/mp3/pronunciation-01.mp3',
  durationSeconds: 650,
  episode: 1,
};
const state = (patch: Partial<PlayerState> = {}): PlayerState => ({
  track,
  paused: true,
  currentTime: 0,
  duration: 650,
  rate: 1,
  muted: false,
  error: false,
  ready: true,
  ...patch,
});

describe('playerStatus', () => {
  it('is idle with no lesson loaded', () => {
    expect(playerStatus(state({ track: null }))).toBe('idle');
  });
  it('is paused or playing once there is enough audio', () => {
    expect(playerStatus(state({ paused: true }))).toBe('paused');
    expect(playerStatus(state({ paused: false }))).toBe('playing');
  });
  it('is loading when asked to play before there is enough audio', () => {
    expect(playerStatus(state({ paused: false, ready: false }))).toBe('loading');
  });
  it('is paused, not loading, while paused before the audio arrives', () => {
    expect(playerStatus(state({ paused: true, ready: false }))).toBe('paused');
  });
  it('is error when the audio failed, even while asked to play', () => {
    expect(playerStatus(state({ error: true, paused: false, ready: false }))).toBe('error');
  });
});

describe('timeLeft', () => {
  it('counts down what is left of the lesson', () => {
    expect(timeLeft(state({ currentTime: 193, duration: 650 }))).toBe('7:37 left');
  });
  it('drops the fraction of a second', () => {
    expect(timeLeft(state({ currentTime: 192.4, duration: 650 }))).toBe('7:37 left');
  });
  it('never goes below zero', () => {
    expect(timeLeft(state({ currentTime: 651, duration: 650 }))).toBe('0:00 left');
  });
});

describe('progress', () => {
  it('is how far through the lesson, from 0 to 1', () => {
    expect(progress(state({ currentTime: 162.5, duration: 650 }))).toBe(0.25);
  });
  it('is 0 while the duration is unknown', () => {
    expect(progress(state({ currentTime: 5, duration: 0 }))).toBe(0);
  });
  it('stays within 0 and 1', () => {
    expect(progress(state({ currentTime: 700, duration: 650 }))).toBe(1);
  });
});
