import { advanceTime } from '@/core/advance';
import { applyCare, CARE_KINDS } from '@/core/care';
import { recordEnding, startNextGeneration, unlockFromEvents } from '@/core/lifecycle';
import { feedFromPantry } from '@/core/pantry';
import { cook, type Cooked } from '@/core/cooking';
import { farmAction, growFarm } from '@/core/farm';
import { buyDecor, placeDecor } from '@/core/decor';
import { buyAccessory, takeOffAll, wear } from '@/core/dressup';
import { markSeen } from '@/core/progress';
import { sellFood } from '@/core/shop';
import { forage } from '@/core/outings';
import { roomRefusal } from '@/core/rooms';
import { evolutionEnv } from '@/core/home-env';
import { countCare } from '@/core/care-count';
import { minuteOfDay } from '@/core/clock';
import { lightsNeedTurningOff } from '@/core/sleep';
import { acknowledgeCritical, deriveWarning } from '@/core/warnings';
import type {
  CareAction,
  CareOutcome,
  GameEvent,
  Gained,
  IdleState,
  MissionKind,
  PetState,
  Rng,
  Settings,
  WarningLevel,
} from '@/core/types';
import { parseEngineRequest, type EngineRequest, type EngineResponse } from '@/messaging/protocol';
import { addHiddenSite } from '@/roam/sites';
import { settingsSchema, type SaveMeta, type SaveV1 } from '@/storage/schema';
import type { SaveRepository } from '@/storage/repository';
import { bookkeepProgress } from './progress';
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
  gained?: Gained;
  cooked?: Cooked;
  /** the mission this operation counts toward; set only when the outcome is ok */
  mission?: MissionKind;
  /** the player has seen the rewards; applied after bookkeeping so a reward paid now does not relight the dot */
  seen?: boolean;
}

type Mutator = (save: SaveV1, now: number) => Mutation;

const noMutation: Mutator = (save) => ({ save, events: [] });

const missionIfOk = (outcome: CareOutcome, mission: MissionKind): { mission?: MissionKind } =>
  outcome.result === 'ok' ? { mission } : {};

const withPet = (save: SaveV1, pet: SaveV1['game']['pet']): SaveV1 => ({
  ...save,
  game: { ...save.game, pet },
});

function forageMutator(req: Extract<EngineRequest, { type: 'forage' }>, rng: Rng): Mutator {
  return (save, now) => {
    const r = forage({ pet: save.game.pet, kitchen: save.kitchen, kind: req.kind, score: req.score, now, rng });
    const gained = r.outcome.result === 'ok' ? r.gained : undefined;
    return { save: { ...save, kitchen: r.kitchen }, events: [], outcome: r.outcome, gained, ...missionIfOk(r.outcome, 'outing') };
  };
}

function farmMutator(req: Extract<EngineRequest, { type: 'farm' }>): Mutator {
  return (save) => {
    const r = farmAction({ pet: save.game.pet, kitchen: save.kitchen, action: req.action });
    const gained = r.outcome.result === 'ok' && req.action.op === 'harvest' ? r.gained : undefined;
    const mission = req.action.op === 'harvest' ? missionIfOk(r.outcome, 'harvest') : {};
    return { save: { ...save, kitchen: r.kitchen }, events: [], outcome: r.outcome, gained, ...mission };
  };
}

/** The pet with this care counted toward its stage history, when it was a counted kind and went through. */
function withCareCounted(pet: PetState, kind: CareAction['kind'], outcome: CareOutcome, save: SaveV1, now: number): PetState {
  if (outcome.result !== 'ok' || !CARE_KINDS.has(kind)) return pet;
  return { ...pet, history: countCare(pet.history, minuteOfDay(now), save.settings.sleepEndMin) };
}

function careMutator(action: CareAction): Mutator {
  return (save, now) => {
    const r = applyCare(save.game.pet, action);
    const kind = action.kind === 'clean' || action.kind === 'play' ? action.kind : null;
    const mission = kind === null ? {} : missionIfOk(r.outcome, kind);
    const pet = withCareCounted(r.pet, action.kind, r.outcome, save, now);
    return { save: withPet(save, pet), events: r.events, outcome: r.outcome, ...mission };
  };
}

function cookMutator(req: Extract<EngineRequest, { type: 'cook' }>): Mutator {
  return (save) => {
    const r = cook({ pet: save.game.pet, kitchen: save.kitchen, items: req.items });
    const cooked = r.outcome.result === 'ok' && r.cooked !== null ? r.cooked : undefined;
    return { save: { ...save, kitchen: r.kitchen }, events: [], outcome: r.outcome, cooked, ...missionIfOk(r.outcome, 'cook') };
  };
}

function feedMutator(food: Extract<CareAction, { kind: 'feed' }>): Mutator {
  return (save, now) => {
    const fed = feedFromPantry(save.game.pet, save.kitchen.pantry, food);
    const pet = withCareCounted(fed.result.pet, 'feed', fed.result.outcome, save, now);
    const next = { ...withPet(save, pet), kitchen: { ...save.kitchen, pantry: fed.pantry } };
    return { save: next, events: fed.result.events, outcome: fed.result.outcome, ...missionIfOk(fed.result.outcome, 'feed') };
  };
}

function sellMutator(req: Extract<EngineRequest, { type: 'sell' }>): Mutator {
  return (save) => {
    const r = sellFood({ pantry: save.kitchen.pantry, progress: save.progress, food: req.food, amount: req.amount });
    const next = { ...save, kitchen: { ...save.kitchen, pantry: r.pantry }, progress: r.progress };
    return { save: next, events: [], outcome: r.outcome };
  };
}

function setRoomMutator(req: Extract<EngineRequest, { type: 'setRoom' }>): Mutator {
  return (save) => {
    const reason = roomRefusal(save.game.pet, save.progress.claimed, req.room);
    if (reason !== null) return { save, events: [], outcome: { action: 'setRoom', result: 'refused', reason } };
    return { save: { ...save, home: { ...save.home, room: req.room } }, events: [], outcome: { action: 'setRoom', result: 'ok' } };
  };
}

function buyMutator(req: Extract<EngineRequest, { type: 'buyDecor' }>): Mutator {
  return (save) => {
    const r = buyDecor({ progress: save.progress, home: save.home, decor: req.decor });
    return { save: { ...save, progress: r.progress, home: r.home }, events: [], outcome: r.outcome };
  };
}

function placeMutator(req: Extract<EngineRequest, { type: 'placeDecor' }>): Mutator {
  return (save) => {
    const { room, slot, decor } = req;
    const r = placeDecor({ pet: save.game.pet, claimed: save.progress.claimed, home: save.home, room, slot, decor });
    return { save: { ...save, home: r.home }, events: [], outcome: r.outcome };
  };
}

function buyAccMutator(req: Extract<EngineRequest, { type: 'buyAccessory' }>): Mutator {
  return (save) => {
    const r = buyAccessory({ progress: save.progress, home: save.home, acc: req.acc });
    return { save: { ...save, progress: r.progress, home: r.home }, events: [], outcome: r.outcome };
  };
}

function wearMutator(req: Extract<EngineRequest, { type: 'wear' }>): Mutator {
  return (save) => {
    const r = wear({ pet: save.game.pet, home: save.home, place: req.place, acc: req.acc });
    return { save: { ...save, home: r.home }, events: [], outcome: r.outcome };
  };
}

/** A new egg: the next generation starts undressed, the items stay owned. */
const newEgg = (save: SaveV1, now: number): SaveV1 => ({
  ...save,
  game: startNextGeneration(save.game, now),
  home: takeOffAll(save.home),
});

function mutatorFor(req: EngineRequest, rng: Rng): Mutator {
  switch (req.type) {
    case 'sync':
      return noMutation;
    case 'care':
      return req.action.kind === 'feed' ? feedMutator(req.action) : careMutator(req.action);
    case 'forage':
      return forageMutator(req, rng);
    case 'farm':
      return farmMutator(req);
    case 'cook':
      return cookMutator(req);
    case 'sell':
      return sellMutator(req);
    case 'setRoom':
      return setRoomMutator(req);
    case 'buyDecor':
      return buyMutator(req);
    case 'placeDecor':
      return placeMutator(req);
    case 'buyAccessory':
      return buyAccMutator(req);
    case 'wear':
      return wearMutator(req);
    case 'seenRewards':
      return (save) => ({ save, events: [], seen: true });
    case 'ackCritical':
      return (save) => ({ save: withPet(save, acknowledgeCritical(save.game.pet)), events: [] });
    case 'updateSettings':
      return (save) => {
        const parsed = settingsSchema.safeParse({ ...save.settings, ...req.patch });
        if (!parsed.success) throw new Error('invalid settings');
        return { save: { ...save, settings: parsed.data }, events: [] };
      };
    case 'restart':
      return (save, now) => ({ save: newEgg(save, now), events: [] });
    case 'startNewEgg':
      return (save, now) => {
        if (save.game.pet.lifecycle === 'alive') throw new Error('pet is alive');
        return { save: newEgg(save, now), events: [] };
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

/** Clears the reward dot; returns `save` itself when it was already clear. */
function withSeen(save: SaveV1): SaveV1 {
  return save.progress.unseen ? { ...save, progress: markSeen(save.progress) } : save;
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
      env: evolutionEnv(loaded.home, loaded.progress.claimed),
    });
    const grown = { ...loaded.kitchen, farm: growFarm(loaded.kitchen.farm, advanced.minutes) };
    const afterAdvance = bookkeepZukan(
      { ...loaded, game: advanced.game, kitchen: grown },
      advanced.events,
      now,
    );
    const mutation = mutate(afterAdvance, now);
    const events = [...advanced.events, ...mutation.events];
    const unlocked = unlockOnly(mutation.save, mutation.events);
    const bookkept = bookkeepProgress(unlocked, { events, mission: mutation.mission, now });
    const settled = mutation.seen ? withSeen(bookkept) : bookkept;
    const lastNotified = await notifyBestEffort(settled, events, now);
    const save: SaveV1 = { ...settled, meta: { ...settled.meta, lastNotified } };
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
        const { save, outcome, gained, cooked } = await enqueue(() =>
          runOperation(mutatorFor(req, deps.rng)),
        );
        return {
          ok: true,
          save,
          ...(outcome === undefined ? {} : { outcome }),
          ...(gained === undefined ? {} : { gained }),
          ...(cooked === undefined ? {} : { cooked }),
        };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    },
  };
}
