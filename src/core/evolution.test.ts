import { describe, expect, test, vi } from 'vitest';
import { BASE_WEIGHT } from './constants';
import { dominant, matches, selectNextForm, weightClass } from './evolution';
import { makePet } from './__fixtures__/pet';
import type { PetOverrides } from './__fixtures__/pet';
import { createRng } from './rng';
import { FORMS } from '@/data/forms';
import type { CareHistory, FoodTag, GameId, PetState, Stage } from './types';

const ctx = { rng: () => 0.99, hour: 12 };

function history(over: Partial<CareHistory> = {}): CareHistory {
  return {
    totalMistakes: 0,
    stageMistakes: 0,
    foodCounts: { grain: 0, meat: 0, fish: 0, veggie: 0, sweet: 0 },
    gameCounts: { catch: 0, cups: 0, stop: 0 },
    ...over,
  };
}

function pet(formId: string, stage: Stage, over: PetOverrides = {}): PetState {
  return makePet({
    formId,
    stage,
    ...over,
    stats: { weight: BASE_WEIGHT[stage], ...over.stats },
  });
}

function next(p: PetState, c: { rng: () => number; hour: number } = ctx): string {
  return selectNextForm(p, FORMS, c).id;
}

describe('dominant', () => {
  test('returns the unique maximum key', () => {
    expect(dominant({ a: 1, b: 3, c: 2 })).toBe('b');
  });
  test('tie for the maximum gives undefined', () => {
    expect(dominant({ a: 3, b: 3, c: 1 })).toBeUndefined();
  });
  test('all zeros gives undefined', () => {
    expect(dominant({ a: 0, b: 0 })).toBeUndefined();
  });
});

describe('weightClass', () => {
  const base = BASE_WEIGHT.child;
  const at = (weight: number) => weightClass(pet('child_mochi', 'child', { stats: { weight } }));
  test('boundaries', () => {
    expect(at(base * 0.8)).toBe('light');
    expect(at(base * 0.8 + 0.1)).toBe('normal');
    expect(at(base * 1.5 - 0.1)).toBe('normal');
    expect(at(base * 1.5)).toBe('heavy');
  });
});

describe('matches', () => {
  test('empty condition always matches', () => {
    expect(matches({}, makePet(), ctx)).toBe(true);
  });
  test('rng is not consumed when a non-chance field fails', () => {
    const rng = vi.fn(() => 0.1);
    expect(matches({ minStageMistakes: 1, chance: 0.5 }, makePet(), { rng, hour: 0 })).toBe(false);
    expect(rng).not.toHaveBeenCalled();
  });
  test('rng is consumed once when all other fields match', () => {
    const rng = vi.fn(() => 0.1);
    expect(matches({ chance: 0.5 }, makePet(), { rng, hour: 0 })).toBe(true);
    expect(rng).toHaveBeenCalledTimes(1);
  });
  test('hours is [start, end)', () => {
    const c = { hours: [18, 22] as [number, number] };
    expect(matches(c, makePet(), { ...ctx, hour: 17 })).toBe(false);
    expect(matches(c, makePet(), { ...ctx, hour: 18 })).toBe(true);
    expect(matches(c, makePet(), { ...ctx, hour: 21 })).toBe(true);
    expect(matches(c, makePet(), { ...ctx, hour: 22 })).toBe(false);
  });
  test('dominantFood never matches when undefined', () => {
    expect(matches({ dominantFood: ['meat'] }, makePet(), ctx)).toBe(false);
  });
});

describe('selectNextForm', () => {
  test('baby with 3+ stage mistakes becomes child_kemu', () => {
    const p = pet('baby_puni', 'baby', { history: history({ stageMistakes: 3, totalMistakes: 3 }) });
    expect(next(p)).toBe('child_kemu');
  });
  test('heavy baby becomes child_dango; perfect baby becomes child_hoshi; otherwise child_mochi', () => {
    const heavy = pet('baby_puni', 'baby', {
      stats: { weight: BASE_WEIGHT.baby * 1.5 },
      history: history({ stageMistakes: 1 }),
    });
    expect(next(heavy)).toBe('child_dango');
    expect(next(pet('baby_puni', 'baby'))).toBe('child_hoshi');
    const plain = pet('baby_puni', 'baby', { history: history({ stageMistakes: 1 }) });
    expect(next(plain)).toBe('child_mochi');
  });
  test('meat-dominant child_mochi becomes young_hinoko', () => {
    const p = pet('child_mochi', 'child', {
      history: history({ foodCounts: { grain: 0, meat: 4, fish: 1, veggie: 0, sweet: 0 } }),
    });
    expect(next(p)).toBe('young_hinoko');
  });
  test('tied food counts fall back to young_gear', () => {
    const foodCounts: Record<FoodTag, number> = { grain: 0, meat: 3, fish: 3, veggie: 0, sweet: 0 };
    const p = pet('child_mochi', 'child', { history: history({ foodCounts, stageMistakes: 1 }) });
    expect(next(p)).toBe('young_gear');
  });
  test('young_hinoko with catch-dominant play becomes adult_dragon', () => {
    const gameCounts: Record<GameId, number> = { catch: 4, cups: 1, stop: 0 };
    const p = pet('young_hinoko', 'young', { history: history({ gameCounts, stageMistakes: 1 }) });
    expect(next(p)).toBe('adult_dragon');
  });
  test('phoenix needs 0 stage mistakes AND rng < 0.3', () => {
    const gameCounts: Record<GameId, number> = { catch: 4, cups: 1, stop: 0 };
    const clean = pet('young_hinoko', 'young', { history: history({ gameCounts }) });
    expect(next(clean, { rng: () => 0.1, hour: 12 })).toBe('adult_phoenix');
    expect(next(clean, { rng: () => 0.5, hour: 12 })).toBe('adult_dragon');
    const messy = pet('young_hinoko', 'young', { history: history({ gameCounts, stageMistakes: 1 }) });
    expect(next(messy, { rng: () => 0.1, hour: 12 })).toBe('adult_dragon');
  });
  test('grandpudding needs heavy weight AND rng < 0.3', () => {
    const p = pet('young_poyo', 'young', { stats: { weight: BASE_WEIGHT.young * 1.5 } });
    expect(next(p, { rng: () => 0.1, hour: 12 })).toBe('adult_grandpudding');
    expect(next(p, { rng: () => 0.5, hour: 12 })).toBe('adult_pudding');
  });
  test('vampire only between 18:00 and 22:00', () => {
    const p = pet('young_kage', 'young', { history: history({ stageMistakes: 6, totalMistakes: 6 }) });
    expect(next(p, { rng: () => 0.5, hour: 19 })).toBe('adult_vampire');
    expect(next(p, { rng: () => 0.5, hour: 12 })).not.toBe('adult_vampire');
    expect(next(p, { rng: () => 0.5, hour: 22 })).not.toBe('adult_vampire');
  });
  test('astra needs 0 total mistakes over the whole life AND rng < 0.5', () => {
    const clean = pet('young_kirari', 'young');
    expect(next(clean, { rng: () => 0.4, hour: 12 })).toBe('adult_astra');
    expect(next(clean, { rng: () => 0.6, hour: 12 })).toBe('adult_nexus');
    const past = pet('young_kirari', 'young', { history: history({ totalMistakes: 1 }) });
    expect(next(past, { rng: () => 0.1, hour: 12 })).not.toBe('adult_astra');
  });
  test('kirari needs 0 stage mistakes AND rng < 0.5', () => {
    const perfect = pet('child_hoshi', 'child');
    expect(next(perfect, { rng: () => 0.4, hour: 12 })).toBe('young_kirari');
    expect(next(perfect, { rng: () => 0.6, hour: 12 })).toBe('young_gear');
    const messy = pet('child_hoshi', 'child', { history: history({ stageMistakes: 1 }) });
    expect(next(messy, { rng: () => 0.1, hour: 12 })).not.toBe('young_kirari');
  });
  test('throws when no form matches', () => {
    expect(() => selectNextForm(pet('adult_dragon', 'adult'), FORMS, ctx)).toThrow(
      'no evolution for adult_dragon',
    );
  });
  test('does not mutate the pet', () => {
    const p = pet('baby_puni', 'baby');
    const snapshot = structuredClone(p);
    next(p);
    expect(p).toEqual(snapshot);
  });
});

describe('property: every reachable form always resolves', () => {
  const order: Stage[] = ['egg', 'baby', 'child', 'young', 'adult'];
  const nonAdult = FORMS.filter((f) => f.stage !== 'adult');
  test.each(nonAdult.map((f) => [f.id, f] as const))('%s', (_id, f) => {
    const expectedStage = order[order.indexOf(f.stage) + 1];
    for (let i = 0; i < 200; i++) {
      const rng = createRng(i);
      const int = (max: number) => Math.floor(rng() * (max + 1));
      const stageMistakes = int(10);
      const p = makePet({
        formId: f.id,
        stage: f.stage,
        stats: { weight: BASE_WEIGHT[f.stage] * (1 + rng() * 2) },
        history: {
          stageMistakes,
          totalMistakes: stageMistakes + int(5),
          foodCounts: { grain: int(5), meat: int(5), fish: int(5), veggie: int(5), sweet: int(5) },
          gameCounts: { catch: int(5), cups: int(5), stop: int(5) },
        },
      });
      const result = selectNextForm(p, FORMS, { rng, hour: int(23) });
      expect(result.stage).toBe(expectedStage);
    }
  });
});
