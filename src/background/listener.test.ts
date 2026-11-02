import { expect, test, vi } from 'vitest';
import { createMessageListener } from './listener';

test('listener forwards messages from own extension to the engine', async () => {
  const response = { ok: true } as never;
  const handle = vi.fn().mockResolvedValue(response);
  const send = vi.fn();
  const ret = createMessageListener({ handle }, 'me')({ type: 'sync' }, { id: 'me' }, send);
  expect(ret).toBe(true);
  await vi.waitFor(() => expect(send).toHaveBeenCalledWith(response));
  expect(handle).toHaveBeenCalledWith({ type: 'sync' });
});

test('listener rejects foreign senders without calling the engine', () => {
  const handle = vi.fn();
  const send = vi.fn();
  const ret = createMessageListener({ handle }, 'me')({ type: 'sync' }, { id: 'evil' }, send);
  expect(ret).toBe(true);
  expect(send).toHaveBeenCalledWith({ ok: false, error: 'forbidden' });
  expect(handle).not.toHaveBeenCalled();
});
