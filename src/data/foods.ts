import type { FoodDef } from '@/core/types';

export const FOODS: readonly FoodDef[] = [
  { id: 'rice', tag: 'grain', kind: 'meal', hunger: 35, mood: 0, weight: 1, vitality: 0 },
  { id: 'meat', tag: 'meat', kind: 'meal', hunger: 40, mood: 5, weight: 2, vitality: 0 },
  { id: 'fish', tag: 'fish', kind: 'meal', hunger: 35, mood: 0, weight: 1, vitality: 3 },
  { id: 'veggie', tag: 'veggie', kind: 'meal', hunger: 25, mood: -5, weight: 0, vitality: 5 },
  { id: 'cake', tag: 'sweet', kind: 'snack', hunger: 10, mood: 30, weight: 3, vitality: 0 },
  { id: 'candy', tag: 'sweet', kind: 'snack', hunger: 5, mood: 20, weight: 1, vitality: 0 },
];
