import type { EvolutionEnv } from '../types';

/** A home with nothing in it: shown room `home`, no furniture, nothing worn. */
export function makeEnv(over: Partial<EvolutionEnv> = {}): EvolutionEnv {
  return { room: 'home', decorIn: () => [], worn: {}, ...over };
}
