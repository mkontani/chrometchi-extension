import type { PetState } from '@/core/types';
import type { SaveV1 } from '@/storage/schema';
import { isHiddenOn } from './sites';

export type RoamDisplay =
  | { kind: 'hidden' }
  | { kind: 'pet'; pet: PetState; generation: number; motion: 'walk' | 'still'; pose: 'idle' | 'sleep' };

const HIDDEN: RoamDisplay = { kind: 'hidden' };

/** What the page should show: nothing, or the pet walking / standing still / asleep. */
export function roamDisplay(save: SaveV1 | null, host: string | null, reducedMotion: boolean): RoamDisplay {
  if (!save || !save.settings.roam || host === null || isHiddenOn(save.settings, host)) return HIDDEN;
  const { pet, generation } = save.game;
  if (pet.lifecycle !== 'alive') return HIDDEN;
  const base = { kind: 'pet' as const, pet, generation };
  if (pet.asleep) return { ...base, motion: 'still', pose: 'sleep' };
  if (pet.stage === 'egg' || reducedMotion) return { ...base, motion: 'still', pose: 'idle' };
  return { ...base, motion: 'walk', pose: 'idle' };
}
