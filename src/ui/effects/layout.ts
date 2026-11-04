/**
 * Stage geometry for the effects, in stage px (the 352×272 content box of `.stage`).
 * Keep these in step with `src/entrypoints/popup/style.css`; the owner gate may tune them.
 */
export const STAGE = { w: 352, h: 272 } as const;
export const PET = { x: 112, y: 100, size: 128 } as const;
/** The food (32 px art at 2×) beside the pet's mouth. */
export const FOOD_AT = { x: 208, y: 148 } as const;
/** The cooking pot (32 px art at 2×) stands where the food does. */
export const POT_AT = FOOD_AT;
/** Where the pill (16 px art at 2×) ends up: the pet's mouth. */
export const MOUTH_AT = { x: 160, y: 164 } as const;
export const PILL_FROM = { x: 248, y: 84 } as const;
/** Same place as `.effect--sweat` and `.effect--sparkle`. */
export const SWEAT_AT = { x: 110, y: 90 } as const;
export const SPARKLE_AT = { x: 230, y: 90 } as const;
/** The light switch (16 px icon at 3×) in the top-right corner. */
export const SWITCH_AT = { x: 292, y: 12 } as const;
/** The broom (16 px icon at 4×) stands on the floor. */
export const BROOM = { y: 200, scale: 4 } as const;
/** The `.poops` row: right-aligned flex row of 32 px poops. */
export const POOP_ROW = { size: 32, gap: 4, right: 8, bottom: 8 } as const;

/** Left x of poop `i` of `n` in the right-aligned `.poops` row. */
export function poopSlotLeft(i: number, n: number): number {
  return STAGE.w - POOP_ROW.right - (n - i) * POOP_ROW.size - (n - 1 - i) * POOP_ROW.gap;
}
