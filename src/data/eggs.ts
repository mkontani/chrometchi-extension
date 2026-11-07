/** Shell patterns for the egg sprite; each new generation gets the next one. */
export const EGG_PATTERNS = ['plain', 'dots', 'zigzag', 'stars', 'hearts', 'flowers', 'moons', 'waves', 'checker', 'leaves'] as const;
export type EggPattern = (typeof EGG_PATTERNS)[number];

export function eggPattern(generation: number): EggPattern {
  if (!Number.isInteger(generation) || generation < 1) return EGG_PATTERNS[0];
  return EGG_PATTERNS[(generation - 1) % EGG_PATTERNS.length] ?? EGG_PATTERNS[0];
}
