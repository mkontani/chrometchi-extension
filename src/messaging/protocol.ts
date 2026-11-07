import { z } from 'zod';
import { POT_MAX, type Cooked } from '@/core/cooking';
import { PANTRY_MAX } from '@/core/constants';
import type { FarmOp } from '@/core/farm';
import type {
  CareAction,
  CareOutcome,
  DecorId,
  Gained,
  IngredientId,
  OutingKind,
  RoomId,
  Settings,
  SlotId,
} from '@/core/types';
import { DECOR_IDS } from '@/data/decor';
import { FOOD_IDS, INGREDIENT_IDS } from '@/data/foods';
import { OUTING_KINDS } from '@/data/outings';
import { ROOM_IDS } from '@/data/rooms';
import { SLOT_IDS } from '@/data/slots';
import { POT_ITEMS, type PotItem } from '@/data/recipes';
import type { RoamFrames } from '@/roam/frames';
import { hostnameSchema, settingsSchema, type SaveV1 } from '@/storage/schema';

export type EngineRequest =
  | { type: 'sync' }
  | { type: 'care'; action: CareAction }
  | { type: 'forage'; kind: OutingKind; score: number }
  | { type: 'farm'; action: FarmOp }
  | { type: 'cook'; items: PotItem[] }
  | { type: 'sell'; food: IngredientId; amount: number }
  | { type: 'setRoom'; room: RoomId }
  | { type: 'buyDecor'; decor: DecorId }
  | { type: 'placeDecor'; room: RoomId; slot: SlotId; decor: DecorId | null }
  | { type: 'seenRewards' }
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
  | { ok: true; save: SaveV1; outcome?: CareOutcome; gained?: Gained; cooked?: Cooked }
  | { ok: false; error: string };

const careActionSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('feed'),
    food: z.enum(FOOD_IDS),
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

const farmOpSchema = z.discriminatedUnion('op', [
  z.object({ op: z.literal('plant'), crop: z.enum(['veggie', 'fruit']) }),
  z.object({ op: z.literal('water') }),
  z.object({ op: z.literal('harvest') }),
]);

const requestSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('sync') }),
  z.object({ type: z.literal('care'), action: careActionSchema }),
  z.object({
    type: z.literal('forage'),
    kind: z.enum(OUTING_KINDS as [OutingKind, ...OutingKind[]]),
    score: z.number().int().min(0).max(100),
  }),
  z.object({ type: z.literal('farm'), action: farmOpSchema }),
  z.object({ type: z.literal('cook'), items: z.array(z.enum(POT_ITEMS)).min(1).max(POT_MAX) }),
  z.object({
    type: z.literal('sell'),
    food: z.enum(INGREDIENT_IDS as [IngredientId, ...IngredientId[]]),
    amount: z.number().int().min(1).max(PANTRY_MAX),
  }),
  z.object({ type: z.literal('setRoom'), room: z.enum(ROOM_IDS) }),
  z.object({ type: z.literal('buyDecor'), decor: z.enum(DECOR_IDS as [DecorId, ...DecorId[]]) }),
  z.object({
    type: z.literal('placeDecor'),
    room: z.enum(ROOM_IDS),
    slot: z.enum(SLOT_IDS as [SlotId, ...SlotId[]]),
    decor: z.enum(DECOR_IDS as [DecorId, ...DecorId[]]).nullable(),
  }),
  z.object({ type: z.literal('seenRewards') }),
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
