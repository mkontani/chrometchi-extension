import { describe, expect, test } from 'vitest';
import { applyCare } from './care';
import { MEDICINE_DOSES, STAGE_MINUTES } from './constants';
import { createEgg } from './factory';
import { createRng } from './rng';
import { stepMinute } from './step';
import type { CareAction, PetState } from './types';

const CARE_INTERVAL = 120;
const FIRST_CARE = 30;

function careEdit(pet: PetState): PetState {
  return {
    ...pet,
    poops: 0,
    poopTimers: [],
    sick: false,
    stats: {
      ...pet.stats,
      hunger: Math.min(100, pet.stats.hunger + 80),
      mood: Math.min(100, pet.stats.mood + 60),
    },
    episodes: { ...pet.episodes, poopMin: 0 },
  };
}

function simulate(untilAwake: number, cared: boolean): PetState {
  const rng = createRng(1);
  let pet = createEgg();
  while (pet.awakeMinutes < untilAwake && pet.lifecycle === 'alive') {
    pet = stepMinute(pet, { asleep: false, rng, hour: 12 }).pet;
    const due = pet.awakeMinutes >= FIRST_CARE && (pet.awakeMinutes - FIRST_CARE) % CARE_INTERVAL === 0;
    if (cared && due && pet.awakeMinutes < untilAwake) pet = careEdit(pet);
  }
  return pet;
}

/** Spec 4.3's lowest cadence: 3 visits per 8 awake hours. */
const SPARSE_INTERVAL = 160;
const ADULT_AT = 1410;
const MAX_MEALS = 3;
const MAX_GAMES = 2;
const HAPPY_MOOD = 80;

function careOk(pet: PetState, action: CareAction): { pet: PetState; ok: boolean } {
  const r = applyCare(pet, action);
  if (r.outcome.result === 'refused' && r.outcome.reason !== 'full') {
    throw new Error(`unexpected refusal ${r.outcome.reason}`);
  }
  return { pet: r.pet, ok: r.outcome.result === 'ok' };
}

/** One visit made only of player actions: meals until full, games until happy, clean, medicine. */
function visit(start: PetState): PetState {
  let pet = start;
  for (let i = 0; i < MAX_MEALS; i++) {
    const r = careOk(pet, { kind: 'feed', food: 'rice' });
    pet = r.pet;
    if (!r.ok) break;
  }
  for (let i = 0; i < MAX_GAMES && pet.stats.mood < HAPPY_MOOD; i++) {
    pet = careOk(pet, { kind: 'play', game: 'catch', won: true }).pet;
  }
  if (pet.poops > 0) pet = careOk(pet, { kind: 'clean' }).pet;
  for (let i = 0; i < MEDICINE_DOSES && pet.sick; i++) pet = careOk(pet, { kind: 'medicine' }).pet;
  return pet;
}

function simulateSparseCare(untilAwake: number): PetState {
  const rng = createRng(1);
  const hatch = STAGE_MINUTES.egg;
  let pet = createEgg();
  while (pet.awakeMinutes < untilAwake && pet.lifecycle === 'alive') {
    pet = stepMinute(pet, { asleep: false, rng, hour: 12 }).pet;
    const due = pet.awakeMinutes >= hatch && (pet.awakeMinutes - hatch) % SPARSE_INTERVAL === 0;
    if (due && pet.lifecycle === 'alive') pet = visit(pet);
  }
  return pet;
}

describe('balance', () => {
  test('player care every 160 awake minutes raises an adult by 1410 with at most one mistake', () => {
    const pet = simulateSparseCare(ADULT_AT);
    expect(pet.lifecycle).toBe('alive');
    expect(pet.awakeMinutes).toBe(ADULT_AT);
    expect(pet.stage).toBe('adult');
    expect(pet.history.totalMistakes).toBeLessThanOrEqual(1);
  });

  test('the same sparse care keeps the adult well until it departs', () => {
    const pet = simulateSparseCare(ADULT_AT + STAGE_MINUTES.adult);
    expect(pet.lifecycle).toBe('departed');
    expect(pet.history.totalMistakes).toBeLessThanOrEqual(1);
  });

  test('cared-for pet reaches adult at awake minute 1410 with no mistakes', () => {
    const pet = simulate(1410, true);
    expect(pet.awakeMinutes).toBe(1410);
    expect(pet.stage).toBe('adult');
    expect(pet.history.totalMistakes).toBe(0);
    expect(pet.stats.vitality).toBe(100);
  });

  test('neglected pet floors at vitality 1 and is still alive after 2800 awake minutes', () => {
    const pet = simulate(2800, false);
    expect(pet.lifecycle).toBe('alive');
    expect(pet.stats.vitality).toBe(1);
  });
});
