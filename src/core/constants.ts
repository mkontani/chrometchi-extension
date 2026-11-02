import type { Settings, Stage } from './types';

export const TICK_MAX_GAP_MS = 3 * 60_000;

/** Minutes awake per stage (adult value = minutes until departure). */
export const STAGE_MINUTES: Readonly<Record<Stage, number>> = {
  egg: 30,
  baby: 120,
  child: 360,
  young: 900,
  adult: 1440,
};

/** Per awake minute. */
export const HUNGER_DECAY: Readonly<Record<Stage, number>> = {
  egg: 0,
  baby: 0.8,
  child: 0.5,
  young: 0.4,
  adult: 0.35,
};

export const MOOD_DECAY: Readonly<Record<Stage, number>> = {
  egg: 0,
  baby: 0.6,
  child: 0.4,
  young: 0.35,
  adult: 0.3,
};

export const VITALITY = { zeroNeedLoss: 0.5, sickLoss: 0.5, recover: 0.2, recoverAbove: 50 } as const;
export const MISTAKE_AFTER_MIN = 15;
/** moodDecayPerPoop: extra mood decay per awake minute for each poop left on the floor. */
export const POOP = { delayMin: 30, max: 4, sickAfterMin: 120, moodDecayPerPoop: 0.1 } as const;
export const SUGAR = { sickAt: 3, decayEveryMin: 60 } as const;
export const MEDICINE_DOSES = 2;
export const PET_ACTION = { cooldownMin: 10, mood: 5 } as const;
export const PLAY = { winMood: 30, loseMood: 10, weightLoss: 1 } as const;
export const EVOLVE_MOOD_BONUS = 20;
/** vitality <= */
export const WARNING = { danger: 50, critical: 25 } as const;
export const DEATH_GRACE_MIN = 60;
export const LIGHTS_MISTAKE_MOOD = 10;

/** heavy >= base x 1.5, light <= base x 0.8 */
export const BASE_WEIGHT: Readonly<Record<Stage, number>> = {
  egg: 1,
  baby: 5,
  child: 10,
  young: 20,
  adult: 30,
};

export const DEFAULT_SETTINGS: Readonly<Settings> = {
  notifications: true,
  sound: false,
  sleepStartMin: 1320,
  sleepEndMin: 420,
};

export const NOTIFY_THROTTLE_MS = 30 * 60_000;
