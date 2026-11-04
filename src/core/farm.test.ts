import { describe, expect, test } from 'vitest';
import { makePet } from './__fixtures__/pet';
import { farmAction, FARM, growFarm } from './farm';
import { EMPTY_KITCHEN } from './kitchen';
import type { Farm, Kitchen } from './types';

const pet = makePet();
const withFarm = (farm: Farm): Kitchen => ({ ...EMPTY_KITCHEN, farm });
const growing: Farm = { crop: 'veggie', growMinLeft: 100, watered: false };
const ready: Farm = { crop: 'fruit', growMinLeft: 0, watered: false };

describe('planting', () => {
  test('planting starts a 240-minute crop', () => {
    const r = farmAction({ pet, kitchen: EMPTY_KITCHEN, action: { op: 'plant', crop: 'veggie' } });
    expect(FARM.growMin).toBe(240);
    expect(r.kitchen.farm).toEqual({ crop: 'veggie', growMinLeft: 240, watered: false });
    expect(r.gained).toEqual({});
    expect(r.outcome).toEqual({ action: 'farm', result: 'ok' });
  });

  test('planting on a busy field is refused with farmNotReady', () => {
    const kitchen = withFarm(growing);
    const r = farmAction({ pet, kitchen, action: { op: 'plant', crop: 'fruit' } });
    expect(r.kitchen).toBe(kitchen);
    expect(r.outcome).toEqual({ action: 'farm', result: 'refused', reason: 'farmNotReady' });
  });
});

describe('growFarm', () => {
  test('the crop grows by the minutes given and stops at 0', () => {
    expect(growFarm(growing, 30).growMinLeft).toBe(70);
    expect(growFarm(growing, 500).growMinLeft).toBe(0);
    expect(growFarm(growing, 500).crop).toBe('veggie');
  });

  test('no crop or no minutes returns the same object', () => {
    expect(growFarm(EMPTY_KITCHEN.farm, 10)).toBe(EMPTY_KITCHEN.farm);
    expect(growFarm(growing, 0)).toBe(growing);
    expect(growFarm(growing, -5)).toBe(growing);
  });
});

describe('watering', () => {
  test('watering works once while growing', () => {
    const first = farmAction({ pet, kitchen: withFarm(growing), action: { op: 'water' } });
    expect(first.kitchen.farm).toEqual({ ...growing, watered: true });
    expect(first.gained).toEqual({});
    expect(first.outcome).toEqual({ action: 'farm', result: 'ok' });
    const second = farmAction({ pet, kitchen: first.kitchen, action: { op: 'water' } });
    expect(second.kitchen).toBe(first.kitchen);
    expect(second.outcome.reason).toBe('farmNotReady');
  });

  test('watering an empty or ripe field is refused', () => {
    for (const farm of [EMPTY_KITCHEN.farm, ready]) {
      const r = farmAction({ pet, kitchen: withFarm(farm), action: { op: 'water' } });
      expect(r.outcome.reason).toBe('farmNotReady');
    }
  });
});

describe('harvest', () => {
  test('harvest gives 2, or 4 when watered, and empties the field', () => {
    const dry = farmAction({ pet, kitchen: withFarm(ready), action: { op: 'harvest' } });
    expect(dry.gained).toEqual({ fruit: 2 });
    expect(dry.kitchen.pantry).toEqual({ fruit: 2 });
    expect(dry.kitchen.farm).toEqual({ crop: null, growMinLeft: 0, watered: false });
    expect(dry.outcome).toEqual({ action: 'farm', result: 'ok' });
    const wet = farmAction({ pet, kitchen: withFarm({ ...ready, watered: true }), action: { op: 'harvest' } });
    expect(wet.gained).toEqual({ fruit: 4 });
  });

  test('harvest reports only what the pantry could take', () => {
    const kitchen: Kitchen = { ...withFarm({ ...ready, watered: true }), pantry: { fruit: 98 } };
    const r = farmAction({ pet, kitchen, action: { op: 'harvest' } });
    expect(r.gained).toEqual({ fruit: 1 });
    expect(r.kitchen.pantry.fruit).toBe(99);
  });

  test('harvest before ready is refused', () => {
    for (const farm of [growing, EMPTY_KITCHEN.farm]) {
      const kitchen = withFarm(farm);
      const r = farmAction({ pet, kitchen, action: { op: 'harvest' } });
      expect(r.kitchen).toBe(kitchen);
      expect(r.outcome).toEqual({ action: 'farm', result: 'refused', reason: 'farmNotReady' });
    }
  });
});

describe('who can work the farm', () => {
  test('egg, asleep and notAlive are refused', () => {
    const kitchen = withFarm(ready);
    const cases = [
      [makePet({ stage: 'egg' }), 'egg'],
      [makePet({ asleep: true }), 'asleep'],
      [makePet({ lifecycle: 'dead' }), 'notAlive'],
    ] as const;
    for (const [p, reason] of cases) {
      const r = farmAction({ pet: p, kitchen, action: { op: 'harvest' } });
      expect(r.kitchen).toBe(kitchen);
      expect(r.outcome).toEqual({ action: 'farm', result: 'refused', reason });
    }
  });
});
