import type { OutingKind } from '@/core/types';
import { LOGICAL_SIZE } from '@/ui/useGameInput';
import { OUTING_GAME_MS, type OutingGame } from './types';

/** Outing games are heterogeneous in state type; the host only touches them via this interface. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyOutingGame = OutingGame<any>;

interface StubState {
  elapsed: number;
}

/** A placeholder that just runs the clock out with no score, until the real game replaces it. */
function stubGame(kind: OutingKind): OutingGame<StubState> {
  return {
    kind,
    init: () => ({ elapsed: 0 }),
    step: (s, dt) => ({ elapsed: s.elapsed + dt }),
    isOver: (s) => s.elapsed >= OUTING_GAME_MS,
    score: () => 0,
    render(ctx) {
      ctx.fillStyle = '#cfe8f5';
      ctx.fillRect(0, 0, LOGICAL_SIZE, LOGICAL_SIZE);
    },
  };
}

export const OUTING_GAMES: Record<OutingKind, AnyOutingGame> = {
  fishing: stubGame('fishing'),
  hunting: stubGame('hunting'),
  gathering: stubGame('gathering'),
};
