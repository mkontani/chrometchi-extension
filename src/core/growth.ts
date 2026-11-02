import { FORMS } from '@/data/forms';
import { BASE_WEIGHT, EVOLVE_MOOD_BONUS, STAGE_MINUTES } from './constants';
import { selectNextForm, type EvolutionContext } from './evolution';
import type { FormDef, PetState, StepResult } from './types';

function evolveTo(pet: PetState, next: FormDef): PetState {
  const excess = Math.max(0, pet.stats.weight - BASE_WEIGHT[pet.stage]);
  return {
    ...pet,
    formId: next.id,
    stage: next.stage,
    stageMinutes: 0,
    path: [...pet.path, next.id],
    stats: {
      ...pet.stats,
      weight: BASE_WEIGHT[next.stage] + excess,
      mood: Math.min(100, pet.stats.mood + EVOLVE_MOOD_BONUS),
    },
    history: {
      ...pet.history,
      stageMistakes: 0,
      foodCounts: { grain: 0, meat: 0, fish: 0, veggie: 0, sweet: 0 },
      gameCounts: { catch: 0, cups: 0, stop: 0 },
    },
  };
}

/** One awake minute of ageing, with hatching, evolution and departure at stage end. */
export function stepGrowth(pet: PetState, ctx: EvolutionContext): StepResult {
  if (pet.lifecycle !== 'alive') return { pet, events: [] };
  const aged: PetState = {
    ...pet,
    awakeMinutes: pet.awakeMinutes + 1,
    stageMinutes: pet.stageMinutes + 1,
  };
  if (aged.stageMinutes < STAGE_MINUTES[aged.stage]) return { pet: aged, events: [] };
  if (aged.stage === 'adult') {
    return { pet: { ...aged, lifecycle: 'departed' }, events: [{ type: 'departed' }] };
  }
  // Selection reads the current stage's counts, so it must run before the transform.
  const next = selectNextForm(aged, FORMS, ctx);
  const event =
    aged.stage === 'egg'
      ? ({ type: 'hatched', to: next.id } as const)
      : ({ type: 'evolved', from: aged.formId, to: next.id } as const);
  return { pet: evolveTo(aged, next), events: [event] };
}
