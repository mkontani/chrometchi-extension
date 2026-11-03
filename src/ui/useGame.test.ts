import { act, renderHook, waitFor } from '@testing-library/preact';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { DEFAULT_SETTINGS } from '@/core/constants';
import { createGame, createZukan } from '@/core/factory';
import { EMPTY_KITCHEN } from '@/core/kitchen';
import type { SaveV1 } from '@/storage/schema';
import { SAVE_KEY } from '@/storage/schema';
import { requestEngine } from '@/ui/api';
import { useGame } from '@/ui/useGame';

vi.mock('@/ui/api', () => ({ requestEngine: vi.fn() }));
const mocked = vi.mocked(requestEngine);

const save: SaveV1 = {
  version: 1,
  game: createGame(1_000),
  zukan: createZukan(),
  kitchen: EMPTY_KITCHEN,
  settings: { ...DEFAULT_SETTINGS },
  meta: { lastNotified: {}, showRenewal: false, showDataReset: false },
};

beforeEach(() => mocked.mockReset());
afterEach(() => vi.useRealTimers());

test('useGame syncs on mount and exposes the save', async () => {
  mocked.mockResolvedValue({ ok: true, save });
  const { result } = renderHook(() => useGame());
  await waitFor(() => expect(result.current.save).toEqual(save));
  expect(mocked).toHaveBeenCalledWith({ type: 'sync' });
  expect(result.current.error).toBeNull();
});

test('useGame surfaces engine errors', async () => {
  mocked.mockResolvedValue({ ok: false, error: 'bad' });
  const { result } = renderHook(() => useGame());
  await waitFor(() => expect(result.current.error).toBe('bad'));
  expect(result.current.save).toBeNull();
});

test('useGame re-syncs every 60 seconds and stops on unmount', async () => {
  vi.useFakeTimers();
  mocked.mockResolvedValue({ ok: true, save });
  const { unmount } = renderHook(() => useGame());
  expect(mocked).toHaveBeenCalledTimes(1);
  await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
  expect(mocked).toHaveBeenCalledTimes(2);
  unmount();
  await vi.advanceTimersByTimeAsync(120_000);
  expect(mocked).toHaveBeenCalledTimes(2);
});

test('useGame applies valid storage changes and ignores invalid ones', async () => {
  mocked.mockResolvedValue({ ok: false, error: 'x' });
  const { result } = renderHook(() => useGame());
  await waitFor(() => expect(result.current.error).toBe('x'));
  await act(async () => {
    await fakeBrowser.storage.local.set({ [SAVE_KEY]: { junk: true } });
  });
  expect(result.current.save).toBeNull();
  await act(async () => {
    await fakeBrowser.storage.local.set({ [SAVE_KEY]: save });
  });
  await waitFor(() => expect(result.current.save).toEqual(save));
});

test('send resolves to the engine response', async () => {
  const outcome = { action: 'clean', result: 'ok' } as const;
  mocked.mockResolvedValue({ ok: true, save, outcome });
  const { result } = renderHook(() => useGame());
  await waitFor(() => expect(result.current.save).toEqual(save));
  let res: unknown;
  await act(async () => {
    res = await result.current.send({ type: 'care', action: { kind: 'clean' } });
  });
  expect(res).toEqual({ ok: true, save, outcome });
  mocked.mockResolvedValue({ ok: false, error: 'bad' });
  await act(async () => {
    res = await result.current.send({ type: 'sync' });
  });
  expect(res).toEqual({ ok: false, error: 'bad' });
});
