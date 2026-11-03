import { WARNING } from './constants';
import type { PetState, WarningLevel } from './types';

export function deriveWarning(pet: PetState): WarningLevel {
  const { hunger, mood, vitality } = pet.stats;
  if (vitality <= WARNING.critical) return 'critical';
  if (vitality <= WARNING.danger) return 'danger';
  if (hunger === 0 || mood === 0 || pet.poops > 0 || pet.sick) return 'notice';
  return 'none';
}

/** Stamp the first moment the critical warning was seen; otherwise unchanged. */
export function acknowledgeCritical(pet: PetState): PetState {
  if (deriveWarning(pet) !== 'critical' || pet.criticalSeenAt !== null) return pet;
  return { ...pet, criticalSeenAt: pet.awakeMinutes };
}
