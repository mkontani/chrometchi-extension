import { expect, test } from 'vitest';
import { makePet } from '@/core/__fixtures__/pet';
import { bubbleKey } from './bubble';

test.each([
  ['an egg', makePet({ stage: 'egg', formId: 'egg', stats: { hunger: 0 } }), 'roam_say_egg'],
  ['asleep', makePet({ asleep: true, stats: { vitality: 10 } }), 'roam_say_sleep'],
  ['critical', makePet({ stats: { vitality: 20 }, sick: true }), 'roam_say_critical'],
  ['weak', makePet({ stats: { vitality: 40 }, sick: true }), 'roam_say_weak'],
  ['sick', makePet({ sick: true, poops: 2 }), 'roam_say_sick'],
  ['pooped', makePet({ poops: 1, stats: { hunger: 0 } }), 'roam_say_poop'],
  ['hungry', makePet({ stats: { hunger: 24, mood: 0 } }), 'roam_say_hungry'],
  ['bored', makePet({ stats: { mood: 24 } }), 'roam_say_bored'],
  ['fine', makePet({ stats: { hunger: 25, mood: 25 } }), 'roam_say_happy'],
])('%s → its line', (_label, pet, key) => {
  expect(bubbleKey(pet)).toBe(key);
});
