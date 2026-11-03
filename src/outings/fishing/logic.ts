import type { Rng } from '@/core/types';
import type { GameInput } from '@/games/types';
import { OUTING_GAME_MS, type OutingGame } from '../types';
import { renderFishing } from './render';

export const WAIT_MS = [1000, 2500] as const;
export const BITE_MS = 600;
export const REEL_MS = 500;
export const POINTS_PER_CATCH = 20;
const MAX_SCORE = 100;

export type FishingPhase = 'wait' | 'bite' | 'reel';

export interface FishingState {
  elapsed: number;
  phase: FishingPhase;
  /** Time spent in the current phase. */
  phaseMs: number;
  /** How long the current wait lasts. */
  waitMs: number;
  catches: number;
}

const drawWait = (rng: Rng): number => Math.floor(WAIT_MS[0] + rng() * (WAIT_MS[1] - WAIT_MS[0]));

function freshWait(s: FishingState, rng: Rng): FishingState {
  return { ...s, phase: 'wait', phaseMs: 0, waitMs: drawWait(rng) };
}

function advancePhase(s: FishingState, rng: Rng): FishingState {
  if (s.phase === 'wait' && s.phaseMs >= s.waitMs) return { ...s, phase: 'bite', phaseMs: 0 };
  if (s.phase === 'bite' && s.phaseMs >= BITE_MS) return freshWait(s, rng);
  if (s.phase === 'reel' && s.phaseMs >= REEL_MS) return freshWait(s, rng);
  return s;
}

function applyAction(s: FishingState, rng: Rng): FishingState {
  if (s.phase === 'bite') return { ...s, phase: 'reel', phaseMs: 0, catches: s.catches + 1 };
  if (s.phase === 'wait') return freshWait(s, rng);
  return s;
}

export const fishingGame: OutingGame<FishingState> = {
  kind: 'fishing',
  init: (rng) => ({ elapsed: 0, phase: 'wait', phaseMs: 0, waitMs: drawWait(rng), catches: 0 }),
  step(s, dtMs, input: GameInput, rng) {
    const acted = input.action ? applyAction(s, rng) : s;
    const timed = { ...acted, elapsed: s.elapsed + dtMs };
    // A tap that changed the phase starts it at 0; otherwise the current phase keeps running.
    return advancePhase(acted === s ? { ...timed, phaseMs: s.phaseMs + dtMs } : timed, rng);
  },
  isOver: (s) => s.elapsed >= OUTING_GAME_MS,
  score: (s) => Math.min(MAX_SCORE, s.catches * POINTS_PER_CATCH),
  render: renderFishing,
};
