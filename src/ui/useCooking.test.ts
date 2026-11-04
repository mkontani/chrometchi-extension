import { act, renderHook } from '@testing-library/preact';
import { expect, test, vi } from 'vitest';
import type { EngineResponse } from '@/messaging/protocol';
import type { SaveV1 } from '@/storage/schema';
import { useCooking } from './useCooking';

const SAVE = {} as SaveV1;

test('a second cook while one is pending is ignored', async () => {
  let resolve: (r: EngineResponse) => void = () => undefined;
  const send = vi.fn().mockReturnValue(new Promise<EngineResponse>((r) => { resolve = r; }));
  const { result } = renderHook(() => useCooking(send));
  let first: Promise<void> = Promise.resolve();
  act(() => { first = result.current.cook(['rice']); });
  await act(async () => result.current.cook(['rice', 'egg']));
  expect(send).toHaveBeenCalledTimes(1);
  expect(send).toHaveBeenCalledWith({ type: 'cook', items: ['rice'] });
  await act(async () => { resolve({ ok: true, save: SAVE }); await first; });
  await act(async () => result.current.cook(['egg']));
  expect(send).toHaveBeenCalledTimes(2);
});

test('an ok reply sets cooked; a refused reply leaves it null', async () => {
  const cooked = { dish: 'steak', first: true };
  const send = vi
    .fn()
    .mockResolvedValueOnce({ ok: true, save: SAVE, outcome: { action: 'cook', result: 'refused', reason: 'noStock' } })
    .mockResolvedValueOnce({ ok: true, save: SAVE, cooked });
  const { result } = renderHook(() => useCooking(send));
  await act(async () => result.current.cook(['meat']));
  expect(result.current.cooked).toBeNull();
  await act(async () => result.current.cook(['meat']));
  expect(result.current.cooked).toEqual(cooked);
  act(() => result.current.clearCooked());
  expect(result.current.cooked).toBeNull();
});

test('a failed request leaves cooked null and resets the guard', async () => {
  const send = vi.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValueOnce({ ok: false, error: 'x' });
  const { result } = renderHook(() => useCooking(send));
  await act(async () => { await result.current.cook(['rice']).catch(() => undefined); });
  await act(async () => result.current.cook(['rice']));
  expect(send).toHaveBeenCalledTimes(2);
  expect(result.current.cooked).toBeNull();
});
