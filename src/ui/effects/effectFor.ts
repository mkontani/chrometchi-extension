import type { CareAction, PetState } from '@/core/types';
import type { CareEffect } from './types';

/**
 * The effect to replay for a care the engine accepted. `before` is the pet the player saw when pressing
 * the button, `after` the saved result. Play and pet have none: they keep their happy reaction.
 */
export function effectFor(action: CareAction, before: PetState, after: PetState): CareEffect | null {
  switch (action.kind) {
    case 'feed':
      return { kind: 'feed', food: action.food };
    case 'clean':
      return { kind: 'clean', poops: before.poops };
    case 'medicine':
      return { kind: 'medicine', cured: !after.sick };
    case 'lights':
      return { kind: 'lights', on: action.on };
    default:
      return null;
  }
}
