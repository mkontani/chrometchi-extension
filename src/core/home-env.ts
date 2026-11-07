import { placedIn } from './decor';
import { shownRoom } from './rooms';
import type { EvolutionEnv, Home, RewardId } from './types';

/** What evolution reads of the home: the room shown now, the furniture in any room, what is worn. */
export function evolutionEnv(home: Home, claimed: readonly RewardId[]): EvolutionEnv {
  return {
    room: shownRoom(home.room, claimed),
    decorIn: (room) => placedIn(home, room).map((p) => p.decor),
    worn: home.worn,
  };
}
