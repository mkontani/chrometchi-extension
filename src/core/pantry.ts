import { PANTRY_MAX } from './constants';
import type { FoodId, Gained, Pantry } from './types';
import { ALWAYS_FOODS } from '@/data/foods';

export function stockOf(pantry: Pantry, food: FoodId): number {
  return ALWAYS_FOODS.has(food) ? Infinity : (pantry[food] ?? 0);
}

/** Adds items, capping each food at PANTRY_MAX; `added` is what actually fit. */
export function addToPantry(pantry: Pantry, items: Gained): { pantry: Pantry; added: Gained } {
  const next: Pantry = { ...pantry };
  const added: Gained = {};
  for (const [food, count] of Object.entries(items) as [FoodId, number][]) {
    const have = pantry[food] ?? 0;
    const room = Math.max(0, Math.min(count, PANTRY_MAX - have));
    if (room === 0) continue;
    next[food] = have + room;
    added[food] = room;
  }
  return { pantry: next, added };
}

/** Takes one of a food. Null when none is left; always foods come back untouched. */
export function takeOne(pantry: Pantry, food: FoodId): Pantry | null {
  if (ALWAYS_FOODS.has(food)) return pantry;
  const have = pantry[food] ?? 0;
  return have > 0 ? { ...pantry, [food]: have - 1 } : null;
}
