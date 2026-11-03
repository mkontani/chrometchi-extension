import { describe, expect, test } from 'vitest';
import { makeGame, makePet, type PetOverrides } from '@/core/__fixtures__/pet';
import { createFreshSave } from '@/storage/repository';
import type { SaveV1 } from '@/storage/schema';
import { roamDisplay } from './display';

function save(pet: PetOverrides = {}, settings: Partial<SaveV1['settings']> = {}): SaveV1 {
  const s = createFreshSave(0);
  return {
    ...s,
    settings: { ...s.settings, roam: true, ...settings },
    game: makeGame({ pet: makePet(pet), generation: 3 }),
  };
}

describe('roamDisplay', () => {
  test.each([
    ['no save', null, 'a.com'],
    ['roaming off', save({}, { roam: false }), 'a.com'],
    ['the pet has died', save({ lifecycle: 'dead' }), 'a.com'],
    ['the pet has departed', save({ lifecycle: 'departed' }), 'a.com'],
    ['not a web page', save(), null],
    ['hidden on this site', save({}, { roamHiddenSites: ['a.com'] }), 'a.com'],
  ])('hidden when %s', (_label, s, host) => {
    expect(roamDisplay(s, host, false)).toEqual({ kind: 'hidden' });
  });

  test('a healthy pet walks', () => {
    expect(roamDisplay(save(), 'a.com', false)).toMatchObject({ kind: 'pet', motion: 'walk', pose: 'idle', generation: 3 });
  });

  test('an egg wobbles in place', () => {
    expect(roamDisplay(save({ stage: 'egg', formId: 'egg' }), 'a.com', false)).toMatchObject({ motion: 'still', pose: 'idle' });
  });

  test('a sleeping pet sleeps in place', () => {
    expect(roamDisplay(save({ asleep: true }), 'a.com', false)).toMatchObject({ motion: 'still', pose: 'sleep' });
  });

  test('reduced motion keeps the pet still', () => {
    expect(roamDisplay(save(), 'a.com', true)).toMatchObject({ motion: 'still', pose: 'idle' });
  });
});
