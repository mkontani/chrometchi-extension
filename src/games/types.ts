import type { GameId, Rng } from '@/core/types';

/** One-frame input: left/right/action are edge flags, pick is a lane/cup index. */
export interface GameInput {
  left: boolean;
  right: boolean;
  action: boolean;
  pick: number | null;
}

export interface MiniGame<S> {
  id: GameId;
  init(rng: Rng): S;
  step(s: S, dtMs: number, input: GameInput, rng: Rng): S;
  isOver(s: S): boolean;
  won(s: S): boolean;
  render(ctx: CanvasRenderingContext2D, s: S): void;
  /** Maps a tap in logical 180x180 canvas coordinates to a pick index. */
  pickFromPointer?(x: number, y: number): number | null;
}

export const NO_INPUT: GameInput = { left: false, right: false, action: false, pick: null };
