import { describe, expect, test } from 'vitest';
import { makeGame, makePet } from './__fixtures__/pet';
import { createZukan } from './factory';
import { recordEnding, startNextGeneration, unlockFromEvents } from './lifecycle';

describe('unlockFromEvents', () => {
  test('adds hatched/evolved targets once', () => {
    const z = createZukan();
    const r = unlockFromEvents(z, [
      { type: 'hatched', to: 'baby_puni' },
      { type: 'evolved', from: 'baby_puni', to: 'child_a' },
      { type: 'evolved', from: 'x', to: 'baby_puni' },
      { type: 'hungry' },
    ]);
    expect(r.discovered).toEqual(['egg', 'baby_puni', 'child_a']);
    expect(z.discovered).toEqual(['egg']);
  });

  test('returns same zukan when nothing changes', () => {
    const z = createZukan();
    expect(unlockFromEvents(z, [{ type: 'hungry' }])).toBe(z);
    expect(unlockFromEvents(z, [{ type: 'hatched', to: 'egg' }])).toBe(z);
  });
});

describe('recordEnding', () => {
  test('stores path, finalForm and ending', () => {
    const z = createZukan();
    const game = makeGame({
      generation: 3,
      pet: makePet({ lifecycle: 'departed', formId: 'adult_x', path: ['egg', 'adult_x'], awakeMinutes: 99 }),
    });
    const r = recordEnding(z, game, 1234);
    expect(r.memories).toEqual([
      { generation: 3, finalForm: 'adult_x', path: ['egg', 'adult_x'], awakeMinutes: 99, ending: 'departed', endedAt: 1234 },
    ]);
    expect(z.memories).toEqual([]);
  });

  test('alive pet leaves zukan unchanged', () => {
    const z = createZukan();
    expect(recordEnding(z, makeGame(), 1)).toBe(z);
  });
});

describe('startNextGeneration', () => {
  test('creates egg with generation+1', () => {
    const g = startNextGeneration(makeGame({ generation: 2 }), 5000);
    expect(g.generation).toBe(3);
    expect(g.lastTickAt).toBe(5000);
    expect(g.pet.stage).toBe('egg');
    expect(g.pet.lifecycle).toBe('alive');
  });
});
