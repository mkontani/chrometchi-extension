export type Stage = 'egg' | 'baby' | 'child' | 'young' | 'adult';
export type FormId = string;
export type IngredientId =
  | 'fish'
  | 'shrimp'
  | 'meat'
  | 'egg'
  | 'nuts'
  | 'mushroom'
  | 'veggie'
  | 'fruit';
export type FoodId = 'rice' | 'candy' | 'cake' | IngredientId;
export type Pantry = Partial<Record<FoodId, number>>;
export type Gained = Pantry;
export type FoodTag = 'grain' | 'meat' | 'fish' | 'veggie' | 'sweet';
export type GameId = 'catch' | 'cups' | 'stop';
export type Family =
  | 'none'
  | 'solar'
  | 'lunar'
  | 'earth'
  | 'water'
  | 'wind'
  | 'metal'
  | 'ether'
  | 'heavy';
export type Lifecycle = 'alive' | 'dead' | 'departed';
export type WarningLevel = 'none' | 'notice' | 'danger' | 'critical';
export type Pose = 'idle0' | 'idle1' | 'happy' | 'eat' | 'sick' | 'sleep' | 'sad';
export type IdleState = 'active' | 'idle' | 'locked';
export type MistakeReason = 'hunger' | 'mood' | 'poop' | 'lights';
export type Rng = () => number; // [0,1)

/** 0..100 except weight (>= 1) */
export interface Stats {
  hunger: number;
  mood: number;
  vitality: number;
  weight: number;
}

export interface Episodes {
  hungerZeroMin: number;
  moodZeroMin: number;
  poopMin: number;
  lightsOnAsleepMin: number;
  hungerMistakeTaken: boolean;
  moodMistakeTaken: boolean;
  lightsMistakeTaken: boolean;
}

/** counts are per stage */
export interface CareHistory {
  totalMistakes: number;
  stageMistakes: number;
  foodCounts: Record<FoodTag, number>;
  gameCounts: Record<GameId, number>;
}

export interface PetState {
  formId: FormId;
  stage: Stage;
  lifecycle: Lifecycle;
  stats: Stats;
  awakeMinutes: number;
  stageMinutes: number;
  poops: number;
  poopTimers: number[];
  sick: boolean;
  medicineNeeded: number;
  sugar: number;
  sugarDecayMin: number;
  asleep: boolean;
  lightsOn: boolean;
  /** in awakeMinutes */
  lastPetAt: number | null;
  /** in awakeMinutes */
  criticalSeenAt: number | null;
  episodes: Episodes;
  history: CareHistory;
  path: FormId[];
}

export interface GameState {
  pet: PetState;
  generation: number;
  lastTickAt: number;
}

export interface Settings {
  notifications: boolean;
  sound: boolean;
  sleepStartMin: number;
  sleepEndMin: number;
  /** The pet walks along the bottom of web pages (needs optional host access). */
  roam: boolean;
  /** Hostnames where the roaming pet stays hidden. */
  roamHiddenSites: string[];
}

export interface Memory {
  generation: number;
  finalForm: FormId;
  path: FormId[];
  awakeMinutes: number;
  ending: 'dead' | 'departed';
  endedAt: number;
}

export interface Zukan {
  discovered: FormId[];
  memories: Memory[];
}

export type GameEvent =
  | { type: 'hatched'; to: FormId }
  | { type: 'evolved'; from: FormId; to: FormId }
  | { type: 'hungry' }
  | { type: 'unhappy' }
  | { type: 'pooped' }
  | { type: 'sick' }
  | { type: 'warning'; level: WarningLevel }
  | { type: 'mistake'; reason: MistakeReason }
  | { type: 'fellAsleep' }
  | { type: 'wokeUp' }
  | { type: 'died' }
  | { type: 'departed' };

export interface StepResult {
  pet: PetState;
  events: GameEvent[];
}

export interface EvolutionCondition {
  minStageMistakes?: number;
  maxStageMistakes?: number;
  maxTotalMistakes?: number;
  dominantFood?: FoodTag[];
  dominantGame?: GameId;
  weight?: 'light' | 'normal' | 'heavy';
  /** local [start, end) */
  hours?: [number, number];
  chance?: number;
}

export interface FormDef {
  id: FormId;
  stage: Stage;
  family: Family;
  from: FormId[];
  when: EvolutionCondition;
  priority: number;
  motif: string;
}

export interface FoodDef {
  id: FoodId;
  tag: FoodTag;
  kind: 'meal' | 'snack';
  hunger: number;
  mood: number;
  weight: number;
  vitality: number;
}

export type CareAction =
  | { kind: 'feed'; food: FoodId }
  | { kind: 'play'; game: GameId; won: boolean }
  | { kind: 'clean' }
  | { kind: 'medicine' }
  | { kind: 'lights'; on: boolean }
  | { kind: 'pet' };

export type RefuseReason =
  | 'full'
  | 'notSick'
  | 'asleep'
  | 'awake'
  | 'notAlive'
  | 'egg'
  | 'cooldown'
  | 'noPoop';

export interface CareOutcome {
  action: CareAction['kind'];
  result: 'ok' | 'refused';
  reason?: RefuseReason;
}

export interface CareResult {
  pet: PetState;
  outcome: CareOutcome;
  events: GameEvent[];
}
