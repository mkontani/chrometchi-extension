import { describe, expect, test } from 'vitest';
import { makePet } from './__fixtures__/pet';
import { buyAccessory, takeOffAll, wear } from './dressup';
import { EMPTY_PROGRESS } from './progress';
import type { Home } from './types';

const home = (over: Partial<Home> = {}): Home => ({
  room: 'home',
  ownedDecor: [],
  decor: {},
  ownedAcc: [],
  worn: {},
  ...over,
});
const coins = (n: number) => ({ ...EMPTY_PROGRESS, coins: n });
const pet = makePet();

describe('buyAccessory', () => {
  test('at exactly the price, one short, and twice', () => {
    const bought = buyAccessory({ progress: coins(70), home: home(), acc: 'ribbon' });
    expect(bought.outcome).toEqual({ action: 'buy', result: 'ok' });
    expect(bought.progress.coins).toBe(0);
    expect(bought.home.ownedAcc).toEqual(['ribbon']);

    const short = buyAccessory({ progress: coins(69), home: home(), acc: 'ribbon' });
    expect(short.outcome).toEqual({ action: 'buy', result: 'refused', reason: 'noCoins' });
    expect(short.progress.coins).toBe(69);
    expect(short.home.ownedAcc).toEqual([]);

    const twice = buyAccessory({ progress: coins(500), home: bought.home, acc: 'ribbon' });
    expect(twice.outcome).toEqual({ action: 'buy', result: 'refused', reason: 'owned' });
    expect(twice.progress.coins).toBe(500);
  });

  test('does not mutate the home it was given', () => {
    const before = home({ ownedAcc: ['bell'] });
    const after = buyAccessory({ progress: coins(100), home: before, acc: 'ribbon' });
    expect(after.home.ownedAcc).toEqual(['bell', 'ribbon']);
    expect(before.ownedAcc).toEqual(['bell']);
  });
});

describe('wear', () => {
  const owned = home({ ownedAcc: ['ribbon', 'crown', 'glasses'] });
  const put = (over: Partial<Parameters<typeof wear>[0]> = {}) =>
    wear({ pet, home: owned, place: 'head', acc: 'ribbon', ...over });

  test('puts an owned item in its place and replaces what was there', () => {
    const first = put();
    expect(first.outcome).toEqual({ action: 'wear', result: 'ok' });
    expect(first.home.worn).toEqual({ head: 'ribbon' });
    expect(owned.worn).toEqual({});
    const second = put({ home: first.home, acc: 'crown' });
    expect(second.home.worn).toEqual({ head: 'crown' });
    expect(second.home.ownedAcc).toEqual(owned.ownedAcc);
    const face = put({ home: second.home, place: 'face', acc: 'glasses' });
    expect(face.home.worn).toEqual({ head: 'crown', face: 'glasses' });
  });

  test('wear refusals in order', () => {
    const refused = (reason: string) => ({ action: 'wear', result: 'refused', reason });
    expect(put({ pet: makePet({ asleep: true }), acc: 'bell', place: 'face' }).outcome).toEqual(refused('asleep'));
    expect(put({ acc: 'bell', place: 'face' }).outcome).toEqual(refused('notOwned'));
    expect(put({ acc: 'glasses', place: 'head' }).outcome).toEqual(refused('wrongPlace'));
    expect(put({ acc: 'glasses', place: 'head' }).home).toBe(owned);
  });

  test('null takes an item off', () => {
    const worn = put().home;
    const off = put({ home: worn, acc: null });
    expect(off.outcome).toEqual({ action: 'wear', result: 'ok' });
    expect(off.home.worn).toEqual({});
    expect(off.home.ownedAcc).toEqual(owned.ownedAcc);
    expect(put({ home: worn, acc: null, pet: makePet({ asleep: true }) }).outcome.reason).toBe('asleep');
  });
});

describe('takeOffAll', () => {
  test('empties worn and keeps owned', () => {
    const dressed = home({ ownedAcc: ['ribbon', 'glasses'], worn: { head: 'ribbon', face: 'glasses' } });
    const bare = takeOffAll(dressed);
    expect(bare.worn).toEqual({});
    expect(bare.ownedAcc).toEqual(['ribbon', 'glasses']);
    expect(dressed.worn).toEqual({ head: 'ribbon', face: 'glasses' });
  });

  test('returns the same home when nothing is worn', () => {
    const h = home({ ownedAcc: ['ribbon'] });
    expect(takeOffAll(h)).toBe(h);
  });
});
