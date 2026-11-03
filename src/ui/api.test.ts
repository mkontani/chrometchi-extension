import { afterEach, expect, test, vi } from 'vitest';
import { requestEngine } from '@/ui/api';

afterEach(() => vi.restoreAllMocks());

test('requestEngine returns the engine response', async () => {
  const res = { ok: false, error: 'x' };
  vi.spyOn(browser.runtime, 'sendMessage').mockResolvedValue(res as never);
  expect(await requestEngine({ type: 'sync' })).toEqual(res);
});

test('requestEngine converts a rejection into ok:false', async () => {
  vi.spyOn(browser.runtime, 'sendMessage').mockRejectedValue(new Error('boom'));
  expect(await requestEngine({ type: 'sync' })).toEqual({ ok: false, error: 'boom' });
});

test('requestEngine treats a malformed response as no response', async () => {
  vi.spyOn(browser.runtime, 'sendMessage').mockResolvedValue(undefined as never);
  expect(await requestEngine({ type: 'sync' })).toEqual({ ok: false, error: 'no response' });
});
