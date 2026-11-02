import { createGame } from './factory';
import type { GameEvent, GameState, Zukan } from './types';

export function unlockFromEvents(zukan: Zukan, events: GameEvent[]): Zukan {
  const discovered = [...zukan.discovered];
  for (const e of events) {
    if ((e.type === 'hatched' || e.type === 'evolved') && !discovered.includes(e.to)) {
      discovered.push(e.to);
    }
  }
  return discovered.length === zukan.discovered.length ? zukan : { ...zukan, discovered };
}

export function recordEnding(zukan: Zukan, game: GameState, now: number): Zukan {
  const { pet } = game;
  if (pet.lifecycle === 'alive') return zukan;
  const memory = {
    generation: game.generation,
    finalForm: pet.formId,
    path: [...pet.path],
    awakeMinutes: pet.awakeMinutes,
    ending: pet.lifecycle,
    endedAt: now,
  };
  return { ...zukan, memories: [...zukan.memories, memory] };
}

export function startNextGeneration(game: GameState, now: number): GameState {
  return createGame(now, game.generation + 1);
}
