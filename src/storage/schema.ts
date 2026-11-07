import { z } from 'zod';
import type { DishId, GameState, Kitchen, Home, Pantry, PetState, Progress, RoomId, Settings, Zukan } from '@/core/types';
import { DEFAULT_SETTINGS, MAX_HIDDEN_SITES, PANTRY_MAX } from '@/core/constants';
import { EMPTY_KITCHEN } from '@/core/kitchen';
import { ROOM_IDS } from '@/data/rooms';
import { DISH_IDS, FOOD_IDS } from '@/data/foods';
import { OUTING_KINDS } from '@/data/outings';
import { homeSchema } from './homeSchema';
import { progressSchema } from './progressSchema';

/** The single list of notification kinds; the type and the save schema both derive from it. */
export const NOTIFY_KINDS = [
  'hungry',
  'unhappy',
  'pooped',
  'sick',
  'danger',
  'critical',
  'hatched',
  'evolved',
  'died',
  'departed',
  'fellAsleep',
] as const;
export type NotifyKind = (typeof NOTIFY_KINDS)[number];

export interface SaveMeta {
  lastNotified: Partial<Record<NotifyKind, number>>;
  showRenewal: boolean;
  showDataReset: boolean;
}

export interface SaveV1 {
  version: 1;
  game: GameState;
  zukan: Zukan;
  kitchen: Kitchen;
  progress: Progress;
  home: Home;
  settings: Settings;
  meta: SaveMeta;
}

export const SAVE_KEY = 'chrometchi:v1';
export const LEGACY_KEYS = ['chrometchiState', 'chrometchiCatalog', 'chrometchiSettings'] as const;

export interface KeyValueArea {
  get(keys: string[]): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(keys: string[]): Promise<void>;
}

const count = z.number().nonnegative();
const percent = z.number().min(0).max(100);
const nullableNumber = z.number().nullable();
const minuteOfDay = z.number().int().min(0).max(1439);

const statsSchema = z.object({
  hunger: percent,
  mood: percent,
  vitality: percent,
  weight: count,
});

const episodesSchema = z.object({
  hungerZeroMin: count,
  moodZeroMin: count,
  poopMin: count,
  lightsOnAsleepMin: count,
  hungerMistakeTaken: z.boolean(),
  moodMistakeTaken: z.boolean(),
  lightsMistakeTaken: z.boolean(),
});

const wholeCount = (v: unknown): number =>
  typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 ? v : 0;

const KNOWN_ROOMS = new Set<string>(ROOM_IDS);

/** Rooms this build does not know are dropped; bad counts become 0. Never fails. */
function parseRoomMinutes(raw: unknown): Partial<Record<RoomId, number>> {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return {};
  return Object.fromEntries(
    Object.entries(raw)
      .filter(([room]) => KNOWN_ROOMS.has(room))
      .map(([room, minutes]) => [room, wholeCount(minutes)]),
  );
}

const historySchema = z.object({
  totalMistakes: count,
  stageMistakes: count,
  foodCounts: z.object({
    grain: count,
    meat: count,
    fish: count,
    veggie: count,
    sweet: count,
  }),
  gameCounts: z.object({ catch: count, cups: count, stop: count }),
  roomMinutes: z.preprocess(parseRoomMinutes, z.record(z.string(), z.number())),
  care: z.preprocess(wholeCount, z.number()),
  morningCare: z.preprocess(wholeCount, z.number()),
});

const petSchema: z.ZodType<PetState> = z.object({
  formId: z.string(),
  stage: z.enum(['egg', 'baby', 'child', 'young', 'adult']),
  lifecycle: z.enum(['alive', 'dead', 'departed']),
  stats: statsSchema,
  awakeMinutes: count,
  stageMinutes: count,
  poops: count,
  poopTimers: z.array(z.number()),
  sick: z.boolean(),
  medicineNeeded: count,
  sugar: count,
  sugarDecayMin: count,
  asleep: z.boolean(),
  lightsOn: z.boolean(),
  lastPetAt: nullableNumber,
  criticalSeenAt: nullableNumber,
  episodes: episodesSchema,
  history: historySchema,
  path: z.array(z.string()),
});

const gameSchema: z.ZodType<GameState> = z.object({
  pet: petSchema,
  generation: z.number().int().min(1),
  lastTickAt: z.number(),
});

const memorySchema = z.object({
  generation: z.number(),
  finalForm: z.string(),
  path: z.array(z.string()),
  awakeMinutes: z.number(),
  ending: z.enum(['dead', 'departed']),
  endedAt: z.number(),
});

const zukanSchema: z.ZodType<Zukan> = z.object({
  discovered: z.array(z.string()),
  memories: z.array(memorySchema),
});

const KNOWN_FOODS = new Set<string>(FOOD_IDS);

/** A food this build does not know is dropped rather than failing (and resetting) the save. */
const pantrySchema = z
  .record(z.string(), z.number().int().min(0).max(PANTRY_MAX))
  .transform((counts): Pantry => Object.fromEntries(Object.entries(counts).filter(([f]) => KNOWN_FOODS.has(f))));

const KNOWN_DISHES = new Set<string>(DISH_IDS);

/** Unknown recipe ids and repeats are dropped (first kept) rather than failing the save. */
const recipesSchema = z
  .array(z.string())
  .default([])
  .transform((ids): DishId[] =>
    [...new Set(ids)].filter((id): id is DishId => KNOWN_DISHES.has(id)),
  );

const outingCount = z.number().int().min(0);

const kitchenSchema: z.ZodType<Kitchen> = z.object({
  pantry: pantrySchema,
  outings: z.object({
    day: z.string(),
    used: z.object(
      Object.fromEntries(OUTING_KINDS.map((k) => [k, outingCount])) as Record<
        (typeof OUTING_KINDS)[number],
        typeof outingCount
      >,
    ),
  }),
  farm: z.object({
    crop: z.enum(['veggie', 'fruit']).nullable(),
    growMinLeft: z.number().int().min(0),
    watered: z.boolean(),
  }),
  recipes: recipesSchema,
});

/** Saves written before the kitchen existed get an empty one instead of failing (and resetting). */
const withEmptyKitchen = (raw: unknown): unknown => raw ?? EMPTY_KITCHEN;

/** A bare, lowercase hostname such as `example.com` (no scheme, port or path). */
export const hostnameSchema = z.string().max(253).regex(/^[a-z0-9-]+(\.[a-z0-9-]+)*$/);

/** Strict and default-free: used for patches, so a partial patch never resets other fields. */
export const settingsSchema = z.object({
  notifications: z.boolean(),
  sound: z.boolean(),
  sleepStartMin: minuteOfDay,
  sleepEndMin: minuteOfDay,
  roam: z.boolean(),
  roamHiddenSites: z.array(hostnameSchema).max(MAX_HIDDEN_SITES),
});

/** Saves written before a setting existed get its default instead of failing (and resetting). */
function withDefaultSettings(raw: unknown): unknown {
  const isObject = typeof raw === 'object' && raw !== null && !Array.isArray(raw);
  return isObject ? { ...DEFAULT_SETTINGS, ...raw } : raw;
}

const KNOWN_NOTIFY_KINDS = new Set<string>(NOTIFY_KINDS);
const isNotifyKind = (k: string): k is NotifyKind => KNOWN_NOTIFY_KINDS.has(k);

/**
 * Throttle stamps only. A kind this build does not know (say, from a newer version) is dropped
 * rather than failing the whole save, which would reset the pet and the zukan.
 */
const lastNotifiedSchema = z
  .record(z.string(), z.number())
  .transform((stamps): Partial<Record<NotifyKind, number>> =>
    Object.fromEntries(Object.entries(stamps).filter(([kind]) => isNotifyKind(kind))),
  );

const metaSchema: z.ZodType<SaveMeta> = z.object({
  lastNotified: lastNotifiedSchema,
  showRenewal: z.boolean(),
  showDataReset: z.boolean(),
});

export const saveSchema: z.ZodType<SaveV1> = z.object({
  version: z.literal(1),
  game: gameSchema,
  zukan: zukanSchema,
  kitchen: z.preprocess(withEmptyKitchen, kitchenSchema),
  progress: progressSchema,
  home: homeSchema,
  settings: z.preprocess(withDefaultSettings, settingsSchema),
  meta: metaSchema,
});
