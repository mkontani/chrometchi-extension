import { z } from 'zod';
import type { GameState, PetState, Settings, Zukan } from '@/core/types';
import { DEFAULT_SETTINGS, MAX_HIDDEN_SITES } from '@/core/constants';

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
  settings: z.preprocess(withDefaultSettings, settingsSchema),
  meta: metaSchema,
});
