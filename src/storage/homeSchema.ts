import { z } from 'zod';
import type { DecorId, Home, RoomId, SlotId } from '@/core/types';
import { DECOR_IDS, decorDef } from '@/data/decor';
import { ROOM_IDS } from '@/data/rooms';
import { ROOM_SLOTS, SLOT_IDS, SLOT_KIND } from '@/data/slots';

const ROOM_ID_SET = new Set<string>(ROOM_IDS);
const isRoomId = (v: unknown): v is RoomId => typeof v === 'string' && ROOM_ID_SET.has(v);

const DECOR_ID_SET = new Set<string>(DECOR_IDS);
const isDecorId = (v: unknown): v is DecorId => typeof v === 'string' && DECOR_ID_SET.has(v);
const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** Known ids only, repeats dropped (the first stays). */
function parseOwned(raw: unknown): DecorId[] {
  return Array.isArray(raw) ? [...new Set(raw.filter(isDecorId))] : [];
}

/** One room's slots: only slots the room has, owned items of the right kind, each item once (first slot wins). */
function parseRoomSlots(room: RoomId, raw: unknown, owned: ReadonlySet<DecorId>): Partial<Record<SlotId, DecorId>> {
  if (!isRecord(raw)) return {};
  const used = new Set<DecorId>();
  const out: Partial<Record<SlotId, DecorId>> = {};
  for (const slot of SLOT_IDS) {
    const item = raw[slot];
    if (!ROOM_SLOTS[room][slot] || !isDecorId(item) || !owned.has(item)) continue;
    if (decorDef(item).slot !== SLOT_KIND[slot] || used.has(item)) continue;
    used.add(item);
    out[slot] = item;
  }
  return out;
}

function parseDecor(raw: unknown, ownedDecor: readonly DecorId[]): Home['decor'] {
  if (!isRecord(raw)) return {};
  const owned = new Set(ownedDecor);
  const entries = ROOM_IDS.map((room) => [room, parseRoomSlots(room, raw[room], owned)] as const).filter(
    ([, slots]) => Object.keys(slots).length > 0,
  );
  return Object.fromEntries(entries);
}

/** Never fails: anything unusable is cleaned away or reset to its default, so loading can never reset the save. */
export function parseHome(raw: unknown): Home {
  const fields = isRecord(raw) ? raw : {};
  const ownedDecor = parseOwned(fields.ownedDecor);
  // Other fields pass through so a save never loses what a newer stage stored next to `room`.
  return {
    ...fields,
    room: isRoomId(fields.room) ? fields.room : 'home',
    ownedDecor,
    decor: parseDecor(fields.decor, ownedDecor),
  };
}

/** preprocess (not transform) so a save with no `home` key still reaches the parser. */
export const homeSchema = z.preprocess(parseHome, z.custom<Home>());
