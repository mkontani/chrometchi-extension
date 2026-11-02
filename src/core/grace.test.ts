import { describe, expect, test } from 'vitest';
import { makePet } from './__fixtures__/pet';
import { applyCare } from './care';
import { DEATH_GRACE_MIN } from './constants';
import { createRng } from './rng';
import { stepMinute } from './step';
import type { PetState } from './types';
import { acknowledgeCritical } from './warnings';

const ctx = { asleep: false, rng: createRng(1), hour: 12 };

function run(pet: PetState, minutes: number): PetState {
  let p = pet;
  for (let i = 0; i < minutes; i++) p = stepMinute(p, ctx).pet;
  return p;
}

describe('death grace', () => {
  test('rescued-but-still-critical pet that lapses gets a fresh 60-minute grace', () => {
    const floored = makePet({
      formId: 'child_mochi',
      stage: 'child',
      awakeMinutes: 100,
      stageMinutes: 0,
      stats: { hunger: 0, mood: 0, vitality: 1, weight: 10 },
    });
    const acked = acknowledgeCritical(floored);
    expect(acked.criticalSeenAt).toBe(100);

    // Fed once: still critical (vitality 1), mood stays at 0, hunger runs out again later.
    const fed = applyCare(acked, { kind: 'feed', food: 'rice' }).pet;
    const lapsed = run(fed, 200);
    expect(lapsed.lifecycle).toBe('alive');
    expect(lapsed.stats.vitality).toBe(1);
    expect(lapsed.criticalSeenAt).toBeNull();

    const reacked = acknowledgeCritical(lapsed);
    expect(reacked.criticalSeenAt).toBe(lapsed.awakeMinutes);
    // Alive for a full 60 awake minutes after the new acknowledgement, dead on the next minute.
    const before = run(reacked, DEATH_GRACE_MIN);
    expect(before.awakeMinutes - (reacked.criticalSeenAt ?? 0)).toBe(DEATH_GRACE_MIN);
    expect(before.lifecycle).toBe('alive');
    expect(run(before, 1).lifecycle).toBe('dead');
  });
});
