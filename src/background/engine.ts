import { advanceTime } from '@/core/advance';
import { applyCare } from '@/core/care';
import { recordEnding, startNextGeneration, unlockFromEvents } from '@/core/lifecycle';
import { lightsNeedTurningOff } from '@/core/sleep';
import { acknowledgeCritical, deriveWarning } from '@/core/warnings';
import type {
  CareOutcome,
  GameEvent,
  IdleState,
  Rng,
  Settings,
  WarningLevel,
} from '@/core/types';
import { parseEngineRequest, type EngineRequest, type EngineResponse } from '@/messaging/protocol';
import { addHiddenSite } from '@/roam/sites';
import { settingsSchema, type SaveMeta, type SaveV1 } from '@/storage/schema';
import type { SaveRepository } from '@/storage/repository';
import { createSerialQueue } from './queue';

export interface Notifier {
  notify(
    events: GameEvent[],
    ctx: {
      settings: Settings;
      asleep: boolean;
      /** a hatched pet whose lights are still on, so a bedtime reminder is useful */
      lightsReminder: boolean;
      now: number;
      lastNotified: SaveMeta['lastNotified'];
    },
  ): Promise<SaveMeta['lastNotified']>;
}

export interface Badge {
  update(level: WarningLevel): Promise<void>;
}

export interface EngineDeps {
  repo: SaveRepository;
  now: () => number;
  rng: Rng;
  queryIdle: () => Promise<IdleState>;
  notifier: Notifier;
  badge: Badge;
  reportError(err: unknown, context: string): void;
}

export interface Engine {
  tick(): Promise<SaveV1>;
  handle(raw: unknown): Promise<EngineResponse>;
}

interface Mutation {
  save: SaveV1;
  events: GameEvent[];
  outcome?: CareOutcome;
}

type Mutator = (save: SaveV1, now: number) => Mutation;

const noMutation: Mutator = (save) => ({ save, events: [] });

const withPet = (save: SaveV1, pet: SaveV1['game']['pet']): SaveV1 => ({
  ...save,
  game: { ...save.game, pet },
});

function mutatorFor(req: EngineRequest): Mutator {
  switch (req.type) {
    case 'sync':
      return noMutation;
    case 'care':
      return (save) => {
        const r = applyCare(save.game.pet, req.action);
        return { save: withPet(save, r.pet), events: r.events, outcome: r.outcome };
      };
    case 'ackCritical':
      return (save) => ({ save: withPet(save, acknowledgeCritical(save.game.pet)), events: [] });
    case 'updateSettings':
      return (save) => {
        const parsed = settingsSchema.safeParse({ ...save.settings, ...req.patch });
        if (!parsed.success) throw new Error('invalid settings');
        return { save: { ...save, settings: parsed.data }, events: [] };
      };
    case 'restart':
      return (save, now) => ({
        save: { ...save, game: startNextGeneration(save.game, now) },
        events: [],
      });
    case 'startNewEgg':
      return (save, now) => {
        if (save.game.pet.lifecycle === 'alive') throw new Error('pet is alive');
        return { save: { ...save, game: startNextGeneration(save.game, now) }, events: [] };
      };
    case 'dismissNotice':
      return (save) => {
        const key = req.notice === 'renewal' ? 'showRenewal' : 'showDataReset';
        return { save: { ...save, meta: { ...save.meta, [key]: false } }, events: [] };
      };
    case 'hideRoamSite':
      return (save) => {
        const roamHiddenSites = addHiddenSite(save.settings.roamHiddenSites, req.host);
        return { save: { ...save, settings: { ...save.settings, roamHiddenSites } }, events: [] };
      };
  }
}

function bookkeepZukan(save: SaveV1, events: GameEvent[], now: number): SaveV1 {
  let zukan = unlockFromEvents(save.zukan, events);
  if (events.some((e) => e.type === 'died' || e.type === 'departed')) {
    zukan = recordEnding(zukan, save.game, now);
  }
  return zukan === save.zukan ? save : { ...save, zukan };
}

/** Unlock-only bookkeeping for events of a mutation (the game it ended may already be replaced). */
function unlockOnly(save: SaveV1, events: GameEvent[]): SaveV1 {
  const zukan = unlockFromEvents(save.zukan, events);
  return zukan === save.zukan ? save : { ...save, zukan };
}

export function createEngine(deps: EngineDeps): Engine {
  const enqueue = createSerialQueue();

  async function notifyBestEffort(save: SaveV1, events: GameEvent[], now: number) {
    const { pet } = save.game;
    try {
      return await deps.notifier.notify(events, {
        settings: save.settings,
        asleep: pet.asleep,
        lightsReminder: lightsNeedTurningOff(pet),
        now,
        lastNotified: save.meta.lastNotified,
      });
    } catch (err) {
      deps.reportError(err, 'notify');
      return save.meta.lastNotified;
    }
  }

  async function updateBadgeBestEffort(save: SaveV1): Promise<void> {
    const { pet } = save.game;
    try {
      await deps.badge.update(pet.lifecycle === 'alive' ? deriveWarning(pet) : 'none');
    } catch (err) {
      deps.reportError(err, 'badge');
    }
  }

  async function runOperation(mutate: Mutator): Promise<Mutation> {
    const now = deps.now();
    const loaded = await deps.repo.load();
    const idle = await deps.queryIdle();
    const advanced = advanceTime(loaded.game, {
      now,
      settings: loaded.settings,
      idle,
      rng: deps.rng,
    });
    const afterAdvance = bookkeepZukan({ ...loaded, game: advanced.game }, advanced.events, now);
    const mutation = mutate(afterAdvance, now);
    const events = [...advanced.events, ...mutation.events];
    const withZukan = unlockOnly(mutation.save, mutation.events);
    const lastNotified = await notifyBestEffort(withZukan, events, now);
    const save: SaveV1 = { ...withZukan, meta: { ...withZukan.meta, lastNotified } };
    await deps.repo.save(save);
    await updateBadgeBestEffort(save);
    return { ...mutation, save };
  }

  return {
    tick: () => enqueue(async () => (await runOperation(noMutation)).save),
    async handle(raw) {
      const req = parseEngineRequest(raw);
      if (req === null) return { ok: false, error: 'invalid request' };
      try {
        const { save, outcome } = await enqueue(() => runOperation(mutatorFor(req)));
        return outcome === undefined ? { ok: true, save } : { ok: true, save, outcome };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    },
  };
}
