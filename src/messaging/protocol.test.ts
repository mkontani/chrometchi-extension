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
});
