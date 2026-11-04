import { PANTRY_MAX } from "./constants";
import { outingRefusal } from "./outings";
import { addToPantry, stockOf, takeOne } from "./pantry";
import type {
  CareOutcome,
  CookedDish,
  DishId,
  Kitchen,
  Pantry,
  PetState,
  RefuseReason,
} from "./types";
import { RECIPES, type PotItem } from "@/data/recipes";

/** The pot holds at most this many items. */
export const POT_MAX = 4;

/**
 * Trims a pot to what the pantry holds: the latest extra copies of an item go first.
 * Rice never needs trimming. Returns the same array when nothing was dropped.
 */
export function fitPotToStock(
  pot: readonly PotItem[],
  pantry: Pantry,
): readonly PotItem[] {
  const kept = new Map<PotItem, number>();
  const fitted = pot.filter((item) => {
    const n = (kept.get(item) ?? 0) + 1;
    if (n > stockOf(pantry, item)) return false;
    kept.set(item, n);
    return true;
  });
  return fitted.length === pot.length ? pot : fitted;
}

export interface Cooked {
  dish: CookedDish;
  first: boolean;
}

export interface CookResult {
  kitchen: Kitchen;
  cooked: Cooked | null;
  outcome: CareOutcome;
}

export function potCounts(
  items: readonly PotItem[],
): Partial<Record<PotItem, number>> {
  const counts: Partial<Record<PotItem, number>> = {};
  for (const item of items) counts[item] = (counts[item] ?? 0) + 1;
  return counts;
}

function sameCounts(
  a: Partial<Record<PotItem, number>>,
  b: Partial<Record<PotItem, number>>,
): boolean {
  const kinds = new Set([...Object.keys(a), ...Object.keys(b)] as PotItem[]);
  return [...kinds].every((k) => (a[k] ?? 0) === (b[k] ?? 0));
}

/** The recipe whose kinds and counts equal the pot's, in any order; null when none does. */
export function matchRecipe(items: readonly PotItem[]): DishId | null {
  const counts = potCounts(items);
  return RECIPES.find((r) => sameCounts(r.items, counts))?.id ?? null;
}

function refused(kitchen: Kitchen, reason: RefuseReason): CookResult {
  return {
    kitchen,
    cooked: null,
    outcome: { action: "cook", result: "refused", reason },
  };
}

function lacksStock(pantry: Pantry, items: readonly PotItem[]): boolean {
  return Object.entries(potCounts(items)).some(
    ([item, n]) => stockOf(pantry, item as PotItem) < n,
  );
}

function useUp(pantry: Pantry, items: readonly PotItem[]): Pantry {
  return items.reduce(
    (left, item) => (item === "rice" ? left : (takeOne(left, item) ?? left)),
    pantry,
  );
}

/** Cooks the pot: ingredients (never rice) become one dish, or the mystery dish. */
export function cook(input: {
  pet: PetState;
  kitchen: Kitchen;
  items: readonly PotItem[];
}): CookResult {
  const { pet, kitchen, items } = input;
  const reason = outingRefusal(pet);
  if (reason !== null) return refused(kitchen, reason);
  if (lacksStock(kitchen.pantry, items)) return refused(kitchen, "noStock");
  const recipe = matchRecipe(items);
  const dish: CookedDish = recipe ?? "mystery";
  if ((kitchen.pantry[dish] ?? 0) >= PANTRY_MAX)
    return refused(kitchen, "pantryFull");
  const first = recipe !== null && !kitchen.recipes.includes(recipe);
  const { pantry } = addToPantry(useUp(kitchen.pantry, items), { [dish]: 1 });
  const recipes = first ? [...kitchen.recipes, recipe] : kitchen.recipes;
  return {
    kitchen: { ...kitchen, pantry, recipes },
    cooked: { dish, first },
    outcome: { action: "cook", result: "ok" },
  };
}
