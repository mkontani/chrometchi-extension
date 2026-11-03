import { SHAKE_EVERY_MS, SHAKE_MS } from './constants';
import type { GatheringState } from './logic';

/** An unflipped nut bush shakes for the first SHAKE_MS of every SHAKE_EVERY_MS. */
export function isShaking(s: GatheringState, index: number): boolean {
  return s.nuts[index] === true && s.flipped[index] !== true && s.elapsed % SHAKE_EVERY_MS < SHAKE_MS;
}
