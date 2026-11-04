import type { DishId, IngredientId } from '@/core/types';
import { INGREDIENT_IDS } from './foods';

/** What can go in the pot: rice (never used up) and the 8 ingredients. */
export type PotItem = 'rice' | IngredientId;

export const POT_ITEMS: readonly PotItem[] = ['rice', ...INGREDIENT_IDS];

export interface RecipeDef {
  id: DishId;
  items: Readonly<Partial<Record<PotItem, number>>>;
}

/** The 12 recipes, in recipe-book order (spec 5.3). */
export const RECIPES: readonly RecipeDef[] = [
  { id: 'steak', items: { meat: 2, veggie: 1 } },
  { id: 'acquapazza', items: { fish: 2, veggie: 2 } },
  { id: 'cake', items: { fruit: 3 } },
  { id: 'onigiri', items: { rice: 1, fish: 1 } },
  { id: 'omurice', items: { rice: 1, egg: 2 } },
  { id: 'seafoodbowl', items: { rice: 1, fish: 1, shrimp: 1 } },
  { id: 'friedshrimp', items: { shrimp: 2, egg: 1 } },
  { id: 'hamburg', items: { meat: 2, egg: 1, veggie: 1 } },
  { id: 'stirfry', items: { veggie: 3 } },
  { id: 'mushroomsoup', items: { mushroom: 2, veggie: 1 } },
  { id: 'nutcookie', items: { nuts: 2, egg: 1 } },
  { id: 'fruittart', items: { fruit: 2, nuts: 1, egg: 1 } },
];
