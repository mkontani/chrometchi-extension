import type { DecorId, DecorKind, SlotKind } from '@/core/types';

export interface DecorDef {
  id: DecorId;
  slot: SlotKind;
  kind: DecorKind | null;
  price: number;
  /** Side of the square art in px; drawn at 2x. */
  size: 24 | 32;
}

export const DECOR: readonly DecorDef[] = [
  { id: 'candle', slot: 'floor', kind: 'light', price: 70, size: 24 },
  { id: 'lamp', slot: 'floor', kind: 'light', price: 130, size: 32 },
  { id: 'fishbowl', slot: 'floor', kind: 'water', price: 160, size: 32 },
  { id: 'vase', slot: 'floor', kind: 'water', price: 80, size: 32 },
  { id: 'plant', slot: 'floor', kind: 'plant', price: 80, size: 32 },
  { id: 'cactus', slot: 'floor', kind: 'plant', price: 80, size: 24 },
  { id: 'bonsai', slot: 'floor', kind: 'plant', price: 200, size: 32 },
  { id: 'bunting', slot: 'ceiling', kind: 'sky', price: 80, size: 32 },
  { id: 'telescope', slot: 'floor', kind: 'sky', price: 330, size: 32 },
  // Not scaled by 1.3 like the rest: spec 7.3 keeps an item of every kind at 100 coins or less.
  { id: 'clock', slot: 'wall', kind: 'gadget', price: 100, size: 24 },
  { id: 'musicbox', slot: 'floor', kind: 'gadget', price: 200, size: 24 },
  { id: 'toypiano', slot: 'floor', kind: 'gadget', price: 260, size: 32 },
  // Not scaled by 1.3 like the rest: spec 7.3 keeps an item of every kind at 100 coins or less.
  { id: 'lantern', slot: 'ceiling', kind: 'night', price: 100, size: 24 },
  { id: 'petbed', slot: 'floor', kind: 'night', price: 130, size: 32 },
  { id: 'trophy', slot: 'floor', kind: 'sparkle', price: 330, size: 24 },
  // Not scaled by 1.3 like the rest: spec 7.3 keeps an item of every kind at 100 coins or less.
  { id: 'globe', slot: 'floor', kind: 'sparkle', price: 100, size: 24 },
  { id: 'xmastree', slot: 'floor', kind: 'sparkle', price: 390, size: 32 },
  { id: 'armchair', slot: 'floor', kind: 'cozy', price: 260, size: 32 },
  { id: 'cushion', slot: 'rug', kind: 'cozy', price: 70, size: 32 },
  { id: 'table', slot: 'floor', kind: 'cozy', price: 160, size: 32 },
  { id: 'stool', slot: 'floor', kind: 'cozy', price: 80, size: 24 },
  { id: 'rug', slot: 'rug', kind: 'cozy', price: 100, size: 32 },
  { id: 'ball', slot: 'floor', kind: null, price: 70, size: 24 },
  { id: 'blocks', slot: 'floor', kind: null, price: 70, size: 24 },
  { id: 'drum', slot: 'floor', kind: null, price: 160, size: 24 },
  { id: 'shelf', slot: 'floor', kind: null, price: 200, size: 32 },
  { id: 'picture', slot: 'wall', kind: null, price: 130, size: 24 },
  { id: 'chest', slot: 'floor', kind: null, price: 260, size: 32 },
];

export const DECOR_IDS: readonly DecorId[] = DECOR.map((d) => d.id);

const BY_ID = new Map<DecorId, DecorDef>(DECOR.map((d) => [d.id, d]));

export function decorDef(id: DecorId): DecorDef {
  const def = BY_ID.get(id);
  if (!def) throw new Error(`unknown decor: ${id}`);
  return def;
}
