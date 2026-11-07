import { BASE_WEIGHT } from '../constants';
import type { GameState, PetState, Stats } from '../types';

export type PetOverrides = Partial<Omit<PetState, 'stats'>> & { stats?: Partial<Stats> };

export function makePet(overrides: PetOverrides = {}): PetState {
  const { stats, ...rest } = overrides;
  return {
    formId: 'baby_puni',
    stage: 'baby',
    lifecycle: 'alive',
    stats: { hunger: 100, mood: 100, vitality: 100, weight: BASE_WEIGHT.baby, ...stats },
    awakeMinutes: 30,
    stageMinutes: 0,
    poops: 0,
    poopTimers: [],
    sick: false,
    medicineNeeded: 0,
    sugar: 0,
    sugarDecayMin: 0,
    asleep: false,
    lightsOn: true,
    lastPetAt: null,
    criticalSeenAt: null,
    episodes: {
      hungerZeroMin: 0,
      moodZeroMin: 0,
      poopMin: 0,
      lightsOnAsleepMin: 0,
      hungerMistakeTaken: false,
      moodMistakeTaken: false,
      lightsMistakeTaken: false,
    },
    history: {
      totalMistakes: 0,
      stageMistakes: 0,
      foodCounts: { grain: 0, meat: 0, fish: 0, veggie: 0, sweet: 0 },
      gameCounts: { catch: 0, cups: 0, stop: 0 },
      roomMinutes: {},
      care: 0,
      morningCare: 0,
    },
    path: ['egg', 'baby_puni'],
    ...rest,
  };
}

export function makeGame(overrides: Partial<GameState> = {}): GameState {
  return { pet: makePet(), generation: 1, lastTickAt: 0, ...overrides };
}
