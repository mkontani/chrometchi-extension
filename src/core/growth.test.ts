import { describe, expect, test } from 'vitest';
import { makePet } from './__fixtures__/pet';
import { createEgg } from './factory';
import { stepGrowth } from './growth';
import { createRng } from './rng';

const ctx = () => ({ rng: createRng(1), hour: 12, room: 'home' as const });

describe('stepGrowth', () => {
  test('ages one awake minute', () => {
    const r = stepGrowth(makePet({ awakeMinutes: 40, stageMinutes: 5 }), ctx());
    expect(r.pet.awakeMinutes).toBe(41);
    expect(r.pet.stageMinutes).toBe(6);
    expect(r.events).toEqual([]);
  });

  test('egg hatches into baby_puni after 30 awake minutes', () => {
    const egg = { ...createEgg(), awakeMinutes: 29, stageMinutes: 29 };
    const r = stepGrowth(egg, ctx());
    expect(r.events).toEqual([{ type: 'hatched', to: 'baby_puni' }]);
    expect(r.pet.formId).toBe('baby_puni');
    expect(r.pet.stage).toBe('baby');
    expect(r.pet.stageMinutes).toBe(0);
    expect(r.pet.path).toEqual(['egg', 'baby_puni']);
    expect(r.pet.stats.weight).toBe(5);
    expect(r.pet.stats.mood).toBe(100);
  });

  test('evolution resets stage counters, keeps totalMistakes, adds mood bonus', () => {
    const pet = makePet({
      stageMinutes: 119,
      stats: { mood: 50, weight: 8 },
      history: {
        totalMistakes: 3,
        stageMistakes: 2,
        foodCounts: { grain: 2, meat: 0, fish: 0, veggie: 0, sweet: 1 },
        gameCounts: { catch: 1, cups: 0, stop: 0 },
        roomMinutes: {},
        care: 0,
        morningCare: 0,
      },
    });
    const r = stepGrowth(pet, ctx());
    expect(r.events).toHaveLength(1);
    const [event] = r.events;
    expect(event).toMatchObject({ type: 'evolved', from: 'baby_puni' });
    expect(r.pet.stage).toBe('child');
    expect(r.pet.stageMinutes).toBe(0);
    expect(r.pet.history.stageMistakes).toBe(0);
    expect(r.pet.history.totalMistakes).toBe(3);
    expect(r.pet.history.foodCounts).toEqual({ grain: 0, meat: 0, fish: 0, veggie: 0, sweet: 0 });
    expect(r.pet.history.gameCounts).toEqual({ catch: 0, cups: 0, stop: 0 });
    expect(r.pet.stats.mood).toBe(70);
    expect(r.pet.stats.weight).toBe(10 + 3);
    expect(r.pet.path).toHaveLength(3);
  });

  test('adult departs after 1440 awake minutes in stage', () => {
    const adult = makePet({ formId: 'baby_puni', stage: 'adult', stageMinutes: 1439 });
    const r = stepGrowth(adult, ctx());
    expect(r.pet.lifecycle).toBe('departed');
    expect(r.events).toEqual([{ type: 'departed' }]);
  });

  test('non-alive pets are unchanged', () => {
    const dead = makePet({ lifecycle: 'dead' });
    expect(stepGrowth(dead, ctx())).toEqual({ pet: dead, events: [] });
  });
});

describe('stepGrowth room minutes and care counts', () => {
  test('each awake minute counts toward the current room', () => {
    const first = stepGrowth(makePet(), { ...ctx(), room: 'beach' });
    const second = stepGrowth(first.pet, { ...ctx(), room: 'beach' });
    const third = stepGrowth(second.pet, { ...ctx(), room: 'garden' });
    expect(third.pet.history.roomMinutes).toEqual({ beach: 2, garden: 1 });
  });

  test('the egg counts no room minutes', () => {
    const r = stepGrowth(createEgg(), { ...ctx(), room: 'beach' });
    expect(r.pet.history.roomMinutes).toEqual({});
  });

  test('evolving resets the room minutes and care counts', () => {
    const base = makePet();
    const pet = makePet({
      stageMinutes: 119,
      history: { ...base.history, roomMinutes: { garden: 50 }, care: 12, morningCare: 7 },
    });
    const r = stepGrowth(pet, { ...ctx(), room: 'garden' });
    expect(r.pet.stage).toBe('child');
    expect(r.pet.history).toMatchObject({ roomMinutes: {}, care: 0, morningCare: 0 });
  });
});
