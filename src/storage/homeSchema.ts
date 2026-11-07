import { z } from 'zod';
import type { Home, RoomId } from '@/core/types';
import { ROOM_IDS } from '@/data/rooms';

const ROOM_ID_SET = new Set<string>(ROOM_IDS);
const isRoomId = (v: unknown): v is RoomId => typeof v === 'string' && ROOM_ID_SET.has(v);

/** Never fails: anything that is not a known room id becomes home, so loading can never reset the save. */
export function parseHome(raw: unknown): Home {
  const room = typeof raw === 'object' && raw !== null ? (raw as { room?: unknown }).room : undefined;
  return { room: isRoomId(room) ? room : 'home' };
}

/** preprocess (not transform) so a save with no `home` key still reaches the parser. */
export const homeSchema = z.preprocess(parseHome, z.custom<Home>());
