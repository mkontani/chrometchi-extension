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

test('a content script hides the site it runs on, whatever host it names', async () => {
  const handle = vi.fn().mockResolvedValue({ ok: true, save: { secret: 1 } });
  const send = vi.fn();
  createMessageListener({ handle }, 'me')({ type: 'hideRoamSite', host: 'other.com' }, PAGE, send);
  await vi.waitFor(() => expect(send).toHaveBeenCalled());
  expect(handle).toHaveBeenCalledWith({ type: 'hideRoamSite', host: 'a.com' });
});

test('a content script gets no save back', async () => {
  const handle = vi.fn().mockResolvedValue({ ok: true, save: { secret: 1 } });
  const send = vi.fn();
  createMessageListener({ handle }, 'me')({ type: 'hideRoamSite' }, PAGE, send);
  await vi.waitFor(() => expect(send).toHaveBeenCalledWith({ ok: true }));
});

test('a content script on a page without a web host is refused', () => {
  const handle = vi.fn();
  const send = vi.fn();
  createMessageListener({ handle }, 'me')({ type: 'hideRoamSite' }, { id: 'me', url: 'file:///x.html' }, send);
  expect(send).toHaveBeenCalledWith({ ok: false, error: 'forbidden' });
  expect(handle).not.toHaveBeenCalled();
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

test('a content script may fetch roam frames, and gets only the frames', async () => {
  const handle = vi.fn();
  const frames = vi.fn().mockResolvedValue({ ok: true, key: 'k', frames: { walk: [], rest: [], sleep: 's', happy: 'h' } });
  const send = vi.fn();
  createMessageListener({ handle }, 'me', undefined, frames)({ type: 'roamFrames' }, PAGE, send);
  await vi.waitFor(() => expect(send).toHaveBeenCalledWith({ ok: true, key: 'k', frames: { walk: [], rest: [], sleep: 's', happy: 'h' } }));
  expect(handle).not.toHaveBeenCalled();
});

test('roam frames are refused when no loader is wired', () => {
  const send = vi.fn();
  createMessageListener({ handle: vi.fn() }, 'me')({ type: 'roamFrames' }, PAGE, send);
  expect(send).toHaveBeenCalledWith({ ok: false, error: 'forbidden' });
});
