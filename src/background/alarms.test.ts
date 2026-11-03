import { describe, expect, test, vi } from 'vitest';
import { createTickAlarm, ensureTickAlarm, LEGACY_ALARMS, TICK_ALARM, type AlarmsApi } from './alarms';

function fakeAlarms(existing: string[] = []) {
  const names = new Set(existing);
  const api = {
    get: vi.fn(async (name: string) => (names.has(name) ? { name } : undefined)),
    create: vi.fn(async (name: string) => {
      names.add(name);
    }),
    clear: vi.fn(async (name: string) => names.delete(name)),
  } satisfies AlarmsApi;
  return { api, names };
}

describe('ensureTickAlarm', () => {
  test('creates the 1-minute tick alarm when it is missing', async () => {
    const { api, names } = fakeAlarms();
    await ensureTickAlarm(api);
    expect(api.create).toHaveBeenCalledWith(TICK_ALARM, { periodInMinutes: 1 });
    expect(names.has(TICK_ALARM)).toBe(true);
  });

  test('leaves an existing tick alarm untouched', async () => {
    const { api } = fakeAlarms([TICK_ALARM]);
    await ensureTickAlarm(api);
    expect(api.get).toHaveBeenCalledWith(TICK_ALARM);
    expect(api.create).not.toHaveBeenCalled();
  });

  test("clears v0.0.2's gameLoop alarm", async () => {
    expect(LEGACY_ALARMS).toContain('gameLoop');
    const { api, names } = fakeAlarms(['gameLoop', TICK_ALARM]);
    await ensureTickAlarm(api);
    expect(api.clear).toHaveBeenCalledWith('gameLoop');
    expect(names.has('gameLoop')).toBe(false);
    expect(api.clear).not.toHaveBeenCalledWith(TICK_ALARM);
  });

  test('rejects when the alarms API fails so the caller can report it', async () => {
    const { api } = fakeAlarms();
    api.get.mockRejectedValueOnce(new Error('boom'));
    await expect(ensureTickAlarm(api)).rejects.toThrow('boom');
  });
});

describe('createTickAlarm', () => {
  test('(re)creates the tick alarm unconditionally', async () => {
    const { api } = fakeAlarms([TICK_ALARM]);
    await createTickAlarm(api);
    expect(api.create).toHaveBeenCalledWith(TICK_ALARM, { periodInMinutes: 1 });
  });
});
