import { HUNGER_DECAY, MISTAKE_AFTER_MIN, MOOD_DECAY } from './constants';
import type { Episodes, GameEvent, MistakeReason, PetState, StepResult } from './types';

interface NeedStep {
  value: number;
  zeroMin: number;
  taken: boolean;
  events: GameEvent[];
}

function stepNeed(
  value: number,
  decay: number,
  zeroMin: number,
  taken: boolean,
  low: GameEvent,
  reason: MistakeReason,
): NeedStep {
  const next = Math.max(0, value - decay);
  const events: GameEvent[] = [];
  if (value > 0 && next === 0) events.push(low);
  if (next > 0) return { value: next, zeroMin: 0, taken: false, events };
  const nextZero = zeroMin + 1;
  if (nextZero >= MISTAKE_AFTER_MIN && !taken) {
    events.push({ type: 'mistake', reason });
    return { value: next, zeroMin: nextZero, taken: true, events };
  }
  return { value: next, zeroMin: nextZero, taken, events };
}

/** One awake minute of hunger/mood decay plus care-mistake episode tracking. */
export function stepNeeds(pet: PetState): StepResult {
  const { stats, episodes, history, stage } = pet;
  const h = stepNeed(
    stats.hunger, HUNGER_DECAY[stage], episodes.hungerZeroMin,
    episodes.hungerMistakeTaken, { type: 'hungry' }, 'hunger',
  );
  const m = stepNeed(
    stats.mood, MOOD_DECAY[stage], episodes.moodZeroMin,
    episodes.moodMistakeTaken, { type: 'unhappy' }, 'mood',
  );
  const events = [...h.events, ...m.events];
  const newMistakes = events.filter((e) => e.type === 'mistake').length;
  const nextEpisodes: Episodes = {
    ...episodes,
    hungerZeroMin: h.zeroMin,
    hungerMistakeTaken: h.taken,
    moodZeroMin: m.zeroMin,
    moodMistakeTaken: m.taken,
  };
  return {
    pet: {
      ...pet,
      stats: { ...stats, hunger: h.value, mood: m.value },
      episodes: nextEpisodes,
      history: {
        ...history,
        totalMistakes: history.totalMistakes + newMistakes,
        stageMistakes: history.stageMistakes + newMistakes,
      },
    },
    events,
  };
}
