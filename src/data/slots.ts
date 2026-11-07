import type { Rect, RoomId, SlotId, SlotKind } from '@/core/types';

export const SLOT_IDS: readonly SlotId[] = ['wallL', 'wallR', 'ceiling', 'rug', 'floorL', 'floorR'];

export const SLOT_KIND: Record<SlotId, SlotKind> = {
  wallL: 'wall',
  wallR: 'wall',
  ceiling: 'ceiling',
  rug: 'rug',
  floorL: 'floor',
  floorR: 'floor',
};

/**
 * Per room, the slots it has and where they sit, in stage px, tuned to each room picture
 * (docs/art/style-guide.md, "Furniture"). Outdoor rooms have no wall or ceiling.
 * Every value is a multiple of 4 (one room pixel), so items drawn at 2x land on whole display pixels.
 * Floor slots end at y 232, above the poops, and never overlap the pet's box (x 112-240, y 100-228).
 */
export const ROOM_SLOTS: Record<RoomId, Partial<Record<SlotId, Rect>>> = {
  home: {
    wallL: { x: 48, y: 48, w: 56, h: 56 },
    wallR: { x: 240, y: 48, w: 56, h: 56 },
    ceiling: { x: 112, y: 0, w: 128, h: 40 },
    rug: { x: 128, y: 204, w: 96, h: 48 },
    floorL: { x: 12, y: 156, w: 72, h: 76 },
    floorR: { x: 268, y: 156, w: 72, h: 76 },
  },
  garden: {
    rug: { x: 128, y: 204, w: 96, h: 48 },
    floorL: { x: 12, y: 156, w: 72, h: 76 },
    floorR: { x: 268, y: 156, w: 72, h: 76 },
  },
  beach: {
    rug: { x: 128, y: 204, w: 96, h: 48 },
    floorL: { x: 12, y: 156, w: 72, h: 76 },
    floorR: { x: 240, y: 156, w: 64, h: 76 },
  },
  forest: {
    rug: { x: 128, y: 204, w: 96, h: 48 },
    floorL: { x: 48, y: 156, w: 64, h: 76 },
    floorR: { x: 240, y: 156, w: 64, h: 76 },
  },
  sweets: {
    wallL: { x: 0, y: 24, w: 56, h: 56 },
    wallR: { x: 296, y: 24, w: 56, h: 56 },
    ceiling: { x: 112, y: 0, w: 128, h: 40 },
    rug: { x: 128, y: 204, w: 96, h: 48 },
    floorL: { x: 12, y: 156, w: 72, h: 76 },
    floorR: { x: 268, y: 156, w: 72, h: 76 },
  },
  snowfield: {
    rug: { x: 128, y: 204, w: 96, h: 48 },
    floorL: { x: 12, y: 156, w: 72, h: 76 },
    floorR: { x: 268, y: 156, w: 72, h: 76 },
  },
  castle: {
    wallL: { x: 4, y: 24, w: 56, h: 56 },
    wallR: { x: 296, y: 24, w: 56, h: 56 },
    ceiling: { x: 112, y: 0, w: 128, h: 40 },
    rug: { x: 128, y: 204, w: 96, h: 48 },
    floorL: { x: 48, y: 156, w: 64, h: 76 },
    floorR: { x: 240, y: 156, w: 64, h: 76 },
  },
  washitsu: {
    wallL: { x: 72, y: 40, w: 48, h: 48 },
    wallR: { x: 232, y: 40, w: 48, h: 48 },
    ceiling: { x: 112, y: 0, w: 128, h: 40 },
    rug: { x: 128, y: 204, w: 96, h: 48 },
    floorL: { x: 48, y: 156, w: 64, h: 76 },
    floorR: { x: 240, y: 156, w: 64, h: 76 },
  },
  space: {
    wallL: { x: 24, y: 24, w: 56, h: 56 },
    wallR: { x: 268, y: 24, w: 56, h: 56 },
    ceiling: { x: 112, y: 0, w: 128, h: 40 },
    rug: { x: 128, y: 204, w: 96, h: 48 },
    floorL: { x: 48, y: 156, w: 64, h: 76 },
    floorR: { x: 240, y: 156, w: 64, h: 76 },
  },
  cabin: {
    wallL: { x: 4, y: 72, w: 56, h: 56 },
    wallR: { x: 288, y: 72, w: 56, h: 56 },
    ceiling: { x: 112, y: 0, w: 128, h: 40 },
    rug: { x: 128, y: 204, w: 96, h: 48 },
    floorL: { x: 24, y: 156, w: 72, h: 76 },
    floorR: { x: 256, y: 156, w: 72, h: 76 },
  },
  library: {
    wallL: { x: 4, y: 24, w: 56, h: 56 },
    wallR: { x: 204, y: 52, w: 48, h: 48 },
    ceiling: { x: 112, y: 0, w: 128, h: 40 },
    rug: { x: 128, y: 204, w: 96, h: 48 },
    floorL: { x: 24, y: 156, w: 72, h: 76 },
    floorR: { x: 244, y: 156, w: 64, h: 76 },
  },
};
