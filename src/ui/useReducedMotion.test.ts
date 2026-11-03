import { act, cleanup, renderHook } from '@testing-library/preact';
import { afterEach, expect, test, vi } from 'vitest';
import { useReducedMotion } from './useReducedMotion';

function stubMedia(matches: boolean) {
  const listeners = new Set<(e: { matches: boolean }) => void>();
  const mql = {
    matches,
    addEventListener: vi.fn((_: string, cb: (e: { matches: boolean }) => void) => listeners.add(cb)),
    removeEventListener: vi.fn((_: string, cb: (e: { matches: boolean }) => void) => listeners.delete(cb)),
  };
  const matchMedia = vi.fn(() => mql);
  vi.stubGlobal('matchMedia', matchMedia);
  return { mql, listeners, matchMedia };
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test('follows prefers-reduced-motion', () => {
  const { matchMedia } = stubMedia(true);
  const { result } = renderHook(() => useReducedMotion());
  expect(result.current).toBe(true);
  expect(matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
});

test('flips when the setting changes', () => {
  const { listeners } = stubMedia(false);
  const { result } = renderHook(() => useReducedMotion());
  expect(result.current).toBe(false);
  act(() => listeners.forEach((cb) => cb({ matches: true })));
  expect(result.current).toBe(true);
});

test('is false where matchMedia is missing', () => {
  vi.stubGlobal('matchMedia', undefined);
  const { result } = renderHook(() => useReducedMotion());
  expect(result.current).toBe(false);
});

test('stops listening on unmount', () => {
  const { mql, listeners } = stubMedia(false);
  const { unmount } = renderHook(() => useReducedMotion());
  unmount();
  expect(mql.removeEventListener).toHaveBeenCalled();
  expect(listeners.size).toBe(0);
});
