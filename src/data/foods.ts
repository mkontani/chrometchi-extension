import type { FoodDef, FoodId } from '@/core/types';

export const FOODS: readonly FoodDef[] = [
  { id: 'rice', tag: 'grain', kind: 'meal', hunger: 35, mood: 0, weight: 1, vitality: 0 },
  { id: 'candy', tag: 'sweet', kind: 'snack', hunger: 5, mood: 20, weight: 1, vitality: 0 },
  { id: 'fish', tag: 'fish', kind: 'meal', hunger: 35, mood: 0, weight: 1, vitality: 3 },
  { id: 'shrimp', tag: 'fish', kind: 'meal', hunger: 30, mood: 5, weight: 1, vitality: 3 },
  { id: 'meat', tag: 'meat', kind: 'meal', hunger: 40, mood: 5, weight: 2, vitality: 0 },
  { id: 'egg', tag: 'meat', kind: 'meal', hunger: 30, mood: 0, weight: 1, vitality: 3 },
  { id: 'nuts', tag: 'grain', kind: 'meal', hunger: 20, mood: 5, weight: 1, vitality: 2 },
  { id: 'mushroom', tag: 'veggie', kind: 'meal', hunger: 20, mood: 0, weight: 0, vitality: 5 },
  { id: 'veggie', tag: 'veggie', kind: 'meal', hunger: 25, mood: -5, weight: 0, vitality: 5 },
  { id: 'fruit', tag: 'sweet', kind: 'meal', hunger: 20, mood: 10, weight: 0, vitality: 3 },
  { id: 'cake', tag: 'sweet', kind: 'snack', hunger: 10, mood: 30, weight: 3, vitality: 0 },
];

export const FOOD_IDS = FOODS.map((f) => f.id) as [FoodId, ...FoodId[]];

/** Foods that never run out: no outing needed. */
export const ALWAYS_FOODS: ReadonlySet<FoodId> = new Set<FoodId>(['rice', 'candy']);
