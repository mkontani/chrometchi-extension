import { describe, expect, test } from 'vitest';
import { makeGame, makePet } from '@/core/__fixtures__/pet';
import { createRng } from '@/core/rng';
import type { GameEvent, WarningLevel } from '@/core/types';
import { createFreshSave, createSaveRepository } from '@/storage/repository';
import { createMemoryArea } from '@/storage/__fixtures__/memory-area';
import { SAVE_KEY, type SaveV1 } from '@/storage/schema';
import { createEngine, type Badge, type Notifier } from './engine';

const T0 = Date.UTC(2026, 0, 1, 12, 0, 0);
const MIN = 60_000;

interface Overrides {
  notifier?: Notifier;
  badge?: Badge;
}

function setup(seed: Partial<SaveV1['game']> = {}, startAt = T0, over: Overrides = {}) {
  const area = createMemoryArea();
  const clock = { now: startAt };
  const fresh = createFreshSave(startAt);
  area.data.set(SAVE_KEY, { ...fresh, game: makeGame({ lastTickAt: startAt, ...seed }) });
  const notifyCalls: GameEvent[][] = [];
  const badgeLevels: WarningLevel[] = [];
  const errors: Array<[unknown, string]> = [];
  const notifier: Notifier = over.notifier ?? {
    async notify(events, ctx) {
      notifyCalls.push(events);
      return ctx.lastNotified;
    },
  };
  const engine = createEngine({
    repo: createSaveRepository(area, () => clock.now),
    now: () => clock.now,
    rng: createRng(1),
    queryIdle: async () => 'active',
    notifier,
    badge: over.badge ?? { update: async (l) => void badgeLevels.push(l) },
    reportError: (err, context) => void errors.push([err, context]),
  });
  const stored = () => area.data.get(SAVE_KEY) as SaveV1;
  return { engine, clock, stored, area, notifyCalls, badgeLevels, errors };
}

describe('engine', () => {
  test('engine serializes concurrent requests', async () => {
    const { engine, clock, stored } = setup();
    clock.now = T0 + 2 * MIN;
    const [res] = await Promise.all([
      engine.handle({ type: 'care', action: { kind: 'feed', food: 'rice' } }),
      engine.tick(),
    ]);
    expect(res.ok).toBe(true);
    expect(stored().game.pet.history.foodCounts.grain).toBe(1);
    expect(stored().game.lastTickAt).toBeGreaterThan(T0);
  });

  test('care returns outcome and persists', async () => {
    const { engine, stored } = setup({ pet: makePet({ stats: { hunger: 40 } }) });
    const res = await engine.handle({ type: 'care', action: { kind: 'feed', food: 'rice' } });
    expect(res).toMatchObject({ ok: true, outcome: { action: 'feed', result: 'ok' } });
    expect(stored().game.pet.stats.hunger).toBeGreaterThan(40);
  });

  test('a care feed uses the pantry in the save', async () => {
    const { engine, stored, area } = setup({ pet: makePet({ stats: { hunger: 40 } }) });
    const seeded = stored();
    area.data.set(SAVE_KEY, { ...seeded, kitchen: { ...seeded.kitchen, pantry: { fish: 1 } } });
    const first = await engine.handle({ type: 'care', action: { kind: 'feed', food: 'fish' } });
    expect(first).toMatchObject({ ok: true, outcome: { result: 'ok' } });
    expect(stored().kitchen.pantry).toEqual({ fish: 0 });
    const second = await engine.handle({ type: 'care', action: { kind: 'feed', food: 'fish' } });
    expect(second).toMatchObject({ ok: true, outcome: { result: 'refused', reason: 'noStock' } });
  });

  test('forage adds the haul to the pantry and returns gained', async () => {
    const { engine, stored } = setup();
    const res = await engine.handle({ type: 'forage', kind: 'fishing', score: 100 });
    expect(res).toMatchObject({ ok: true, outcome: { action: 'forage', result: 'ok' } });
    if (!res.ok) throw new Error('unreachable');
    expect(res.gained?.fish).toBe(4);
    expect(stored().kitchen.pantry.fish).toBe(4);
    expect(stored().kitchen.outings.used.fishing).toBe(1);
  });

  test('a refused forage returns the outcome and changes nothing', async () => {
    const { engine, stored } = setup({ pet: makePet({ asleep: true }) });
    const before = stored().kitchen;
    const res = await engine.handle({ type: 'forage', kind: 'fishing', score: 50 });
    expect(res).toMatchObject({ ok: true, outcome: { action: 'forage', result: 'refused', reason: 'asleep' } });
    if (!res.ok) throw new Error('unreachable');
    expect(res.gained).toBeUndefined();
    expect(stored().kitchen).toEqual(before);
  });

  test('farm requests return gained on harvest', async () => {
    const { engine, stored, area } = setup();
    const seeded = stored();
    const farm = { crop: 'veggie' as const, growMinLeft: 0, watered: true };
    area.data.set(SAVE_KEY, { ...seeded, kitchen: { ...seeded.kitchen, farm } });
    const res = await engine.handle({ type: 'farm', action: { op: 'harvest' } });
    expect(res).toMatchObject({ ok: true, outcome: { action: 'farm', result: 'ok' } });
    if (!res.ok) throw new Error('unreachable');
    expect(res.gained).toEqual({ veggie: 4 });
    expect(stored().kitchen.pantry.veggie).toBe(4);
    expect(stored().kitchen.farm).toEqual({ crop: null, growMinLeft: 0, watered: false });
  });

  test('plant and water return no gained, and a refusal changes nothing', async () => {
    const { engine, stored } = setup();
    const planted = await engine.handle({ type: 'farm', action: { op: 'plant', crop: 'fruit' } });
    expect(planted).toMatchObject({ ok: true, outcome: { action: 'farm', result: 'ok' } });
    expect(planted).not.toHaveProperty('gained');
    const watered = await engine.handle({ type: 'farm', action: { op: 'water' } });
    expect(watered).not.toHaveProperty('gained');
    const before = stored().kitchen;
    const early = await engine.handle({ type: 'farm', action: { op: 'harvest' } });
    expect(early).toMatchObject({ outcome: { result: 'refused', reason: 'farmNotReady' } });
    expect(early).not.toHaveProperty('gained');
    expect(stored().kitchen).toEqual(before);
  });

  test('a tick grows the farm by game minutes only', async () => {
    const { engine, stored, area, clock } = setup();
    const seeded = stored();
    const farm = { crop: 'veggie' as const, growMinLeft: 100, watered: false };
    area.data.set(SAVE_KEY, { ...seeded, kitchen: { ...seeded.kitchen, farm } });
    clock.now = T0 + 3 * MIN;
    await engine.tick();
    expect(stored().kitchen.farm.growMinLeft).toBe(97);
    clock.now = T0 + 3 * MIN + 60 * MIN;
    await engine.tick();
    expect(stored().kitchen.farm.growMinLeft).toBe(97);
  });

  test('a harvest request sees the field grown by the elapsed minutes', async () => {
    const { engine, stored, area, clock } = setup();
    const seeded = stored();
    const farm = { crop: 'fruit' as const, growMinLeft: 2, watered: false };
    area.data.set(SAVE_KEY, { ...seeded, kitchen: { ...seeded.kitchen, farm } });
    clock.now = T0 + 2 * MIN;
    const res = await engine.handle({ type: 'farm', action: { op: 'harvest' } });
    expect(res).toMatchObject({ ok: true, gained: { fruit: 2 } });
  });

  test('ackCritical stamps criticalSeenAt', async () => {
    const { engine, stored } = setup({ pet: makePet({ stats: { vitality: 10 } }) });
    const res = await engine.handle({ type: 'ackCritical' });
    expect(res.ok).toBe(true);
    expect(stored().game.pet.criticalSeenAt).toBe(stored().game.pet.awakeMinutes);
  });

  test('evolution event unlocks zukan entry', async () => {
    const egg = makePet({ formId: 'egg', stage: 'egg', awakeMinutes: 29, stageMinutes: 29, path: ['egg'] });
    const { engine, clock, stored } = setup({ pet: egg });
    clock.now = T0 + MIN;
    await engine.tick();
    expect(stored().zukan.discovered).toContain('baby_puni');
  });

  test('death records a memory and startNewEgg begins generation+1', async () => {
    const dying = makePet({
      stats: { hunger: 0, vitality: 0.5 },
      awakeMinutes: 100,
      criticalSeenAt: 20,
    });
    const { engine, clock, stored } = setup({ pet: dying });
    clock.now = T0 + MIN;
    await engine.tick();
    expect(stored().game.pet.lifecycle).toBe('dead');
    expect(stored().zukan.memories).toHaveLength(1);
    const res = await engine.handle({ type: 'startNewEgg' });
    expect(res.ok).toBe(true);
    expect(stored().game.generation).toBe(2);
    expect(stored().game.pet.lifecycle).toBe('alive');
    expect(stored().zukan.memories).toHaveLength(1);
  });

  test('startNewEgg is refused while pet is alive', async () => {
    const { engine, stored } = setup();
    const before = stored();
    expect(await engine.handle({ type: 'startNewEgg' })).toEqual({
      ok: false,
      error: 'pet is alive',
    });
    expect(stored()).toBe(before);
  });

  test('restart begins next generation without a memory', async () => {
    const { engine, stored } = setup();
    const res = await engine.handle({ type: 'restart' });
    expect(res.ok).toBe(true);
    expect(stored().game.generation).toBe(2);
    expect(stored().zukan.memories).toHaveLength(0);
  });

  test('a new egg (restart) keeps the kitchen', async () => {
    const { engine, stored, area } = setup();
    const kitchen = {
      pantry: { fish: 4 },
      outings: { day: '2026-01-01', used: { fishing: 2, hunting: 0, gathering: 1 } },
      farm: { crop: 'veggie' as const, growMinLeft: 5, watered: true },
      recipes: ['steak' as const],
    };
    area.data.set(SAVE_KEY, { ...stored(), kitchen });
    await engine.handle({ type: 'restart' });
    expect(stored().game.generation).toBe(2);
    expect(stored().kitchen).toEqual(kitchen);
  });

  test('dismissNotice clears the flag', async () => {
    const { engine, stored } = setup();
    stored().meta.showRenewal = true;
    stored().meta.showDataReset = true;
    await engine.handle({ type: 'dismissNotice', notice: 'renewal' });
    expect(stored().meta).toMatchObject({ showRenewal: false, showDataReset: true });
    await engine.handle({ type: 'dismissNotice', notice: 'dataReset' });
    expect(stored().meta.showDataReset).toBe(false);
  });

  test('updateSettings merges a valid patch', async () => {
    const { engine, stored } = setup();
    await engine.handle({ type: 'updateSettings', patch: { sound: false } });
    expect(stored().settings.sound).toBe(false);
  });

  test('updateSettings keeps roam fields the patch leaves out', async () => {
    const { engine, stored } = setup();
    await engine.handle({ type: 'updateSettings', patch: { roam: true, roamHiddenSites: ['a.com'] } });
    await engine.handle({ type: 'updateSettings', patch: { sound: true } });
    expect(stored().settings).toMatchObject({ sound: true, roam: true, roamHiddenSites: ['a.com'] });
  });

  test('hideRoamSite adds the host once', async () => {
    const { engine, stored } = setup();
    await engine.handle({ type: 'hideRoamSite', host: 'a.com' });
    await engine.handle({ type: 'hideRoamSite', host: 'a.com' });
    expect(stored().settings.roamHiddenSites).toEqual(['a.com']);
  });

  test('invalid settings patch is rejected and save unchanged', async () => {
    const { engine, stored } = setup();
    const before = stored();
    const res = await engine.handle({
      type: 'updateSettings',
      patch: { sleepStartMin: 5000 },
    });
    expect(res.ok).toBe(false);
    expect(stored()).toBe(before);
  });

  test('invalid request is rejected without touching storage', async () => {
    const { engine, stored, badgeLevels } = setup();
    const before = stored();
    expect(await engine.handle({ type: 'bogus' })).toEqual({
      ok: false,
      error: 'invalid request',
    });
    expect(stored()).toBe(before);
    expect(badgeLevels).toEqual([]);
  });

  test('badge is updated with the current warning level after every operation', async () => {
    const { engine, badgeLevels } = setup({ pet: makePet({ stats: { vitality: 10 } }) });
    await engine.tick();
    await engine.handle({ type: 'sync' });
    expect(badgeLevels).toEqual(['critical', 'critical']);
  });

  test('badge gets none for a dead pet', async () => {
    const { engine, badgeLevels } = setup({ pet: makePet({ lifecycle: 'dead' }) });
    await engine.tick();
    expect(badgeLevels).toEqual(['none']);
  });

  test('notifier receives advance and mutation events and result is stored', async () => {
    const { engine, notifyCalls } = setup();
    await engine.handle({ type: 'care', action: { kind: 'pet' } });
    expect(notifyCalls).toHaveLength(1);
  });

  const dyingPet = () =>
    makePet({ stats: { hunger: 0, vitality: 0.5 }, awakeMinutes: 100, criticalSeenAt: 20 });
  const hatchingEgg = () =>
    makePet({ formId: 'egg', stage: 'egg', awakeMinutes: 29, stageMinutes: 29, path: ['egg'] });

  test('notifier failure is reported, state still saved, lastNotified kept', async () => {
    const boom = new Error('notify down');
    const { engine, clock, stored, errors } = setup({ pet: hatchingEgg() }, T0, {
      notifier: {
        async notify() {
          throw boom;
        },
      },
    });
    clock.now = T0 + MIN;
    const res = await engine.handle({ type: 'sync' });
    expect(res.ok).toBe(true);
    expect(stored().game.pet.formId).toBe('baby_puni');
    expect(stored().meta.lastNotified).toEqual({});
    expect(errors).toEqual([[boom, 'notify']]);
  });

  test('badge failure is reported but save and response are ok', async () => {
    const boom = new Error('badge down');
    const { engine, clock, stored, errors } = setup({ pet: hatchingEgg() }, T0, {
      badge: {
        async update() {
          throw boom;
        },
      },
    });
    clock.now = T0 + MIN;
    const res = await engine.handle({ type: 'sync' });
    expect(res.ok).toBe(true);
    expect(stored().game.pet.formId).toBe('baby_puni');
    expect(errors).toEqual([[boom, 'badge']]);
  });

  test('notify gets advance + care events and its lastNotified is stored', async () => {
    const seen: GameEvent[][] = [];
    const { engine, clock, stored } = setup({ pet: hatchingEgg() }, T0, {
      notifier: {
        async notify(events) {
          seen.push(events);
          return { hatched: 123 };
        },
      },
    });
    clock.now = T0 + MIN;
    await engine.handle({ type: 'care', action: { kind: 'lights', on: false } });
    expect(seen[0]).toContainEqual({ type: 'hatched', to: 'baby_puni' });
    expect(stored().meta.lastNotified).toEqual({ hatched: 123 });
  });

  test.each([
    ['baby', true, true],
    ['baby', false, false],
    ['egg', true, false],
  ] as const)('falling asleep as %s with lightsOn=%s passes lightsReminder=%s', async (stage, lightsOn, expected) => {
    const bedtime = Date.UTC(2026, 0, 1, 21, 59, 0);
    const pet = makePet({ stage, lightsOn, formId: stage === 'egg' ? 'egg' : 'baby_puni' });
    const seen: Array<{ events: GameEvent[]; lightsReminder: boolean }> = [];
    const { engine, clock } = setup({ pet }, bedtime, {
      notifier: {
        async notify(events, ctx) {
          seen.push({ events, lightsReminder: ctx.lightsReminder });
          return ctx.lastNotified;
        },
      },
    });
    clock.now = bedtime + MIN;
    await engine.handle({ type: 'sync' });
    expect(seen[0]?.events).toContainEqual({ type: 'fellAsleep' });
    expect(seen[0]?.lightsReminder).toBe(expected);
  });

  test.each(['restart', 'startNewEgg'] as const)(
    'death during advance of %s records the memory',
    async (type) => {
      const { engine, clock, stored } = setup({ pet: dyingPet() });
      clock.now = T0 + MIN;
      const res = await engine.handle({ type });
      expect(res.ok).toBe(true);
      expect(stored().game.generation).toBe(2);
      expect(stored().zukan.memories).toHaveLength(1);
      expect(stored().zukan.memories[0]?.generation).toBe(1);
    },
  );
});
