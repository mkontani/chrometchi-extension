import { FOODS } from '@/data/foods';
import { BASE_WEIGHT, PET_ACTION, PLAY, POOP, SUGAR } from './constants';
import { becomeSick } from './hygiene';
import type {
  CareAction,
  CareOutcome,
  CareResult,
  FoodDef,
  GameEvent,
  PetState,
  RefuseReason,
  Stats,
} from './types';

const clamp = (v: number): number => Math.min(100, Math.max(0, v));

function refuse(pet: PetState, action: CareAction, reason: RefuseReason): CareResult {
  return { pet, events: [], outcome: { action: action.kind, result: 'refused', reason } };
}

function ok(pet: PetState, action: CareAction, events: GameEvent[] = []): CareResult {
  return { pet, events, outcome: { action: action.kind, result: 'ok' } };
}

function withStats(pet: PetState, patch: Partial<Stats>): PetState {
  return { ...pet, stats: { ...pet.stats, ...patch } };
}

function eat(pet: PetState, def: FoodDef): { pet: PetState; events: GameEvent[] } {
  const fed: PetState = {
    ...withStats(pet, {
      hunger: clamp(pet.stats.hunger + def.hunger),
      mood: clamp(pet.stats.mood + def.mood),
      vitality: clamp(pet.stats.vitality + def.vitality),
      weight: Math.max(1, pet.stats.weight + def.weight),
    }),
    history: {
      ...pet.history,
      foodCounts: { ...pet.history.foodCounts, [def.tag]: pet.history.foodCounts[def.tag] + 1 },
    },
  };
  if (def.kind === 'meal') return { pet: { ...fed, poopTimers: [...fed.poopTimers, POOP.delayMin] }, events: [] };
  const sugared = { ...fed, sugar: fed.sugar + 1 };
  if (sugared.sugar < SUGAR.sickAt) return { pet: sugared, events: [] };
  const sick = becomeSick(sugared);
  return { pet: { ...sick.pet, sugar: 0 }, events: sick.events };
}

function feed(pet: PetState, action: Extract<CareAction, { kind: 'feed' }>): CareResult {
  const def = FOODS.find((f) => f.id === action.food);
  if (!def) throw new Error(`Unknown food: ${action.food}`);
  if (pet.asleep) return refuse(pet, action, 'asleep');
  if (def.kind === 'meal' && pet.stats.hunger >= 100) return refuse(pet, action, 'full');
  const r = eat(pet, def);
  return ok(r.pet, action, r.events);
}

function play(pet: PetState, action: Extract<CareAction, { kind: 'play' }>): CareResult {
  if (pet.asleep) return refuse(pet, action, 'asleep');
  const gain = action.won ? PLAY.winMood : PLAY.loseMood;
  const next: PetState = {
    ...withStats(pet, {
      mood: clamp(pet.stats.mood + gain),
      weight: Math.max(BASE_WEIGHT[pet.stage] * 0.5, pet.stats.weight - PLAY.weightLoss),
    }),
    history: {
      ...pet.history,
      gameCounts: { ...pet.history.gameCounts, [action.game]: pet.history.gameCounts[action.game] + 1 },
    },
  };
  return ok(next, action);
}

function clean(pet: PetState, action: CareAction): CareResult {
  if (pet.poops === 0) return refuse(pet, action, 'noPoop');
  return ok({ ...pet, poops: 0, episodes: { ...pet.episodes, poopMin: 0 } }, action);
}

function medicine(pet: PetState, action: CareAction): CareResult {
  if (!pet.sick) return refuse(pet, action, 'notSick');
  const needed = Math.max(0, pet.medicineNeeded - 1);
  return ok({ ...pet, medicineNeeded: needed, sick: needed > 0 }, action);
}

/** Lights can always be turned on; turning them off is only for a sleeping pet (or egg). */
function lights(pet: PetState, action: Extract<CareAction, { kind: 'lights' }>): CareResult {
  if (!action.on && !pet.asleep) return refuse(pet, action, 'awake');
  return ok({ ...pet, lightsOn: action.on }, action);
}

function pat(pet: PetState, action: CareAction): CareResult {
  if (pet.asleep) return refuse(pet, action, 'asleep');
  if (pet.lastPetAt !== null && pet.awakeMinutes - pet.lastPetAt < PET_ACTION.cooldownMin) {
    return refuse(pet, action, 'cooldown');
  }
  const next = withStats(pet, { mood: clamp(pet.stats.mood + PET_ACTION.mood) });
  return ok({ ...next, lastPetAt: pet.awakeMinutes }, action);
}

/** The care that counts: it rescues a critical pet and goes into the stage's care history. */
export const CARE_KINDS: ReadonlySet<CareOutcome['action']> = new Set(['feed', 'play', 'clean', 'medicine']);

/** Real care re-arms the death grace: dying again needs a fresh critical-banner view (spec 4.4). */
function rearmGrace(r: CareResult): CareResult {
  const rescued = r.outcome.result === 'ok' && CARE_KINDS.has(r.outcome.action);
  if (!rescued || r.pet.criticalSeenAt === null) return r;
  return { ...r, pet: { ...r.pet, criticalSeenAt: null } };
}

function dispatch(pet: PetState, action: CareAction): CareResult {
  switch (action.kind) {
    case 'feed':
      return feed(pet, action);
    case 'play':
      return play(pet, action);
    case 'clean':
      return clean(pet, action);
    case 'medicine':
      return medicine(pet, action);
    case 'lights':
      return lights(pet, action);
    case 'pet':
      return pat(pet, action);
  }
}

export function applyCare(pet: PetState, action: CareAction): CareResult {
  if (pet.lifecycle !== 'alive') return refuse(pet, action, 'notAlive');
  if (pet.stage === 'egg' && action.kind !== 'lights') return refuse(pet, action, 'egg');
  return rearmGrace(dispatch(pet, action));
}
