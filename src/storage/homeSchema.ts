import { z } from 'zod';
import type { Home, RoomId } from '@/core/types';
import { ROOM_IDS } from '@/data/rooms';

const ROOM_ID_SET = new Set<string>(ROOM_IDS);
const isRoomId = (v: unknown): v is RoomId => typeof v === 'string' && ROOM_ID_SET.has(v);

/** Never fails: anything that is not a known room id becomes home, so loading can never reset the save. */
export function parseHome(raw: unknown): Home {
  const fields = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
  // Other fields pass through so a save never loses what a newer stage stored next to `room`.
  return { ...fields, room: isRoomId(fields.room) ? fields.room : 'home' };
}

/** preprocess (not transform) so a save with no `home` key still reaches the parser. */
export const homeSchema = z.preprocess(parseHome, z.custom<Home>());
