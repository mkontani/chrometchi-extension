import { MEDICINE_DOSES, POOP, SUGAR } from './constants';
import type { GameEvent, PetState, StepResult } from './types';

/** Make the pet sick; no-op (same reference, no events) if already sick. */
export function becomeSick(pet: PetState): StepResult {
  if (pet.sick) return { pet, events: [] };
  return {
    pet: { ...pet, sick: true, medicineNeeded: MEDICINE_DOSES },
    events: [{ type: 'sick' }],
  };
}

function stepPoopTimers(pet: PetState): StepResult {
  const remaining: number[] = [];
  let poops = pet.poops;
  const events: GameEvent[] = [];
  for (const t of pet.poopTimers) {
    const next = t - 1;
    if (next > 0) {
      remaining.push(next);
    } else if (poops < POOP.max) {
      poops += 1;
      events.push({ type: 'pooped' });
    }
  }
  return { pet: { ...pet, poops, poopTimers: remaining }, events };
}

function stepPoopEpisode(pet: PetState): StepResult {
  if (pet.poops === 0) {
    return { pet: { ...pet, episodes: { ...pet.episodes, poopMin: 0 } }, events: [] };
  }
  const poopMin = pet.episodes.poopMin + 1;
  if (poopMin < POOP.sickAfterMin) {
    return { pet: { ...pet, episodes: { ...pet.episodes, poopMin } }, events: [] };
  }
  const mistaken: PetState = {
    ...pet,
    episodes: { ...pet.episodes, poopMin: 0 },
    history: {
      ...pet.history,
      totalMistakes: pet.history.totalMistakes + 1,
      stageMistakes: pet.history.stageMistakes + 1,
    },
  };
  const sick = becomeSick(mistaken);
  return { pet: sick.pet, events: [{ type: 'mistake', reason: 'poop' }, ...sick.events] };
}

function stepSugar(pet: PetState): PetState {
  if (pet.sugar === 0) return { ...pet, sugarDecayMin: 0 };
  const min = pet.sugarDecayMin + 1;
  if (min < SUGAR.decayEveryMin) return { ...pet, sugarDecayMin: min };
  return { ...pet, sugar: Math.max(0, pet.sugar - 1), sugarDecayMin: 0 };
}

/** One awake minute of poop timers, poop-neglect tracking and sugar decay. */
export function stepHygiene(pet: PetState): StepResult {
  const timers = stepPoopTimers(pet);
  const episode = stepPoopEpisode(timers.pet);
  return {
    pet: stepSugar(episode.pet),
    events: [...timers.events, ...episode.events],
  };
}
