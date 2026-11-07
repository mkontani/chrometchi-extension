import { BASE_WEIGHT } from '@/core/constants';
import { decorDef } from '@/data/decor';
import { accessoryDef } from '@/data/accessories';
import { grownRoom } from '@/core/care-count';
import { uniqueTop } from '@/core/tally';
import type { DecorKind, EvolutionCondition, EvolutionEnv, FormDef, PetState, Rng } from '@/core/types';

export interface EvolutionContext {
  rng: Rng;
  hour: number;
  env: EvolutionEnv;
}

const HEAVY_RATIO = 1.5;
const LIGHT_RATIO = 0.8;
const MIN_CARE = 10;

/** The key with the unique maximum count; ties or all zeros give undefined. */
export function dominant<K extends string>(counts: Record<K, number>): K | undefined {
  return uniqueTop(counts);
}

export function weightClass(pet: PetState): 'light' | 'normal' | 'heavy' {
  const base = BASE_WEIGHT[pet.stage];
  if (pet.stats.weight >= base * HEAVY_RATIO) return 'heavy';
  if (pet.stats.weight <= base * LIGHT_RATIO) return 'light';
  return 'normal';
}

/** The unique most common non-null decor kind among the items in the room the pet grew up in. */
function roomDecorKind(pet: PetState, env: EvolutionEnv): DecorKind | undefined {
  const counts = new Map<DecorKind, number>();
  for (const id of env.decorIn(grownRoom(pet.history, env.room))) {
    const { kind } = decorDef(id);
    if (kind !== null) counts.set(kind, (counts.get(kind) ?? 0) + 1);
  }
  return uniqueTop([...counts]);
}

function matchesHome(cond: EvolutionCondition, pet: PetState, env: EvolutionEnv): boolean {
  const { history } = pet;
  const checks: boolean[] = [
    cond.room === undefined || grownRoom(history, env.room) === cond.room,
    cond.decorKind === undefined || roomDecorKind(pet, env) === cond.decorKind,
    cond.wearing === undefined || env.worn[accessoryDef(cond.wearing).place] === cond.wearing,
    cond.morningCare === undefined || (history.care >= MIN_CARE && history.morningCare * 2 >= history.care),
  ];
  return checks.every(Boolean);
}

function matchesDeterministic(cond: EvolutionCondition, pet: PetState, ctx: EvolutionContext): boolean {
  const { history } = pet;
  const { hour } = ctx;
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
  return checks.every(Boolean) && matchesHome(cond, pet, ctx.env);
}

/** `chance` is evaluated last so the RNG is consumed only when everything else matched. */
export function matches(cond: EvolutionCondition, pet: PetState, ctx: EvolutionContext): boolean {
  if (!matchesDeterministic(cond, pet, ctx)) return false;
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
