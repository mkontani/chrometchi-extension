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

type Row = readonly [AccessoryId, WearPlace, number, 16 | 20 | 24];

const ROWS: readonly Row[] = [
  ['ribbon', 'head', 50, 16], ['crown', 'head', 200, 16], ['partyhat', 'head', 60, 16],
  ['tophat', 'head', 120, 16], ['beret', 'head', 80, 16], ['strawhat', 'head', 80, 20],
  ['flowercrown', 'head', 150, 24], ['chefhat', 'head', 100, 16], ['beanie', 'head', 80, 16],
  ['santahat', 'head', 120, 16], ['tiara', 'head', 200, 16], ['cap', 'head', 60, 16],
  ['wizardhat', 'head', 150, 20], ['headphones', 'head', 150, 20], ['flowerpin', 'head', 50, 16],
  ['starclip', 'head', 50, 16], ['leaf', 'head', 50, 16],
  ['glasses', 'face', 80, 16], ['sunglasses', 'face', 100, 16], ['heartglasses', 'face', 120, 16],
  ['bowtie', 'neck', 60, 16], ['scarf', 'neck', 100, 20], ['bell', 'neck', 60, 16],
  ['medal', 'neck', 200, 16], ['necklace', 'neck', 150, 16],
];

/** Nominal anchors: head items sit on the point (bottom-centre), face items centre on it, neck items hang from it. */
function nominalAnchor(place: WearPlace, size: number): { x: number; y: number } {
  const x = size / 2;
  if (place === 'head') return { x, y: size };
  return { x, y: place === 'face' ? size / 2 : 0 };
}

export const ACCESSORIES: readonly AccessoryDef[] = ROWS.map(([id, place, price, size]) => ({
  id,
  place,
  price,
  size,
  anchor: nominalAnchor(place, size),
}));

export const ACCESSORY_IDS: readonly AccessoryId[] = ACCESSORIES.map((a) => a.id);

const BY_ID = new Map<AccessoryId, AccessoryDef>(ACCESSORIES.map((a) => [a.id, a]));

export function accessoryDef(id: AccessoryId): AccessoryDef {
  const def = BY_ID.get(id);
  if (!def) throw new Error(`unknown accessory: ${id}`);
  return def;
}
