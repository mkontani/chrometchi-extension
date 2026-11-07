import { describe, expect, test } from 'vitest';
import { makeEnv } from './__fixtures__/env';
import { makeGame, makePet } from './__fixtures__/pet';
import { advanceTime } from './advance';
import { DEFAULT_SETTINGS } from './constants';
import { createRng } from './rng';

const base = { settings: DEFAULT_SETTINGS, idle: 'active' as const, rng: createRng(1), env: makeEnv() };
const NOON = Date.UTC(2026, 0, 1, 12, 0, 0);
const NIGHT = Date.UTC(2026, 0, 1, 23, 0, 0);

describe('advanceTime', () => {
  test('steps 2 minutes for 150s elapsed and keeps remainder', () => {
    const game = makeGame({ lastTickAt: NOON });
    const r = advanceTime(game, { ...base, now: NOON + 150_000 });
    expect(r.game.pet.awakeMinutes).toBe(game.pet.awakeMinutes + 2);
    expect(r.game.lastTickAt).toBe(NOON + 120_000);
    expect(game.pet.awakeMinutes).toBe(30);
  });

  test('does nothing while screen is locked but moves lastTickAt', () => {
    const game = makeGame({ lastTickAt: NOON });
    const r = advanceTime(game, { ...base, idle: 'locked', now: NOON + 120_000 });
    expect(r.game.pet).toBe(game.pet);
    expect(r.game.lastTickAt).toBe(NOON + 120_000);
    expect(r.events).toEqual([]);
  });

  test('does nothing for a non-alive pet but moves lastTickAt', () => {
    const game = makeGame({ lastTickAt: NOON, pet: makePet({ lifecycle: 'dead' }) });
    const r = advanceTime(game, { ...base, now: NOON + 120_000 });
    expect(r.game.pet).toBe(game.pet);
    expect(r.game.lastTickAt).toBe(NOON + 120_000);
  });

  test('large gap is skipped without stepping', () => {
    const game = makeGame({ lastTickAt: NOON });
    const r = advanceTime(game, { ...base, now: NOON + 10 * 60_000 });
    expect(r.game.pet.awakeMinutes).toBe(30);
    expect(r.game.lastTickAt).toBe(NOON + 10 * 60_000);
  });

  test('at 23:00 UTC with default settings keeps pet asleep and unchanged stats', () => {
    const game = makeGame({ lastTickAt: NIGHT });
    const r = advanceTime(game, { ...base, now: NIGHT + 120_000 });
    expect(r.game.pet.asleep).toBe(true);
    expect(r.game.pet.stats).toEqual(game.pet.stats);
    expect(r.game.pet.awakeMinutes).toBe(30);
    expect(r.events).toEqual([{ type: 'fellAsleep' }]);
  });

  test('stops stepping once the pet is no longer alive', () => {
    const pet = makePet({
      stats: { hunger: 0, mood: 0, vitality: 0 },
      criticalSeenAt: 0,
      awakeMinutes: 1000,
    });
    const game = makeGame({ lastTickAt: NOON, pet });
    const r = advanceTime(game, { ...base, now: NOON + 180_000 });
    const died = r.events.filter((e) => e.type === 'died').length;
    expect(died).toBeLessThanOrEqual(1);
    if (r.game.pet.lifecycle !== 'alive') {
      expect(r.game.pet.awakeMinutes).toBeLessThanOrEqual(1003);
    }
  });

  test('advanceTime reports the minutes it consumed (0 when locked)', () => {
    const game = makeGame({ lastTickAt: NOON });
    expect(advanceTime(game, { ...base, now: NOON + 150_000 }).minutes).toBe(2);
    expect(advanceTime(game, { ...base, idle: 'locked', now: NOON + 120_000 }).minutes).toBe(0);
    const dead = makeGame({ lastTickAt: NOON, pet: makePet({ lifecycle: 'dead' }) });
    expect(advanceTime(dead, { ...base, now: NOON + 120_000 }).minutes).toBe(0);
    expect(advanceTime(game, { ...base, now: NOON + 10 * 60_000 }).minutes).toBe(0);
  });
});
