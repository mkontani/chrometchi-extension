import { BASE_WEIGHT } from '@/core/constants';
import type { EvolutionCondition, FormDef, PetState, Rng } from '@/core/types';

export interface EvolutionContext {
  rng: Rng;
  hour: number;
}

const HEAVY_RATIO = 1.5;
const LIGHT_RATIO = 0.8;

/** The key with the unique maximum count; ties or all zeros give undefined. */
export function dominant<K extends string>(counts: Record<K, number>): K | undefined {
  const entries = Object.entries(counts) as [K, number][];
  const max = Math.max(...entries.map(([, n]) => n));
  if (max <= 0) return undefined;
  const top = entries.filter(([, n]) => n === max);
  const [only] = top;
  return top.length === 1 && only ? only[0] : undefined;
}

export function weightClass(pet: PetState): 'light' | 'normal' | 'heavy' {
  const base = BASE_WEIGHT[pet.stage];
  if (pet.stats.weight >= base * HEAVY_RATIO) return 'heavy';
  if (pet.stats.weight <= base * LIGHT_RATIO) return 'light';
  return 'normal';
}

function matchesDeterministic(cond: EvolutionCondition, pet: PetState, hour: number): boolean {
  const { history } = pet;
  const food = dominant(history.foodCounts);
  const checks: boolean[] = [
    cond.minStageMistakes === undefined || history.stageMistakes >= cond.minStageMistakes,
    cond.maxStageMistakes === undefined || history.stageMistakes <= cond.maxStageMistakes,
    cond.maxTotalMistakes === undefined || history.totalMistakes <= cond.maxTotalMistakes,
    cond.dominantFood === undefined || (food !== undefined && cond.dominantFood.includes(food)),
    cond.dominantGame === undefined || dominant(history.gameCounts) === cond.dominantGame,
    cond.weight === undefined || weightClass(pet) === cond.weight,
    cond.hours === undefined || (cond.hours[0] <= hour && hour < cond.hours[1]),
  ];
  return checks.every(Boolean);
}

/** `chance` is evaluated last so the RNG is consumed only when everything else matched. */
export function matches(cond: EvolutionCondition, pet: PetState, ctx: EvolutionContext): boolean {
  if (!matchesDeterministic(cond, pet, ctx.hour)) return false;
  return cond.chance === undefined || ctx.rng() < cond.chance;
}

export function selectNextForm(
  pet: PetState,
  forms: readonly FormDef[],
  ctx: EvolutionContext,
): FormDef {
  const candidates = forms
    .filter((f) => f.from.includes(pet.formId))
    .toSorted((a, b) => b.priority - a.priority);
  const chosen = candidates.find((f) => matches(f.when, pet, ctx));
  if (!chosen) throw new Error(`no evolution for ${pet.formId}`);
  return chosen;
}
