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
export type DishId =
  | 'steak'
  | 'acquapazza'
  | 'cake'
  | 'onigiri'
  | 'omurice'
  | 'seafoodbowl'
  | 'friedshrimp'
  | 'hamburg'
  | 'stirfry'
  | 'mushroomsoup'
  | 'nutcookie'
  | 'fruittart';
export type CookedDish = DishId | 'mystery';
export type FoodId = 'rice' | 'candy' | IngredientId | CookedDish;
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
  /** awake minutes spent in each room this stage */
  roomMinutes: Partial<Record<RoomId, number>>;
  /** feed, play, clean and medicine results this stage */
  care: number;
  /** the part of `care` given in the morning */
  morningCare: number;
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

export type OutingKind = 'fishing' | 'hunting' | 'gathering';
export type Crop = 'veggie' | 'fruit';

/** Outings played on one local day; a new day starts the counts over. */
export interface OutingLog {
  day: string;
  used: Record<OutingKind, number>;
}

export interface Farm {
  crop: Crop | null;
  growMinLeft: number;
  watered: boolean;
}

/** What the pet has gathered and grown; lives beside the game so a new egg keeps it. */
export interface Kitchen {
  pantry: Pantry;
  outings: OutingLog;
  farm: Farm;
  /** Recipes found so far, in discovery order, no repeats. */
  recipes: DishId[];
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
  /** the room the pet grew up in this stage */
  room?: RoomId;
  /** the most common decor kind in that room */
  decorKind?: DecorKind;
  /** the accessory worn at the moment of evolution */
  wearing?: AccessoryId;
  /** at least 10 care this stage, half or more of it in the morning */
  morningCare?: true;
  chance?: number;
}

/** What evolution reads of the home. `room` is the room shown this minute. */
export interface EvolutionEnv {
  room: RoomId;
  decorIn(room: RoomId): readonly DecorId[];
  worn: Partial<Record<WearPlace, AccessoryId>>;
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
  | 'noPoop'
  | 'noStock'
  | 'outingLimit'
  | 'farmNotReady'
  | 'pantryFull'
  | 'locked'
  | 'owned'
  | 'noCoins'
  | 'noSlot'
  | 'notOwned'
  | 'wrongSlot'
  | 'wrongPlace';

export interface CareOutcome {
  action: CareAction['kind'] | 'forage' | 'farm' | 'cook' | 'sell' | 'setRoom' | 'buy' | 'place' | 'wear';
  result: 'ok' | 'refused';
  reason?: RefuseReason;
}

export interface CareResult {
  pet: PetState;
  outcome: CareOutcome;
  events: GameEvent[];
}

export type RoomId =
  | 'home' | 'garden' | 'beach' | 'forest' | 'sweets' | 'snowfield'
  | 'castle' | 'washitsu' | 'space' | 'cabin' | 'library';

export type DecorId =
  | 'candle' | 'lamp' | 'fishbowl' | 'vase' | 'plant' | 'cactus' | 'bonsai'
  | 'bunting' | 'telescope' | 'clock' | 'musicbox' | 'toypiano' | 'lantern' | 'petbed'
  | 'trophy' | 'globe' | 'xmastree' | 'armchair' | 'cushion' | 'table' | 'stool' | 'rug'
  | 'ball' | 'blocks' | 'drum' | 'shelf' | 'picture' | 'chest';
export type DecorKind = 'light' | 'water' | 'plant' | 'sky' | 'gadget' | 'night' | 'sparkle' | 'cozy';
export type SlotId = 'wallL' | 'wallR' | 'ceiling' | 'rug' | 'floorL' | 'floorR';
export type SlotKind = 'wall' | 'ceiling' | 'rug' | 'floor';

/** A box in stage pixels. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type AccessoryId =
  | 'ribbon' | 'crown' | 'partyhat' | 'tophat' | 'beret' | 'strawhat' | 'flowercrown' | 'chefhat'
  | 'beanie' | 'santahat' | 'tiara' | 'cap' | 'wizardhat' | 'headphones' | 'flowerpin' | 'starclip' | 'leaf'
  | 'glasses' | 'sunglasses' | 'heartglasses'
  | 'bowtie' | 'scarf' | 'bell' | 'medal' | 'necklace';

export type WearPlace = 'head' | 'face' | 'neck';

/** Where the pet lives: the room the player chose, the furniture bought and placed, and the accessories bought and worn. */
export interface Home {
  room: RoomId;
  ownedDecor: DecorId[];
  decor: Partial<Record<RoomId, Partial<Record<SlotId, DecorId>>>>;
  ownedAcc: AccessoryId[];
  worn: Partial<Record<WearPlace, AccessoryId>>;
}

export type MissionKind = 'clean' | 'play' | 'feed' | 'outing' | 'harvest' | 'cook';
export type MissionTierNo = 1 | 2 | 3;
export type RewardId = 'ending:first' | `zukan:${number}` | `mission:${MissionKind}:${MissionTierNo}`;
export type RecentReason = RewardId | 'ending:departed' | 'ending:dead';

export interface RecentReward {
  reason: RecentReason;
  coins: number;
  at: number;
}

export interface Progress {
  coins: number;
  counts: Record<MissionKind, number>;
  claimed: RewardId[];
  /** Newest first, at most RECENT_MAX. */
  recent: RecentReward[];
  unseen: boolean;
}
