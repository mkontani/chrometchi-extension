/** Shared by logic and render so neither has to import runtime values from the other. */
export const BUSHES = 9;
export const SHAKE_EVERY_MS = 1200;
export const SHAKE_MS = 300;
export const COLS = 3;
/** Bushes the pet may open in one game. */
export const FLIPS = 4;
export const BUSH_SIZE = 30;
const GAP = 4;
const PITCH = BUSH_SIZE + GAP;
const GRID_X = 72;
const GRID_Y = 20;
/** Side of the square tap area of the 3x3 grid. */
export const GRID_SIZE = COLS * PITCH;

export const bushX = (i: number): number => GRID_X + (i % COLS) * PITCH;
export const bushY = (i: number): number => GRID_Y + Math.floor(i / COLS) * PITCH;

/** Index of the bush cell under a logical point, or null outside the grid. */
export function bushAt(x: number, y: number): number | null {
  const col = Math.floor((x - GRID_X) / PITCH);
  const row = Math.floor((y - GRID_Y) / PITCH);
  if (col < 0 || col >= COLS || row < 0 || row >= COLS) return null;
  return row * COLS + col;
}
