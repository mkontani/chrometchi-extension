import { describe, expect, test } from 'vitest';
import { parseEngineRequest } from './protocol';

describe('parseEngineRequest', () => {
  test('accepts every valid request shape', () => {
    const valid = [
      { type: 'sync' },
      { type: 'care', action: { kind: 'feed', food: 'rice' } },
      { type: 'care', action: { kind: 'play', game: 'cups', won: true } },
      { type: 'care', action: { kind: 'lights', on: false } },
      { type: 'care', action: { kind: 'clean' } },
      { type: 'care', action: { kind: 'medicine' } },
      { type: 'care', action: { kind: 'pet' } },
      { type: 'ackCritical' },
      { type: 'updateSettings', patch: { sound: false, sleepStartMin: 60 } },
      { type: 'restart' },
      { type: 'startNewEgg' },
      { type: 'dismissNotice', notice: 'renewal' },
      { type: 'hideRoamSite', host: 'news.example.com' },
      { type: 'sell', food: 'fish', amount: 3 },
      { type: 'seenRewards' },
      { type: 'setRoom', room: 'beach' },
    ];
    for (const raw of valid) expect(parseEngineRequest(raw)).toEqual(raw);
  });

  test('rejects unknown type and bad field types', () => {
    const bad = [
      null,
      'sync',
      {},
      { type: 'nope' },
      { type: 'care', action: { kind: 'feed', food: 'pizza' } },
      { type: 'care', action: { kind: 'feed' } },
      { type: 'care', action: { kind: 'play', game: 'catch', won: 'yes' } },
      { type: 'care', action: { kind: 'lights' } },
      { type: 'care', action: { kind: 'dance' } },
      { type: 'updateSettings', patch: { sound: 'no' } },
      { type: 'updateSettings', patch: { sleepStartMin: 1440 } },
      { type: 'updateSettings', patch: { sleepStartMin: 1.5 } },
      { type: 'dismissNotice', notice: 'other' },
      { type: 'hideRoamSite', host: 'https://a.com' },
      { type: 'hideRoamSite' },
    ];
    for (const raw of bad) expect(parseEngineRequest(raw)).toBeNull();
  });
});

describe('forage request', () => {
  test('accepts a valid forage', () => {
    const raw = { type: 'forage', kind: 'fishing', score: 100 };
    expect(parseEngineRequest(raw)).toEqual(raw);
  });

  test('forage requests with a bad score are rejected', () => {
    const bad = [
      { type: 'forage', kind: 'fishing', score: 150 },
      { type: 'forage', kind: 'fishing', score: -1 },
      { type: 'forage', kind: 'fishing', score: 2.5 },
      { type: 'forage', kind: 'fishing', score: '100' },
      { type: 'forage', score: 10 },
      { type: 'forage', kind: 'swimming', score: 10 },
    ];
    for (const raw of bad) expect(parseEngineRequest(raw)).toBeNull();
  });
});

describe('cook request', () => {
  test('accepts a pot of 1 to 4 pot items', () => {
    const good = [
      { type: 'cook', items: ['rice'] },
      { type: 'cook', items: ['meat', 'meat', 'veggie'] },
      { type: 'cook', items: ['rice', 'fish', 'egg', 'fruit'] },
    ];
    for (const raw of good) expect(parseEngineRequest(raw)).toEqual(raw);
  });

  test('cook requests with a bad pot are rejected', () => {
    const bad = [
      { type: 'cook', items: [] },
      { type: 'cook', items: ['rice', 'rice', 'rice', 'rice', 'rice'] },
      { type: 'cook', items: ['candy'] },
      { type: 'cook', items: ['steak'] },
      { type: 'cook', items: ['beef'] },
      { type: 'cook', items: 'meat' },
      { type: 'cook' },
    ];
    for (const raw of bad) expect(parseEngineRequest(raw)).toBeNull();
  });
});

describe('farm request', () => {
  test('accepts plant, water and harvest', () => {
    const good = [
      { type: 'farm', action: { op: 'plant', crop: 'veggie' } },
      { type: 'farm', action: { op: 'plant', crop: 'fruit' } },
      { type: 'farm', action: { op: 'water' } },
      { type: 'farm', action: { op: 'harvest' } },
    ];
    for (const raw of good) expect(parseEngineRequest(raw)).toEqual(raw);
  });

  test('rejects a bad crop, a missing crop and unknown ops', () => {
    const bad = [
      { type: 'farm', action: { op: 'plant', crop: 'fish' } },
      { type: 'farm', action: { op: 'plant' } },
      { type: 'farm', action: { op: 'burn' } },
      { type: 'farm' },
    ];
    for (const raw of bad) expect(parseEngineRequest(raw)).toBeNull();
  });

  test('setRoom requests that are not a known room id are rejected', () => {
    for (const room of ['moon', '', 3]) {
      expect(parseEngineRequest({ type: 'setRoom', room })).toBeNull();
    }
    expect(parseEngineRequest({ type: 'setRoom' })).toBeNull();
  });

  test('placeDecor requests that are not known ids are rejected', () => {
    const ok = { type: 'placeDecor', room: 'home', slot: 'floorL', decor: 'candle' };
    expect(parseEngineRequest(ok)).toEqual(ok);
    expect(parseEngineRequest({ ...ok, decor: null })).toEqual({ ...ok, decor: null });
    expect(parseEngineRequest({ ...ok, room: 'moon' })).toBeNull();
    expect(parseEngineRequest({ ...ok, slot: 'roof' })).toBeNull();
    expect(parseEngineRequest({ ...ok, decor: 'ghost' })).toBeNull();
    expect(parseEngineRequest({ type: 'placeDecor', room: 'home', slot: 'floorL' })).toBeNull();
  });

  test('wear requests that are not known ids are rejected', () => {
    const ok = { type: 'wear', place: 'head', acc: 'ribbon' };
    expect(parseEngineRequest(ok)).toEqual(ok);
    expect(parseEngineRequest({ ...ok, acc: null })).toEqual({ ...ok, acc: null });
    expect(parseEngineRequest({ ...ok, place: 'feet' })).toBeNull();
    expect(parseEngineRequest({ ...ok, acc: 'ghost' })).toBeNull();
    expect(parseEngineRequest({ type: 'wear', place: 'head' })).toBeNull();
  });

  test('buyAccessory requests that are not a known item are rejected', () => {
    expect(parseEngineRequest({ type: 'buyAccessory', acc: 'crown' })).toEqual({ type: 'buyAccessory', acc: 'crown' });
    expect(parseEngineRequest({ type: 'buyAccessory', acc: 'ghost' })).toBeNull();
    expect(parseEngineRequest({ type: 'buyAccessory' })).toBeNull();
  });

  test('buyDecor requests that are not a known item are rejected', () => {
    expect(parseEngineRequest({ type: 'buyDecor', decor: 'lamp' })).toEqual({ type: 'buyDecor', decor: 'lamp' });
    expect(parseEngineRequest({ type: 'buyDecor', decor: 'ghost' })).toBeNull();
    expect(parseEngineRequest({ type: 'buyDecor' })).toBeNull();
  });

  test('sell requests that are not a positive whole amount of an ingredient are rejected', () => {
    for (const amount of [0, -1, 1.5, 100]) {
      expect(parseEngineRequest({ type: 'sell', food: 'fish', amount })).toBeNull();
    }
    for (const food of ['rice', 'candy', 'steak', 'gold']) {
      expect(parseEngineRequest({ type: 'sell', food, amount: 1 })).toBeNull();
    }
  });
});
