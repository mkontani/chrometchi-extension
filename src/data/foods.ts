import type { CookedDish, DishId, FoodDef, FoodId, IngredientId } from '@/core/types';

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
  { id: 'steak', tag: 'meat', kind: 'meal', hunger: 60, mood: 15, weight: 2, vitality: 3 },
  { id: 'acquapazza', tag: 'fish', kind: 'meal', hunger: 60, mood: 15, weight: 1, vitality: 6 },
  { id: 'onigiri', tag: 'grain', kind: 'meal', hunger: 55, mood: 10, weight: 1, vitality: 2 },
  { id: 'omurice', tag: 'meat', kind: 'meal', hunger: 60, mood: 15, weight: 2, vitality: 3 },
  { id: 'seafoodbowl', tag: 'fish', kind: 'meal', hunger: 65, mood: 15, weight: 1, vitality: 5 },
  { id: 'friedshrimp', tag: 'fish', kind: 'meal', hunger: 55, mood: 20, weight: 2, vitality: 2 },
  { id: 'hamburg', tag: 'meat', kind: 'meal', hunger: 65, mood: 20, weight: 2, vitality: 3 },
  { id: 'stirfry', tag: 'veggie', kind: 'meal', hunger: 50, mood: 10, weight: 0, vitality: 8 },
  { id: 'mushroomsoup', tag: 'veggie', kind: 'meal', hunger: 45, mood: 10, weight: 0, vitality: 8 },
  { id: 'nutcookie', tag: 'grain', kind: 'snack', hunger: 15, mood: 25, weight: 2, vitality: 0 },
  { id: 'fruittart', tag: 'sweet', kind: 'snack', hunger: 15, mood: 35, weight: 2, vitality: 2 },
  { id: 'mystery', tag: 'grain', kind: 'meal', hunger: 20, mood: 5, weight: 1, vitality: 0 },
];

export const FOOD_IDS = FOODS.map((f) => f.id) as [FoodId, ...FoodId[]];

/** Foods that never run out: no outing needed. */
export const ALWAYS_FOODS: ReadonlySet<FoodId> = new Set<FoodId>(['rice', 'candy']);

export const INGREDIENT_IDS: readonly IngredientId[] = [
  'fish', 'shrimp', 'meat', 'egg', 'nuts', 'mushroom', 'veggie', 'fruit',
];

/** The 12 dishes, in recipe-book order. */
export const DISH_IDS: readonly DishId[] = [
  'steak', 'acquapazza', 'cake', 'onigiri', 'omurice', 'seafoodbowl',
  'friedshrimp', 'hamburg', 'stirfry', 'mushroomsoup', 'nutcookie', 'fruittart',
];

/** True for the 12 dishes and the mystery dish. */
export function isDish(food: FoodId): food is CookedDish {
  return food === 'mystery' || (DISH_IDS as readonly FoodId[]).includes(food);
}
