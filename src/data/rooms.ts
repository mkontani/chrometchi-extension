import type { RewardId, RoomId } from '@/core/types';

export interface RoomDef {
  id: RoomId;
  outdoor: boolean;
  /** The reward that unlocks the room; null for the room you start with. */
  unlock: RewardId | null;
}

export const ROOMS: readonly RoomDef[] = [
  { id: 'home', outdoor: false, unlock: null },
  { id: 'garden', outdoor: true, unlock: 'ending:first' },
  { id: 'beach', outdoor: true, unlock: 'zukan:10' },
  { id: 'forest', outdoor: true, unlock: 'zukan:20' },
  { id: 'sweets', outdoor: false, unlock: 'zukan:30' },
  { id: 'snowfield', outdoor: true, unlock: 'zukan:40' },
  { id: 'castle', outdoor: false, unlock: 'zukan:50' },
  { id: 'washitsu', outdoor: false, unlock: 'mission:clean:2' },
  { id: 'space', outdoor: false, unlock: 'mission:play:2' },
  { id: 'cabin', outdoor: false, unlock: 'mission:cook:2' },
  { id: 'library', outdoor: false, unlock: 'mission:outing:2' },
];

export const ROOM_IDS: readonly RoomId[] = ROOMS.map((r) => r.id);
