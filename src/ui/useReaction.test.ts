import { act, cleanup, renderHook } from '@testing-library/preact';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import type { CareOutcome } from '@/core/types';
import { useReaction } from './useReaction';

const ok = (action: CareOutcome['action']): CareOutcome => ({ action, result: 'ok' });

const OUT = { feed: ok('feed'), play: ok('play'), pet: ok('pet'), clean: ok('clean') };

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

test('feed gives no reaction (the care effect shows the eating)', () => {
  const { result } = renderHook(() => useReaction(OUT.feed));
  expect(result.current).toEqual({ reaction: null, fromPlay: false });
});

test('pet gives happy which ends after 1000 ms', () => {
  const { result } = renderHook(() => useReaction(OUT.pet));
  expect(result.current.reaction).toBe('happy');
  act(() => void vi.advanceTimersByTime(1000));
  expect(result.current.reaction).toBeNull();
});

test('play gives happy from play', () => {
  const { result } = renderHook(() => useReaction(OUT.play));
  expect(result.current).toEqual({ reaction: 'happy', fromPlay: true });
});

test('pet gives happy not from play', () => {
  const { result } = renderHook(() => useReaction(OUT.pet));
  expect(result.current).toEqual({ reaction: 'happy', fromPlay: false });
});

test('an intervening non-reaction outcome clears the reaction', () => {
  const { result, rerender } = renderHook(({ o }) => useReaction(o), {
    initialProps: { o: OUT.pet as CareOutcome | null },
  });
  expect(result.current.reaction).toBe('happy');
  act(() => void vi.advanceTimersByTime(300));
  rerender({ o: OUT.clean });
  expect(result.current.reaction).toBeNull();
  rerender({ o: { action: 'feed', result: 'refused', reason: 'full' } });
  expect(result.current.reaction).toBeNull();
});

test('unmount leaves no timers', () => {
  const { unmount } = renderHook(() => useReaction(OUT.pet));
  unmount();
  expect(vi.getTimerCount()).toBe(0);
});
