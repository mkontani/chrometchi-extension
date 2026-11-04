import type { IngredientId, OutingKind, Rng } from '@/core/types';
import type { GameInput } from '@/games/types';

export const OUTING_GAME_MS = 15_000;

export type OutingArtId =
  | 'float' | 'grass' | 'bush' | 'sprout' | 'sprout_wet' | 'can'
  | 'boar' | 'chicken'
  | 'hud_fish' | 'hud_meat' | 'hud_nuts' | 'hud_bush';

/** Art the host provides at runtime; null while it is loading or missing. */
export interface OutingView {
  player: CanvasImageSource | null;
  art(id: OutingArtId | `food_${IngredientId}`): CanvasImageSource | null;
}

export interface OutingGame<S> {
  kind: OutingKind;
  init(rng: Rng): S;
  step(s: S, dtMs: number, input: GameInput, rng: Rng): S;
  isOver(s: S): boolean;
  /** The score the engine validates: an integer 0..100. */
  score(s: S): number;
  render(ctx: CanvasRenderingContext2D, s: S, view: OutingView): void;
  /** Maps a tap in logical 180x180 canvas coordinates to a pick index. */
  pickFromPointer?(x: number, y: number): number | null;
}
