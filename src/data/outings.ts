import type { IngredientId, OutingKind } from '@/core/types';

export const OUTING_KINDS: readonly OutingKind[] = ['fishing', 'hunting', 'gathering'];

/** What each outing brings: the main haul, and a rarer find. */
export const OUTING_YIELDS: Record<OutingKind, { main: IngredientId; rare: IngredientId }> = {
  fishing: { main: 'fish', rare: 'shrimp' },
  hunting: { main: 'meat', rare: 'egg' },
  gathering: { main: 'nuts', rare: 'mushroom' },
};
