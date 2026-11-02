import { describe, expect, test } from 'vitest';
import { BASE_WEIGHT } from './constants';
import { createEgg, createGame, createZukan } from './factory';

describe('factory', () => {
  test('createEgg is an alive egg with path [egg] and full stats', () => {
    const egg = createEgg();
    expect(egg.formId).toBe('egg');
    expect(egg.stage).toBe('egg');
    expect(egg.lifecycle).toBe('alive');
    expect(egg.stats).toEqual({ hunger: 100, mood: 100, vitality: 100, weight: BASE_WEIGHT.egg });
    expect(egg.path).toEqual(['egg']);
    expect(egg.awakeMinutes).toBe(0);
    expect(egg.stageMinutes).toBe(0);
    expect(egg.lightsOn).toBe(true);
    expect(egg.asleep).toBe(false);
    expect(egg.criticalSeenAt).toBeNull();
    expect(egg.lastPetAt).toBeNull();
    expect(egg.history.totalMistakes).toBe(0);
    expect(egg.history.foodCounts).toEqual({ grain: 0, meat: 0, fish: 0, veggie: 0, sweet: 0 });
    expect(egg.history.gameCounts).toEqual({ catch: 0, cups: 0, stop: 0 });
  });

  test('createEgg returns independent objects', () => {
    expect(createEgg()).not.toBe(createEgg());
    expect(createEgg().path).not.toBe(createEgg().path);
  });

  test('createGame wraps a fresh egg', () => {
    const g = createGame(1234);
    expect(g).toEqual({ pet: createEgg(), generation: 1, lastTickAt: 1234 });
    expect(createGame(1, 3).generation).toBe(3);
  });

  test('createZukan starts with egg discovered', () => {
    expect(createZukan()).toEqual({ discovered: ['egg'], memories: [] });
  });
});
