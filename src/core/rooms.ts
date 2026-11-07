import { ROOMS } from '@/data/rooms';
import { outingRefusal } from './outings';
import type { PetState, RefuseReason, RewardId, RoomId } from './types';

/** The rooms the player owns, in table order. Home is always owned. */
export function ownedRooms(claimed: readonly RewardId[]): RoomId[] {
  return ROOMS.filter((r) => r.unlock === null || claimed.includes(r.unlock)).map((r) => r.id);
}

/** The room to draw: `room` if it is owned, otherwise home. */
export function shownRoom(room: RoomId, claimed: readonly RewardId[]): RoomId {
  return ownedRooms(claimed).includes(room) ? room : 'home';
}

/** The room a reward unlocks, if any. */
export function roomUnlockedBy(id: RewardId): RoomId | null {
  return ROOMS.find((r) => r.unlock === id)?.id ?? null;
}

/** Why the room cannot be switched now: the pet's state first, then the lock. */
export function roomRefusal(pet: PetState, claimed: readonly RewardId[], room: RoomId): RefuseReason | null {
  return outingRefusal(pet) ?? (ownedRooms(claimed).includes(room) ? null : 'locked');
}
