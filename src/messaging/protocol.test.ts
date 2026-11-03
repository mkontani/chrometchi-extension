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
