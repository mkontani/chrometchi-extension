import { LIGHTS_MISTAKE_MOOD, MISTAKE_AFTER_MIN } from './constants';
import type { GameEvent, PetState, StepResult } from './types';

function applyTransition(pet: PetState, asleepNow: boolean): StepResult {
  if (!pet.asleep && asleepNow) {
    return { pet: { ...pet, asleep: true }, events: [{ type: 'fellAsleep' }] };
  }
  if (pet.asleep && !asleepNow) {
    return {
      pet: {
        ...pet,
        asleep: false,
        lightsOn: true,
        episodes: { ...pet.episodes, lightsOnAsleepMin: 0, lightsMistakeTaken: false },
      },
      events: [{ type: 'wokeUp' }],
    };
  }
  return { pet, events: [] };
}

/** Eggs sleep and wake like everyone else but are never charged a lights mistake. */
function stepLightsEpisode(pet: PetState): StepResult {
  if (pet.stage === 'egg' || !pet.asleep || !pet.lightsOn) return { pet, events: [] };
  const lightsOnAsleepMin = pet.episodes.lightsOnAsleepMin + 1;
  if (lightsOnAsleepMin < MISTAKE_AFTER_MIN || pet.episodes.lightsMistakeTaken) {
    return { pet: { ...pet, episodes: { ...pet.episodes, lightsOnAsleepMin } }, events: [] };
  }
  return {
    pet: {
      ...pet,
      stats: { ...pet.stats, mood: Math.max(0, pet.stats.mood - LIGHTS_MISTAKE_MOOD) },
      episodes: { ...pet.episodes, lightsOnAsleepMin, lightsMistakeTaken: true },
      history: {
        ...pet.history,
        totalMistakes: pet.history.totalMistakes + 1,
        stageMistakes: pet.history.stageMistakes + 1,
      },
    },
    events: [{ type: 'mistake', reason: 'lights' }],
  };
}

/** Called every minute (awake or asleep): sleep transitions and the lights-left-on mistake. */
export function stepSleep(pet: PetState, asleepNow: boolean): StepResult {
  const transition = applyTransition(pet, asleepNow);
  const lights = stepLightsEpisode(transition.pet);
  const events: GameEvent[] = [...transition.events, ...lights.events];
  return { pet: lights.pet, events };
}
