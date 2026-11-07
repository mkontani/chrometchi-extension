import type { Rect, RoomId, SlotId, SlotKind } from '@/core/types';
import { ROOMS } from './rooms';

export const SLOT_IDS: readonly SlotId[] = ['wallL', 'wallR', 'ceiling', 'rug', 'floorL', 'floorR'];

export const SLOT_KIND: Record<SlotId, SlotKind> = {
  wallL: 'wall',
  wallR: 'wall',
  ceiling: 'ceiling',
  rug: 'rug',
  floorL: 'floor',
  floorR: 'floor',
};

const START: Record<SlotId, Rect> = {
  wallL: { x: 24, y: 24, w: 56, h: 56 },
  wallR: { x: 272, y: 24, w: 56, h: 56 },
  ceiling: { x: 112, y: 0, w: 128, h: 40 },
  floorL: { x: 12, y: 156, w: 72, h: 76 },
  floorR: { x: 268, y: 156, w: 72, h: 76 },
  rug: { x: 128, y: 204, w: 96, h: 48 },
};

const OUTDOOR_SLOTS: readonly SlotId[] = ['floorL', 'floorR', 'rug'];

/** Per room, the slots it has and where they sit. Outdoor rooms have no wall or ceiling. */
export const ROOM_SLOTS: Record<RoomId, Partial<Record<SlotId, Rect>>> = Object.fromEntries(
  ROOMS.map((room) => [
    room.id,
    Object.fromEntries((room.outdoor ? OUTDOOR_SLOTS : SLOT_IDS).map((s) => [s, START[s]])),
  ]),
) as Record<RoomId, Partial<Record<SlotId, Rect>>>;
