import { describe, expect, test } from 'vitest';
import { createEgg } from './factory';
import { createRng } from './rng';
import { stepMinute } from './step';
import type { PetState } from './types';

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

describe('balance', () => {
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
