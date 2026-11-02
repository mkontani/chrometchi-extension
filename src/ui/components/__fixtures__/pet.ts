import { createEgg } from '@/core/factory';
import type { PetState } from '@/core/types';

export function makePet(patch: Partial<PetState> = {}): PetState {
  return { ...createEgg(), stage: 'child', formId: 'child_kemu', ...patch };
}
