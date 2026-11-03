import { z } from 'zod';
import type { CareAction, CareOutcome, Settings } from '@/core/types';
import type { RoamFrames } from '@/roam/frames';
import { hostnameSchema, settingsSchema, type SaveV1 } from '@/storage/schema';

export type EngineRequest =
  | { type: 'sync' }
  | { type: 'care'; action: CareAction }
  | { type: 'ackCritical' }
  | { type: 'updateSettings'; patch: Partial<Settings> }
  | { type: 'restart' }
  | { type: 'startNewEgg' }
  | { type: 'dismissNotice'; notice: 'renewal' | 'dataReset' }
  /** The only request a content script may send: hide the roaming pet on its site. */
  | { type: 'hideRoamSite'; host: string };

/** Content script → background: the current pet's sprites (answered outside the engine). */
export type RoamFramesResponse =
  | { ok: true; key: string; frames: RoamFrames }
  | { ok: false; error: string };

export type EngineResponse =
  | { ok: true; save: SaveV1; outcome?: CareOutcome }
  | { ok: false; error: string };

const careActionSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('feed'),
    food: z.enum(['rice', 'meat', 'fish', 'veggie', 'cake', 'candy']),
  }),
  z.object({
    kind: z.literal('play'),
    game: z.enum(['catch', 'cups', 'stop']),
    won: z.boolean(),
  }),
  z.object({ kind: z.literal('clean') }),
  z.object({ kind: z.literal('medicine') }),
  z.object({ kind: z.literal('lights'), on: z.boolean() }),
  z.object({ kind: z.literal('pet') }),
]);

const requestSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('sync') }),
  z.object({ type: z.literal('care'), action: careActionSchema }),
  z.object({ type: z.literal('ackCritical') }),
  z.object({ type: z.literal('updateSettings'), patch: settingsSchema.partial() }),
  z.object({ type: z.literal('restart') }),
  z.object({ type: z.literal('startNewEgg') }),
  z.object({
    type: z.literal('dismissNotice'),
    notice: z.enum(['renewal', 'dataReset']),
  }),
  z.object({ type: z.literal('hideRoamSite'), host: hostnameSchema }),
]);

export function parseEngineRequest(raw: unknown): EngineRequest | null {
  const parsed = requestSchema.safeParse(raw);
  return parsed.success ? (parsed.data as EngineRequest) : null;
}
