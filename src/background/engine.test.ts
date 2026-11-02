import { describe, expect, test } from 'vitest';
import { makeGame, makePet } from '@/core/__fixtures__/pet';
import { createRng } from '@/core/rng';
import type { GameEvent, WarningLevel } from '@/core/types';
import { createFreshSave, createSaveRepository } from '@/storage/repository';
import { createMemoryArea } from '@/storage/__fixtures__/memory-area';
import { SAVE_KEY, type SaveV1 } from '@/storage/schema';
import { createEngine, type Notifier } from './engine';

const T0 = Date.UTC(2026, 0, 1, 12, 0, 0);
const MIN = 60_000;

function setup(seed: Partial<SaveV1['game']> = {}, startAt = T0) {
  const area = createMemoryArea();
  const clock = { now: startAt };
  const fresh = createFreshSave(startAt);
  area.data.set(SAVE_KEY, { ...fresh, game: makeGame({ lastTickAt: startAt, ...seed }) });
  const notifyCalls: GameEvent[][] = [];
  const badgeLevels: WarningLevel[] = [];
  const notifier: Notifier = {
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
    badge: { update: async (l) => void badgeLevels.push(l) },
  });
  const stored = () => area.data.get(SAVE_KEY) as SaveV1;
  return { engine, clock, stored, notifyCalls, badgeLevels };
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
});
