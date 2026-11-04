import { isSleepTime, consumeElapsed, minuteOfDay } from './clock';
import { TICK_MAX_GAP_MS } from './constants';
import { stepMinute } from './step';
import type { GameEvent, GameState, IdleState, Rng, Settings } from './types';

const MS_PER_MINUTE = 60_000;

export interface AdvanceInput {
  now: number;
  settings: Settings;
  idle: IdleState;
  rng: Rng;
}

export function advanceTime(
  game: GameState,
  { now, settings, idle, rng }: AdvanceInput,
): { game: GameState; events: GameEvent[]; minutes: number } {
  if (idle === 'locked' || game.pet.lifecycle !== 'alive') {
    return { game: { ...game, lastTickAt: now }, events: [], minutes: 0 };
  }
  const { minutes, nextTickAt } = consumeElapsed(game.lastTickAt, now, TICK_MAX_GAP_MS);
  let pet = game.pet;
  const events: GameEvent[] = [];
  for (let i = 0; i < minutes && pet.lifecycle === 'alive'; i++) {
    const ts = game.lastTickAt + (i + 1) * MS_PER_MINUTE;
    const asleep = isSleepTime(minuteOfDay(ts), settings.sleepStartMin, settings.sleepEndMin);
    const step = stepMinute(pet, { asleep, rng, hour: new Date(ts).getHours() });
    pet = step.pet;
    events.push(...step.events);
  }
  return { game: { ...game, pet, lastTickAt: nextTickAt }, events, minutes };
}
