import { expect, test } from 'vitest';
import { makePet } from '@/ui/components/__fixtures__/pet';
import { effectFor } from './effectFor';

const pet = makePet();

test('feeding replays the food that was picked', () => {
  expect(effectFor({ kind: 'feed', food: 'cake' }, pet, pet)).toEqual({ kind: 'feed', food: 'cake' });
});

test('cleaning sweeps the poops that were there before', () => {
  expect(effectFor({ kind: 'clean' }, makePet({ poops: 3 }), makePet({ poops: 0 }))).toEqual({ kind: 'clean', poops: 3 });
});

test('medicine knows whether that dose cured the pet', () => {
  const sick = makePet({ sick: true });
  expect(effectFor({ kind: 'medicine' }, sick, makePet({ sick: true }))).toEqual({ kind: 'medicine', cured: false });
  expect(effectFor({ kind: 'medicine' }, sick, makePet({ sick: false }))).toEqual({ kind: 'medicine', cured: true });
});

test('lights replay the switch that was flipped', () => {
  expect(effectFor({ kind: 'lights', on: false }, pet, pet)).toEqual({ kind: 'lights', on: false });
  expect(effectFor({ kind: 'lights', on: true }, pet, pet)).toEqual({ kind: 'lights', on: true });
});

test('play and pet have no effect of their own (they keep the happy reaction)', () => {
  expect(effectFor({ kind: 'pet' }, pet, pet)).toBeNull();
  expect(effectFor({ kind: 'play', game: 'stop', won: true }, pet, pet)).toBeNull();
});
