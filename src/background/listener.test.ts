import { expect, test, vi } from 'vitest';
import { createMessageListener } from './listener';

const POPUP = { id: 'me', url: 'chrome-extension://me/popup.html' };
const PAGE = { id: 'me', url: 'https://a.com/article', tab: { id: 3 } };

test('listener forwards messages from own extension to the engine', async () => {
  const response = { ok: true } as never;
  const handle = vi.fn().mockResolvedValue(response);
  const send = vi.fn();
  const ret = createMessageListener({ handle }, 'me')({ type: 'sync' }, POPUP, send);
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

test('a content script may hide its site', async () => {
  const handle = vi.fn().mockResolvedValue({ ok: true });
  const send = vi.fn();
  createMessageListener({ handle }, 'me')({ type: 'hideRoamSite', host: 'a.com' }, PAGE, send);
  await vi.waitFor(() => expect(send).toHaveBeenCalledWith({ ok: true }));
  expect(handle).toHaveBeenCalledWith({ type: 'hideRoamSite', host: 'a.com' });
});

test.each([{ type: 'restart' }, { type: 'care', action: { kind: 'pet' } }, { type: 'sync' }, 'junk'])(
  'a content script cannot send %j',
  (message) => {
    const handle = vi.fn();
    const send = vi.fn();
    createMessageListener({ handle }, 'me')(message, PAGE, send);
    expect(send).toHaveBeenCalledWith({ ok: false, error: 'forbidden' });
    expect(handle).not.toHaveBeenCalled();
  },
);

test('a sender without a url is not trusted as an extension page', () => {
  const handle = vi.fn();
  const send = vi.fn();
  createMessageListener({ handle }, 'me')({ type: 'restart' }, { id: 'me' }, send);
  expect(send).toHaveBeenCalledWith({ ok: false, error: 'forbidden' });
  expect(handle).not.toHaveBeenCalled();
});

test('onHandled receives each engine response', async () => {
  const response = { ok: true, save: {} } as never;
  const onHandled = vi.fn();
  const send = vi.fn();
  createMessageListener({ handle: vi.fn().mockResolvedValue(response) }, 'me', onHandled)({ type: 'sync' }, POPUP, send);
  await vi.waitFor(() => expect(onHandled).toHaveBeenCalledWith(response));
});
