import { describe, expect, test } from 'vitest';
import { makePet } from './__fixtures__/pet';
import { EMPTY_KITCHEN } from './kitchen';
import { forage, forageAmount, outingsLeft, OUTING_LIMIT, rareChance } from './outings';
import { createRng } from './rng';
import type { Kitchen, OutingKind } from './types';

const NOW = new Date(2026, 10, 4, 12, 0).getTime();
const TOMORROW = new Date(2026, 10, 5, 9, 0).getTime();
const pet = makePet();

function go(kitchen: Kitchen, kind: OutingKind, score: number, rng: () => number, now = NOW, p = pet) {
  return forage({ pet: p, kitchen, kind, score, now, rng });
}

describe('forage amounts', () => {
  test('forageAmount maps 0, 33, 34, 66, 67, 100 to 1, 1, 2, 2, 3, 4', () => {
    expect([0, 33, 34, 66, 67, 100].map(forageAmount)).toEqual([1, 1, 2, 2, 3, 4]);
  });

  test('rareChance grows with the score', () => {
    expect(rareChance(0)).toBeCloseTo(0.1);
    expect(rareChance(100)).toBeCloseTo(0.5);
  });
});

describe('forage', () => {
  test('a trip at score 0 still brings at least one main item', () => {
    const r = go(EMPTY_KITCHEN, 'fishing', 0, () => 0.99);
    expect(r.gained).toEqual({ fish: 1 });
    expect(r.kitchen.pantry).toEqual({ fish: 1 });
    expect(r.outcome).toEqual({ action: 'forage', result: 'ok' });
  });

  test('a rare item comes when rng is below rareChance', () => {
    expect(go(EMPTY_KITCHEN, 'hunting', 0, () => 0.05).gained).toEqual({ meat: 1, egg: 1 });
    expect(go(EMPTY_KITCHEN, 'hunting', 0, () => 0.2).gained).toEqual({ meat: 1 });
    expect(go(EMPTY_KITCHEN, 'gathering', 100, () => 0.2).gained).toEqual({ nuts: 4, mushroom: 1 });
  });

  test('works with a seeded rng', () => {
    const r = go(EMPTY_KITCHEN, 'gathering', 50, createRng(3));
    expect(r.gained.nuts).toBe(2);
  });

  test('each kind allows 3 trips a day, then refuses with outingLimit', () => {
    let k = EMPTY_KITCHEN;
    for (let i = 0; i < OUTING_LIMIT; i++) k = go(k, 'fishing', 50, () => 0.9).kitchen;
    expect(outingsLeft(k.outings, 'fishing', NOW)).toBe(0);
    expect(outingsLeft(k.outings, 'hunting', NOW)).toBe(3);
    const r = go(k, 'fishing', 50, () => 0.9);
    expect(r.outcome).toEqual({ action: 'forage', result: 'refused', reason: 'outingLimit' });
    expect(r.kitchen).toBe(k);
    expect(r.gained).toEqual({});
    expect(go(k, 'hunting', 50, () => 0.9).outcome.result).toBe('ok');
  });

  test('a new local day resets the outing counts', () => {
    let k = EMPTY_KITCHEN;
    for (let i = 0; i < OUTING_LIMIT; i++) k = go(k, 'fishing', 50, () => 0.9).kitchen;
    expect(outingsLeft(k.outings, 'fishing', TOMORROW)).toBe(3);
    const r = go(k, 'fishing', 50, () => 0.9, TOMORROW);
    expect(r.outcome.result).toBe('ok');
    expect(r.kitchen.outings).toEqual({
      day: '2026-11-05',
      used: { fishing: 1, hunting: 0, gathering: 0 },
    });
  });

  test('forage at a full pantry counts the trip and gains nothing', () => {
    const full: Kitchen = { ...EMPTY_KITCHEN, pantry: { fish: 99, shrimp: 99 } };
    const r = go(full, 'fishing', 100, () => 0);
    expect(r.gained).toEqual({});
    expect(r.outcome.result).toBe('ok');
    expect(r.kitchen.pantry).toEqual({ fish: 99, shrimp: 99 });
    expect(r.kitchen.outings.used.fishing).toBe(1);
  });

  test('egg, sleeping and departed pets are refused (egg, asleep, notAlive)', () => {
    const reason = (p: typeof pet) => go(EMPTY_KITCHEN, 'fishing', 50, () => 0.9, NOW, p).outcome.reason;
    expect(reason(makePet({ stage: 'egg' }))).toBe('egg');
    expect(reason(makePet({ asleep: true }))).toBe('asleep');
    expect(reason(makePet({ lifecycle: 'departed' }))).toBe('notAlive');
    const r = go(EMPTY_KITCHEN, 'fishing', 50, () => 0.9, NOW, makePet({ asleep: true }));
    expect(r.kitchen).toBe(EMPTY_KITCHEN);
  });

  test('a sick pet may go out', () => {
    const r = go(EMPTY_KITCHEN, 'fishing', 50, () => 0.9, NOW, makePet({ sick: true }));
    expect(r.outcome.result).toBe('ok');
  });

  test('the pet itself is unchanged by a trip', () => {
    const before = structuredClone(pet);
    go(EMPTY_KITCHEN, 'fishing', 100, () => 0);
    expect(pet).toEqual(before);
  });
});
