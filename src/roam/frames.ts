import type { PetState } from '@/core/types';
import { eggPattern } from '@/data/eggs';
import { assetUrl } from '@/ui/assets';

/** The roaming pet's sprites. `walk` faces right (the view mirrors it); `rest` faces the viewer. */
export interface RoamFrames {
  walk: string[];
  rest: string[];
  sleep: string;
  happy: string;
}

export const WALK_FRAMES = 8;

/** Looks up `src/assets/<path>.png`; injectable for tests. */
export type AssetLookup = (path: string) => string | null;

/**
 * Sprite URLs for the current pet. A form without a full walk cycle (eggs, or art not made yet)
 * walks with its idle frames; missing poses fall back to idle0, as in the popup.
 */
export function roamFramePaths(pet: PetState, generation: number, lookup: AssetLookup = assetUrl): RoamFrames {
  const dir = pet.formId === 'egg' ? `egg/${eggPattern(generation)}` : pet.formId;
  const idle0 = lookup(`sprites/${dir}/idle0`) ?? (lookup('sprites/egg/plain/idle0') as string);
  const frame = (name: string): string => lookup(`sprites/${dir}/${name}`) ?? idle0;
  const rest = [idle0, frame('idle1')];
  const walk = Array.from({ length: WALK_FRAMES }, (_, i) => lookup(`sprites/${dir}/walk${i}`));
  const fullCycle = walk.every((url): url is string => url !== null);
  return { walk: fullCycle ? (walk as string[]) : rest, rest, sleep: frame('sleep'), happy: frame('happy') };
}
