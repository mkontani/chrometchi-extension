import { act, cleanup, renderHook } from '@testing-library/preact';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import type { SfxName } from '@/ui/sound';
import { useCareEffect } from './useCareEffect';

const feed = { kind: 'feed', food: 'rice' } as const;
const clean = { kind: 'clean', poops: 2 } as const;
let onCue: ReturnType<typeof vi.fn<(sfx: SfxName) => void>>;

beforeEach(() => {
  vi.useFakeTimers();
  onCue = vi.fn<(sfx: SfxName) => void>();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const mount = (reduced = false) => renderHook(() => useCareEffect({ reduced, onCue }));
const advance = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

test('nothing plays until asked', () => {
  const { result } = mount();
  expect(result.current.frame).toBeNull();
  expect(vi.getTimerCount()).toBe(0);
});

test('a played effect shows at once and ends after its duration', () => {
  const { result } = mount();
  act(() => result.current.play(feed));
  expect(result.current.frame?.props.some((p) => p.art.kind === 'food')).toBe(true);
  advance(1000);
  expect(result.current.frame?.props.find((p) => p.art.kind === 'food')?.art).toMatchObject({ bites: 1 });
  advance(1600);
  expect(result.current.frame).toBeNull();
  expect(vi.getTimerCount()).toBe(0);
});

test('sound cues fire once each, when their time comes', () => {
  const { result } = mount();
  act(() => result.current.play(feed));
  advance(550);
  expect(onCue).not.toHaveBeenCalled();
  advance(50);
  expect(onCue.mock.calls).toEqual([['eat']]);
  advance(2000);
  expect(onCue.mock.calls).toEqual([['eat'], ['eat'], ['eat']]);
});

test('a cue at 0 ms fires right away', () => {
  const { result } = mount(true);
  act(() => result.current.play({ kind: 'lights', on: true }));
  expect(onCue.mock.calls).toEqual([['click']]);
});

test('playing again restarts the effect and drops the old cues', () => {
  const { result } = mount();
  act(() => result.current.play(feed));
  advance(500);
  act(() => result.current.play(clean));
  expect(result.current.frame?.props.some((p) => p.key === 'broom')).toBe(true);
  expect(result.current.frame?.props.some((p) => p.art.kind === 'food')).toBe(false);
  expect(vi.getTimerCount()).toBe(1);
  advance(2200);
  expect(onCue.mock.calls.flat()).not.toContain('eat');
  expect(result.current.frame).toBeNull();
});

test('playing the same effect again starts it over', () => {
  const { result } = mount();
  act(() => result.current.play(feed));
  advance(1300);
  act(() => result.current.play(feed));
  expect(result.current.frame?.props.find((p) => p.art.kind === 'food')?.art).toMatchObject({ bites: 0 });
  advance(2500);
  expect(result.current.frame).not.toBeNull();
});

test('play(null) stops the effect', () => {
  const { result } = mount();
  act(() => result.current.play(feed));
  act(() => result.current.play(null));
  expect(result.current.frame).toBeNull();
  expect(vi.getTimerCount()).toBe(0);
});

test('reduced motion plays the short version', () => {
  const { result } = mount(true);
  act(() => result.current.play(feed));
  advance(800);
  expect(result.current.frame).toBeNull();
});

test('play after unmount does nothing', () => {
  const { result, unmount } = mount();
  const { play } = result.current;
  unmount();
  expect(() => play(feed)).not.toThrow();
  expect(vi.getTimerCount()).toBe(0);
  expect(onCue).not.toHaveBeenCalled();
});

test('unmounting mid-effect leaves no timers', () => {
  const { result, unmount } = mount();
  act(() => result.current.play(feed));
  unmount();
  expect(vi.getTimerCount()).toBe(0);
});
