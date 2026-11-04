import { act, renderHook } from '@testing-library/preact';
import { expect, test, vi } from 'vitest';
import type { EngineResponse } from '@/messaging/protocol';
import type { SaveV1 } from '@/storage/schema';
import { useOutings } from './useOutings';

const SAVE = {} as SaveV1;
const ok = (gained?: object): EngineResponse => ({ ok: true, save: SAVE, ...(gained ? { gained } : {}) }) as EngineResponse;

test('finish sends forage with the kind and score and keeps the gained items', async () => {
  const send = vi.fn().mockResolvedValue(ok({ fish: 2 }));
  const { result } = renderHook(() => useOutings(send));
  act(() => result.current.start('fishing'));
  expect(result.current.active).toBe('fishing');
  await act(async () => result.current.finish(70));
  expect(send).toHaveBeenCalledWith({ type: 'forage', kind: 'fishing', score: 70 });
  expect(result.current.active).toBeNull();
  expect(result.current.gained).toEqual({ fish: 2 });
  act(() => result.current.clearGained());
  expect(result.current.gained).toBeNull();
});

test('a refused forage keeps gained null', async () => {
  const send = vi.fn().mockResolvedValue({ ok: true, save: SAVE, outcome: { action: 'forage', result: 'refused', reason: 'asleep' } });
  const { result } = renderHook(() => useOutings(send));
  act(() => result.current.start('hunting'));
  await act(async () => result.current.finish(50));
  expect(result.current.gained).toBeNull();
  expect(result.current.active).toBeNull();
});

test('cancel sends nothing', () => {
  const send = vi.fn();
  const { result } = renderHook(() => useOutings(send));
  act(() => result.current.start('gathering'));
  act(() => result.current.cancel());
  expect(result.current.active).toBeNull();
  expect(send).not.toHaveBeenCalled();
});

test('farm sends the farm action and keeps a harvest gained items', async () => {
  const send = vi.fn().mockResolvedValue(ok({ veggie: 4 }));
  const { result } = renderHook(() => useOutings(send));
  await act(async () => result.current.farm({ op: 'harvest' }));
  expect(send).toHaveBeenCalledWith({ type: 'farm', action: { op: 'harvest' } });
  expect(result.current.gained).toEqual({ veggie: 4 });
});

test('a failed request keeps gained null', async () => {
  const send = vi.fn().mockResolvedValue({ ok: false, error: 'x' });
  const { result } = renderHook(() => useOutings(send));
  await act(async () => result.current.farm({ op: 'water' }));
  expect(result.current.gained).toBeNull();
});

test('a second farm tap while one is pending sends nothing and keeps the haul note', async () => {
  let reply: (r: EngineResponse) => void = () => undefined;
  const send = vi.fn().mockImplementation(() => new Promise<EngineResponse>((r) => (reply = r)));
  const { result } = renderHook(() => useOutings(send));
  let first: void | Promise<void> = undefined;
  act(() => {
    first = result.current.farm({ op: 'harvest' });
    result.current.farm({ op: 'harvest' });
  });
  expect(send).toHaveBeenCalledTimes(1);
  await act(async () => {
    reply(ok({ veggie: 4 }));
    await first;
  });
  expect(result.current.gained).toEqual({ veggie: 4 });
  expect(send).toHaveBeenCalledTimes(1);
});

test('after the reply arrives the next farm tap is sent again', async () => {
  const send = vi.fn().mockResolvedValue(ok());
  const { result } = renderHook(() => useOutings(send));
  await act(async () => result.current.farm({ op: 'water' }));
  await act(async () => result.current.farm({ op: 'water' }));
  expect(send).toHaveBeenCalledTimes(2);
});

test('a refused reply after an ok reply leaves the haul note unchanged', async () => {
  const refused = { ok: true, save: SAVE, outcome: { action: 'farm', result: 'refused', reason: 'farmNotReady' } };
  const send = vi.fn().mockResolvedValueOnce(ok({ veggie: 4 })).mockResolvedValueOnce(refused);
  const { result } = renderHook(() => useOutings(send));
  await act(async () => result.current.farm({ op: 'harvest' }));
  await act(async () => result.current.farm({ op: 'harvest' }));
  expect(result.current.gained).toEqual({ veggie: 4 });
});

test('a second finish while the first is pending sends one forage request', async () => {
  let reply: (r: EngineResponse) => void = () => undefined;
  const send = vi.fn().mockImplementation(() => new Promise<EngineResponse>((r) => (reply = r)));
  const { result } = renderHook(() => useOutings(send));
  act(() => result.current.start('fishing'));
  let first: void | Promise<void> = undefined;
  act(() => {
    first = result.current.finish(60);
    result.current.finish(60);
  });
  expect(send).toHaveBeenCalledTimes(1);
  await act(async () => {
    reply(ok({ fish: 2 }));
    await first;
  });
  expect(result.current.gained).toEqual({ fish: 2 });
});
