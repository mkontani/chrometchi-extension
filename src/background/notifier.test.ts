import { expect, test, vi } from 'vitest';
import { NOTIFY_THROTTLE_MS } from '@/core/constants';
import type { GameEvent, Settings } from '@/core/types';
import { createNotifier } from './notifier';

const settings = { notifications: true } as Settings;
const translate = (k: string) => `T:${k}`;

function setup() {
  const create = vi.fn<(id: string, opts: { message: string }) => Promise<string>>(async () => 'id');
  const notifier = createNotifier({ create }, translate, 'icon.png');
  return { create, notifier };
}

const ctx = (over: Record<string, unknown> = {}) => ({
  settings,
  asleep: false,
  lightsReminder: false,
  now: 1_000_000,
  lastNotified: {},
  ...over,
});

test('notifier sends hungry once per 30 minutes', async () => {
  const { create, notifier } = setup();
  const ev: GameEvent[] = [{ type: 'hungry' }];
  const last = await notifier.notify(ev, ctx());
  expect(create).toHaveBeenCalledTimes(1);
  expect(create).toHaveBeenCalledWith('chrometchi-hungry-1000000', {
    type: 'basic',
    iconUrl: 'icon.png',
    title: 'T:appName',
    message: 'T:notify_hungry',
  });
  expect(last).toEqual({ hungry: 1_000_000 });

  await notifier.notify(ev, ctx({ now: 1_000_000 + NOTIFY_THROTTLE_MS - 1, lastNotified: last }));
  expect(create).toHaveBeenCalledTimes(1);

  const later = 1_000_000 + NOTIFY_THROTTLE_MS;
  const last2 = await notifier.notify(ev, ctx({ now: later, lastNotified: last }));
  expect(create).toHaveBeenCalledTimes(2);
  expect(last2).toEqual({ hungry: later });
});

test('notifier sends nothing when disabled or asleep', async () => {
  const { create, notifier } = setup();
  const last = { sick: 5 };
  const ev: GameEvent[] = [{ type: 'hungry' }];
  expect(
    await notifier.notify(ev, ctx({ settings: { notifications: false }, lastNotified: last })),
  ).toBe(last);
  expect(await notifier.notify(ev, ctx({ asleep: true, lastNotified: last }))).toBe(last);
  expect(create).not.toHaveBeenCalled();
});

test('critical warning maps to critical notification', async () => {
  const { create, notifier } = setup();
  const last = await notifier.notify(
    [
      { type: 'warning', level: 'notice' },
      { type: 'warning', level: 'critical' },
      { type: 'warning', level: 'danger' },
      { type: 'mistake', reason: 'hunger' },
      { type: 'fellAsleep' },
    ],
    ctx(),
  );
  expect(create.mock.calls.map((c) => c[1]?.message)).toEqual([
    'T:notify_critical',
    'T:notify_danger',
  ]);
  expect(Object.keys(last)).toEqual(['critical', 'danger']);
});

test('notifier dedupes kinds within one batch', async () => {
  const { create, notifier } = setup();
  await notifier.notify([{ type: 'pooped' }, { type: 'pooped' }, { type: 'died' }], ctx());
  expect(create).toHaveBeenCalledTimes(2);
});

test('notifier sets timestamps in a new object for each sent kind', async () => {
  const { notifier } = setup();
  const last = { sick: 1 };
  const out = await notifier.notify([{ type: 'hungry' }, { type: 'departed' }], ctx({ lastNotified: last }));
  expect(out).not.toBe(last);
  expect(out).toEqual({ sick: 1, hungry: 1_000_000, departed: 1_000_000 });
  expect(last).toEqual({ sick: 1 });
});

test('notifier lets api errors propagate', async () => {
  const create = vi.fn().mockRejectedValue(new Error('boom'));
  const notifier = createNotifier({ create }, translate, 'i');
  await expect(notifier.notify([{ type: 'hatched', to: 'baby_puni' }], ctx())).rejects.toThrow('boom');
});

test('fellAsleep notifies while asleep when the lights still need turning off', async () => {
  const { create, notifier } = setup();
  const last = await notifier.notify(
    [{ type: 'fellAsleep' }, { type: 'hungry' }],
    ctx({ asleep: true, lightsReminder: true }),
  );
  expect(create.mock.calls.map((c) => c[1]?.message)).toEqual(['T:notify_fellAsleep']);
  expect(last).toEqual({ fellAsleep: 1_000_000 });
});

test('fellAsleep stays silent without a lights reminder or with notifications off', async () => {
  const { create, notifier } = setup();
  const ev: GameEvent[] = [{ type: 'fellAsleep' }];
  await notifier.notify(ev, ctx({ asleep: true, lightsReminder: false }));
  await notifier.notify(
    ev,
    ctx({ asleep: true, lightsReminder: true, settings: { notifications: false } }),
  );
  expect(create).not.toHaveBeenCalled();
});
