import type { GameId } from '@/core/types';
import { catchGame } from './catch/logic';
import { cupsGame } from './cups/logic';
import { stopGame } from './stop/logic';
import type { MiniGame } from './types';

/** Games are heterogeneous in state type; the host only touches them via this interface. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyMiniGame = MiniGame<any>;

export const MINI_GAMES: Record<GameId, AnyMiniGame> = {
  catch: catchGame,
  cups: cupsGame,
  stop: stopGame,
};
