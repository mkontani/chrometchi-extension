import type { PetState } from '@/core/types';
import { deriveWarning } from '@/core/warnings';
import { LOW_STAT } from './constants';

/** The message key for what the pet says when clicked: its most pressing need first. */
export function bubbleKey(pet: PetState): string {
  if (pet.stage === 'egg') return 'roam_say_egg';
  if (pet.asleep) return 'roam_say_sleep';
  const warning = deriveWarning(pet);
  if (warning === 'critical') return 'roam_say_critical';
  if (warning === 'danger') return 'roam_say_weak';
  if (pet.sick) return 'roam_say_sick';
  if (pet.poops > 0) return 'roam_say_poop';
  if (pet.stats.hunger < LOW_STAT) return 'roam_say_hungry';
  if (pet.stats.mood < LOW_STAT) return 'roam_say_bored';
  return 'roam_say_happy';
}
