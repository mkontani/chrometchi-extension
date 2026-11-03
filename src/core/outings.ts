import { OUTING_YIELDS } from '@/data/outings';
import { dayKey } from './kitchen';
import { addToPantry } from './pantry';
import type {
  CareOutcome,
  Gained,
  Kitchen,
  OutingKind,
  OutingLog,
  PetState,
  RefuseReason,
  Rng,
} from './types';

/** Trips per kind per local day. Never change without asking the owner (spec 4.1). */
export const OUTING_LIMIT = 3;

export interface KitchenResult {
  kitchen: Kitchen;
  gained: Gained;
  outcome: CareOutcome;
}

/** Trips of a kind still allowed today; a log from another day counts as unused. */
export function outingsLeft(log: OutingLog, kind: OutingKind, now: number): number {
  const used = log.day === dayKey(now) ? log.used[kind] : 0;
  return Math.max(0, OUTING_LIMIT - used);
}

/** Items of the main haul: 1 at the worst score, 4 at the best. */
export function forageAmount(score: number): number {
  return 1 + Math.floor((score * 3) / 100);
}

export function rareChance(score: number): number {
  return 0.1 + (0.4 * score) / 100;
}

function refusal(kitchen: Kitchen, reason: RefuseReason): KitchenResult {
  return { kitchen, gained: {}, outcome: { action: 'forage', result: 'refused', reason } };
}

function whyNotNow(pet: PetState): RefuseReason | null {
  if (pet.lifecycle !== 'alive') return 'notAlive';
  if (pet.stage === 'egg') return 'egg';
  if (pet.asleep) return 'asleep';
  return null;
}

function countTrip(log: OutingLog, kind: OutingKind, now: number): OutingLog {
  const today = dayKey(now);
  const used = log.day === today ? log.used : { fishing: 0, hunting: 0, gathering: 0 };
  return { day: today, used: { ...used, [kind]: used[kind] + 1 } };
}

/** A trip's haul goes to the pantry; the pet itself is never touched. */
export function forage(input: {
  pet: PetState;
  kitchen: Kitchen;
  kind: OutingKind;
  score: number;
  now: number;
  rng: Rng;
}): KitchenResult {
  const { pet, kitchen, kind, score, now, rng } = input;
  const reason = whyNotNow(pet);
  if (reason !== null) return refusal(kitchen, reason);
  if (outingsLeft(kitchen.outings, kind, now) <= 0) return refusal(kitchen, 'outingLimit');
  const { main, rare } = OUTING_YIELDS[kind];
  const haul: Gained = { [main]: forageAmount(score) };
  if (rng() < rareChance(score)) haul[rare] = 1;
  const { pantry, added } = addToPantry(kitchen.pantry, haul);
  return {
    kitchen: { ...kitchen, pantry, outings: countTrip(kitchen.outings, kind, now) },
    gained: added,
    outcome: { action: 'forage', result: 'ok' },
  };
}
