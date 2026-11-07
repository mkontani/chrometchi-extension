import { describe, expect, test } from 'vitest';
import { makePet } from './__fixtures__/pet';
import { buyDecor, placeDecor, placedIn } from './decor';
import { EMPTY_PROGRESS } from './progress';
import type { Home } from './types';

const home = (over: Partial<Home> = {}): Home => ({ room: 'home', ownedDecor: [], decor: {}, ...over });
const coins = (n: number) => ({ ...EMPTY_PROGRESS, coins: n });
const pet = makePet();

describe('buyDecor', () => {
  test('at exactly the price, one short, and twice', () => {
    const bought = buyDecor({ progress: coins(50), home: home(), decor: 'candle' });
    expect(bought.outcome).toEqual({ action: 'buy', result: 'ok' });
    expect(bought.progress.coins).toBe(0);
    expect(bought.home.ownedDecor).toEqual(['candle']);

    const short = buyDecor({ progress: coins(49), home: home(), decor: 'candle' });
    expect(short.outcome).toEqual({ action: 'buy', result: 'refused', reason: 'noCoins' });
    expect(short.progress.coins).toBe(49);
    expect(short.home.ownedDecor).toEqual([]);

    const twice = buyDecor({ progress: coins(500), home: bought.home, decor: 'candle' });
    expect(twice.outcome).toEqual({ action: 'buy', result: 'refused', reason: 'owned' });
    expect(twice.progress.coins).toBe(500);
  });

  test('keeps the other home fields and does not mutate', () => {
    const before = home({ ownedDecor: ['lamp'] });
    const after = buyDecor({ progress: coins(100), home: before, decor: 'candle' });
    expect(after.home.ownedDecor).toEqual(['lamp', 'candle']);
    expect(before.ownedDecor).toEqual(['lamp']);
  });
});

describe('placeDecor', () => {
  const owned = home({ ownedDecor: ['candle', 'clock', 'rug'] });
  const place = (over: Partial<Parameters<typeof placeDecor>[0]> = {}) =>
    placeDecor({ pet, claimed: [], home: owned, room: 'home', slot: 'floorL', decor: 'candle', ...over });

  test('puts an owned item in a fitting slot', () => {
    const r = place();
    expect(r.outcome).toEqual({ action: 'place', result: 'ok' });
    expect(r.home.decor).toEqual({ home: { floorL: 'candle' } });
    expect(owned.decor).toEqual({});
  });

  test('refusals in order', () => {
    const refused = (reason: string) => ({ action: 'place', result: 'refused', reason });
    expect(place({ pet: makePet({ asleep: true }), room: 'beach' }).outcome).toEqual(refused('asleep'));
    expect(place({ room: 'beach', slot: 'wallL', decor: 'lamp' }).outcome).toEqual(refused('locked'));
    expect(place({ claimed: ['zukan:10'], room: 'beach', slot: 'wallL', decor: 'lamp' }).outcome).toEqual(
      refused('noSlot'),
    );
    expect(place({ slot: 'floorL', decor: 'lamp' }).outcome).toEqual(refused('notOwned'));
    expect(place({ slot: 'wallL', decor: 'lamp' }).outcome).toEqual(refused('notOwned'));
    expect(place({ slot: 'wallL', decor: 'candle' }).outcome).toEqual(refused('wrongSlot'));
    expect(place({ slot: 'wallL', decor: 'candle' }).home).toBe(owned);
  });

  test('placing an item already in the room moves it', () => {
    const first = place().home;
    const moved = place({ home: first, slot: 'floorR' }).home;
    expect(moved.decor).toEqual({ home: { floorR: 'candle' } });
  });

  test('the same item can sit in two rooms', () => {
    const first = place().home;
    const r = place({ home: first, claimed: ['ending:first'], room: 'garden' });
    expect(r.home.decor).toEqual({ home: { floorL: 'candle' }, garden: { floorL: 'candle' } });
  });

  test('null clears a slot', () => {
    const first = place().home;
    const cleared = place({ home: first, decor: null }).home;
    expect(cleared.decor.home?.floorL).toBeUndefined();
    expect(placedIn(cleared, 'home')).toEqual([]);
  });

  test('null on an empty slot is fine, but still obeys the room checks', () => {
    expect(place({ decor: null }).outcome).toEqual({ action: 'place', result: 'ok' });
    expect(place({ decor: null, room: 'beach', slot: 'wallL', claimed: ['zukan:10'] }).outcome.reason).toBe('noSlot');
  });

  test('placing in a filled slot replaces the item', () => {
    const withLamp = home({ ownedDecor: ['candle', 'lamp'] });
    const first = place({ home: withLamp, decor: 'lamp' }).home;
    const r = place({ home: first, decor: 'candle' });
    expect(r.home.decor.home).toEqual({ floorL: 'candle' });
  });
});

describe('placedIn', () => {
  test("lists a room's items in slot order", () => {
    const h = home({
      ownedDecor: ['candle', 'clock', 'rug', 'bunting'],
      decor: { home: { floorR: 'candle', rug: 'rug', wallL: 'clock', ceiling: 'bunting' } },
    });
    expect(placedIn(h, 'home')).toEqual([
      { slot: 'wallL', decor: 'clock' },
      { slot: 'ceiling', decor: 'bunting' },
      { slot: 'rug', decor: 'rug' },
      { slot: 'floorR', decor: 'candle' },
    ]);
    expect(placedIn(h, 'garden')).toEqual([]);
  });

  test('skips slots the room does not have', () => {
    const h = home({ decor: { beach: { wallL: 'clock', floorL: 'candle' } } });
    expect(placedIn(h, 'beach')).toEqual([{ slot: 'floorL', decor: 'candle' }]);
  });
});
