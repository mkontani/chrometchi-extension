import { DEATH_GRACE_MIN, VITALITY, WARNING } from './constants';
import type { PetState, StepResult } from './types';

function vitalityDelta(pet: PetState): number {
  const loss =
    (pet.stats.hunger === 0 ? VITALITY.zeroNeedLoss : 0) +
    (pet.stats.mood === 0 ? VITALITY.zeroNeedLoss : 0) +
    (pet.sick ? VITALITY.sickLoss : 0);
  if (loss > 0) return -loss;
  const healthy =
    pet.stats.hunger > VITALITY.recoverAbove && pet.stats.mood > VITALITY.recoverAbove && !pet.sick;
  return healthy ? VITALITY.recover : 0;
}

/** One awake minute of vitality change plus the warned-death rule. Does not touch awakeMinutes. */
export function stepVitality(pet: PetState): StepResult {
  if (pet.lifecycle !== 'alive') return { pet, events: [] };
  const vitality = Math.min(100, pet.stats.vitality + vitalityDelta(pet));
  const criticalSeenAt = vitality > WARNING.critical ? null : pet.criticalSeenAt;

  if (vitality > 0) {
    return { pet: { ...pet, criticalSeenAt, stats: { ...pet.stats, vitality } }, events: [] };
  }
  const acknowledged = criticalSeenAt !== null && pet.awakeMinutes - criticalSeenAt >= DEATH_GRACE_MIN;
  if (acknowledged) {
    return {
      pet: { ...pet, criticalSeenAt, lifecycle: 'dead', stats: { ...pet.stats, vitality: 0 } },
      events: [{ type: 'died' }],
    };
  }
  return { pet: { ...pet, criticalSeenAt, stats: { ...pet.stats, vitality: 1 } }, events: [] };
}
