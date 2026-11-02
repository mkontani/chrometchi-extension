import { describe, expect, test } from 'vitest';
import { makePet } from './__fixtures__/pet';
import { stepNeeds } from './needs';
import type { PetState } from './types';

function run(pet: PetState, n: number): PetState {
  let p = pet;
  for (let i = 0; i < n; i++) p = stepNeeds(p).pet;
  return p;
}

describe('stepNeeds', () => {
  test('adult hunger and mood decay by stage rates', () => {
    const r = stepNeeds(makePet({ stage: 'adult' }));
    expect(r.pet.stats.hunger).toBeCloseTo(99.65);
    expect(r.pet.stats.mood).toBeCloseTo(99.7);
    expect(r.events).toEqual([]);
  });

  test('emits hungry once when hunger reaches 0', () => {
    const r1 = stepNeeds(makePet({ stats: { hunger: 0.5 } }));
    expect(r1.pet.stats.hunger).toBe(0);
    expect(r1.events).toContainEqual({ type: 'hungry' });
    const r2 = stepNeeds(r1.pet);
    expect(r2.events).not.toContainEqual({ type: 'hungry' });
  });

  test('emits unhappy once when mood reaches 0', () => {
    const r1 = stepNeeds(makePet({ stats: { mood: 0.5 } }));
    expect(r1.pet.stats.mood).toBe(0);
    expect(r1.events).toContainEqual({ type: 'unhappy' });
    expect(stepNeeds(r1.pet).events).not.toContainEqual({ type: 'unhappy' });
  });

  test('hunger at 0 for 15 minutes is one mistake, not more', () => {
    const start = makePet({ stats: { hunger: 0, mood: 100 } });
    const at14 = run(start, 14);
    expect(at14.history.totalMistakes).toBe(0);
    const r = stepNeeds(at14);
    expect(r.events).toContainEqual({ type: 'mistake', reason: 'hunger' });
    const end = run(r.pet, 15);
    expect(end.history.totalMistakes).toBe(1);
    expect(end.history.stageMistakes).toBe(1);
    expect(end.episodes.hungerMistakeTaken).toBe(true);
  });

  test('mood at 0 for 15 minutes is one mistake', () => {
    const end = run(makePet({ stats: { mood: 0 } }), 30);
    expect(end.history.totalMistakes).toBe(1);
    expect(end.history.stageMistakes).toBe(1);
    expect(end.episodes.moodMistakeTaken).toBe(true);
  });

  test('recovering hunger resets the episode', () => {
    const starved = run(makePet({ stats: { hunger: 0 } }), 20);
    expect(starved.episodes.hungerMistakeTaken).toBe(true);
    const fed = makePet({
      ...starved,
      stats: { ...starved.stats, hunger: 50 },
    });
    const r = stepNeeds(fed).pet;
    expect(r.episodes.hungerZeroMin).toBe(0);
    expect(r.episodes.hungerMistakeTaken).toBe(false);
    expect(r.history.totalMistakes).toBe(1);
  });

  test('egg does not decay', () => {
    const r = stepNeeds(makePet({ stage: 'egg', formId: 'egg' }));
    expect(r.pet.stats.hunger).toBe(100);
    expect(r.pet.stats.mood).toBe(100);
    expect(r.events).toEqual([]);
  });

  test('stats never go below 0', () => {
    const r = run(makePet({ stats: { hunger: 0.1, mood: 0.1 } }), 5);
    expect(r.stats.hunger).toBe(0);
    expect(r.stats.mood).toBe(0);
  });

  test('does not mutate the input pet', () => {
    const pet = makePet({ stats: { hunger: 0.5, mood: 0.2 } });
    const snapshot = structuredClone(pet);
    stepNeeds(pet);
    expect(pet).toEqual(snapshot);
  });
});
