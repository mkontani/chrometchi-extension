import { expect, test, vi } from 'vitest';
import { createBadge } from './badge';

test('badge shows red ! only for critical', async () => {
  const api = { setBadgeText: vi.fn(async () => {}), setBadgeBackgroundColor: vi.fn(async () => {}) };
  const badge = createBadge(api);
  await badge.update('critical');
  expect(api.setBadgeText).toHaveBeenLastCalledWith({ text: '!' });
  expect(api.setBadgeBackgroundColor).toHaveBeenLastCalledWith({ color: '#e53935' });
  api.setBadgeBackgroundColor.mockClear();
  for (const level of ['none', 'notice', 'danger'] as const) {
    await badge.update(level);
    expect(api.setBadgeText).toHaveBeenLastCalledWith({ text: '' });
  }
  expect(api.setBadgeBackgroundColor).not.toHaveBeenCalled();
});
