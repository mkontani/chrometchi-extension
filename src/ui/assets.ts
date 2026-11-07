import { eggPattern } from '@/data/eggs';
import { FOODS } from '@/data/foods';
import { GAMES } from '@/data/games';
import { ROOM_IDS } from '@/data/rooms';
import type { OutingArtId } from '@/outings/types';
import type { FoodId, FormId, GameId, Pose, RoomId } from '@/core/types';

const FILES = import.meta.glob('/src/assets/**/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

export type IconId =
  | 'feed' | 'play' | 'outing' | 'clean' | 'medicine' | 'lights' | 'zukan' | 'settings'
  | 'shop' | 'coin' | 'decorate'
  | 'heart_full' | 'heart_half' | 'heart_empty' | 'back'
  | `food_${FoodId}`
  | `game_${GameId}`;
export type EffectId =
  | 'poop' | 'zzz' | 'sweat' | 'sparkle' | 'note' | 'skull' | 'pill'
  | 'crumb' | 'dust0' | 'dust1' | 'dust2' | 'star';
export type CookArtId = 'pot';
/** Each room has a day picture and a night one (shown while the pet sleeps). */
export type BackgroundId = `${RoomId}_day` | `${RoomId}_night`;
export type GameArtId = 'rock' | 'cup' | 'treat';

export const ICON_IDS: readonly IconId[] = [
  'feed', 'play', 'outing', 'clean', 'medicine', 'lights', 'zukan', 'settings',
  'shop', 'coin', 'decorate',
  'heart_full', 'heart_half', 'heart_empty', 'back',
  ...FOODS.map((f) => `food_${f.id}` as const),
  ...GAMES.map((g) => `game_${g}` as const),
];
export const EFFECT_IDS: readonly EffectId[] = [
  'poop', 'zzz', 'sweat', 'sparkle', 'note', 'skull', 'pill',
  'crumb', 'dust0', 'dust1', 'dust2', 'star',
];
/** Art the outing games and the farm row draw (`src/assets/ui/outing/<id>.png`). */
export const OUTING_ART_IDS: readonly OutingArtId[] = [
  'float', 'grass', 'bush', 'sprout', 'sprout_wet', 'can',
  'hud_fish', 'hud_meat', 'hud_nuts', 'hud_bush',
  'boar', 'chicken',
];
export const OUTING_ART_SIZE: Readonly<Record<OutingArtId, number>> = {
  float: 16, grass: 32, bush: 32, sprout: 16, sprout_wet: 16, can: 16,
  hud_fish: 16, hud_meat: 16, hud_nuts: 16, hud_bush: 16,
  boar: 24, chicken: 24,
};
/** Art for the cooking effect (`src/assets/ui/cook/<id>.png`, 32×32). */
export const COOK_ART_IDS: readonly CookArtId[] = ['pot'];
/** `src/assets/ui/bg/<room>_{day,night}.png`, in `ROOM_IDS` order, day then night. */
export const BACKGROUND_IDS: readonly BackgroundId[] = ROOM_IDS.flatMap((r) => [`${r}_day` as const, `${r}_night` as const]);
export const GAME_ART_IDS: readonly GameArtId[] = ['rock', 'cup', 'treat'];

/** The bundled URL of `src/assets/<path>.png`, or null when there is no such file. */
export const assetUrl = (path: string): string | null => FILES[`/src/assets/${path}.png`] ?? null;
const lookup = assetUrl;

/** `generation` only matters for the egg, whose shell pattern changes each generation. */
export function spriteUrl(formId: FormId, pose: Pose, generation = 1): string {
  const dir = formId === 'egg' ? `egg/${eggPattern(generation)}` : formId;
  return (
    lookup(`sprites/${dir}/${pose}`) ??
    lookup(`sprites/${dir}/idle0`) ??
    // assets.test.ts guarantees every form has art; the plain egg is the last resort.
    (lookup('sprites/egg/plain/idle0') as string)
  );
}

export const iconUrl = (id: IconId): string | null => lookup(`ui/icons/${id}`);
export const effectUrl = (id: EffectId): string | null => lookup(`ui/effects/${id}`);
export const cookUrl = (id: CookArtId): string | null => lookup(`ui/cook/${id}`);
export const backgroundUrl = (id: BackgroundId): string | null => lookup(`ui/bg/${id}`);
export const gameArtUrl = (id: GameArtId): string | null => lookup(`ui/game/${id}`);

/** A food picture with `bites` taken out of it: 0 is the whole food (its menu icon). */
export const foodUrl = (food: FoodId, bites: 0 | 1 | 2): string | null =>
  bites === 0 ? iconUrl(`food_${food}`) : lookup(`ui/food/${food}_bite${bites}`);
