import type { GameId } from '@/core/types';
import { catchGame } from './catch/logic';
import type { MiniGame } from './types';

/** Games are heterogeneous in state type; the host only touches them via this interface. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyMiniGame = MiniGame<any>;

/** Filled as games land (cups/stop arrive in Task 17). */
export const MINI_GAMES: Partial<Record<GameId, AnyMiniGame>> = {
  catch: catchGame,
};
