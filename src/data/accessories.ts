import type { AccessoryId, WearPlace } from '@/core/types';

export const WEAR_PLACES: readonly WearPlace[] = ['head', 'face', 'neck'];

export interface AccessoryDef {
  id: AccessoryId;
  place: WearPlace;
  price: number;
  /** Side of the square art in px; drawn at 4x. */
  size: 16 | 20 | 24;
  /** The point of the art that lands on the form's point for its place. */
  anchor: { x: number; y: number };
}

/** id, place, price, size, then the anchor's x and y in art px. */
type Row = readonly [AccessoryId, WearPlace, number, 16 | 20 | 24, number, number];

/**
 * Anchors are measured from each picture's opaque pixels (pixel-edge coordinates):
 * head items at the bottom-centre, face items at the centre, neck items at the top-centre.
 * A half pixel rounds up, so the item stays on the pet's 4x pixel grid.
 * Two head items are set by hand so they sit on the head, without covering the eyes (style guide,
 * Anchors): headphones low on its ear cups, and flowercrown 1 px above its bottom so the band rests on the head.
 */
const ROWS: readonly Row[] = [
  ['ribbon', 'head', 50, 16, 8, 14],
  ['crown', 'head', 200, 16, 8, 13],
  ['partyhat', 'head', 60, 16, 8, 15],
  ['tophat', 'head', 120, 16, 8, 13],
  ['beret', 'head', 80, 16, 8, 12],
  ['strawhat', 'head', 80, 20, 10, 17],
  ['flowercrown', 'head', 150, 24, 12, 15],
  ['chefhat', 'head', 100, 16, 8, 13],
  ['beanie', 'head', 80, 16, 8, 15],
  ['santahat', 'head', 120, 16, 8, 13],
  ['tiara', 'head', 200, 16, 8, 14],
  ['cap', 'head', 60, 16, 8, 13],
  ['wizardhat', 'head', 150, 20, 10, 18],
  ['headphones', 'head', 150, 20, 10, 14],
  ['flowerpin', 'head', 50, 16, 8, 13],
  ['starclip', 'head', 50, 16, 8, 13],
  ['leaf', 'head', 50, 16, 8, 13],
  ['glasses', 'face', 80, 16, 8, 7],
  ['sunglasses', 'face', 100, 16, 8, 8],
  ['heartglasses', 'face', 120, 16, 8, 9],
  ['bowtie', 'neck', 60, 16, 8, 4],
  ['scarf', 'neck', 100, 20, 10, 5],
  ['bell', 'neck', 60, 16, 8, 4],
  ['medal', 'neck', 200, 16, 8, 2],
  ['necklace', 'neck', 150, 16, 8, 4],
];

export const ACCESSORIES: readonly AccessoryDef[] = ROWS.map(([id, place, price, size, x, y]) => ({
  id,
  place,
  price,
  size,
  anchor: { x, y },
}));

export const ACCESSORY_IDS: readonly AccessoryId[] = ACCESSORIES.map((a) => a.id);

const BY_ID = new Map<AccessoryId, AccessoryDef>(ACCESSORIES.map((a) => [a.id, a]));

export function accessoryDef(id: AccessoryId): AccessoryDef {
  const def = BY_ID.get(id);
  if (!def) throw new Error(`unknown accessory: ${id}`);
  return def;
}
