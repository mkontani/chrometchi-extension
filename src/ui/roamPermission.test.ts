import { expect, test, vi } from 'vitest';
import { ROAM_ORIGINS } from '@/roam/constants';
import { requestRoamAccess } from './roamPermission';

test('asks for site access on web pages and reports a grant', async () => {
  const request = vi.fn(async () => true);
  expect(await requestRoamAccess({ request })).toBe(true);
  expect(request).toHaveBeenCalledWith({ origins: [...ROAM_ORIGINS] });
});

test('a refusal is false', async () => {
  expect(await requestRoamAccess({ request: async () => false })).toBe(false);
});

test('an error (e.g. no user gesture) is false, not a throw', async () => {
  expect(await requestRoamAccess({ request: async () => Promise.reject(new Error('gesture')) })).toBe(false);
});
