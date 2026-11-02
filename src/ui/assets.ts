import { FOODS } from '@/data/foods';
import { GAMES } from '@/data/games';
import type { FoodId, FormId, GameId, Pose } from '@/core/types';

const FILES = import.meta.glob('/src/assets/**/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

export type IconId =
  | 'feed' | 'play' | 'clean' | 'medicine' | 'lights' | 'zukan' | 'settings'
  | 'heart_full' | 'heart_half' | 'heart_empty' | 'back'
  | `food_${FoodId}`
  | `game_${GameId}`;
export type EffectId = 'poop' | 'zzz' | 'sweat' | 'sparkle' | 'note' | 'skull' | 'pill';
export type BackgroundId = 'room_day' | 'room_night';

export const ICON_IDS: readonly IconId[] = [
  'feed', 'play', 'clean', 'medicine', 'lights', 'zukan', 'settings',
  'heart_full', 'heart_half', 'heart_empty', 'back',
  ...FOODS.map((f) => `food_${f.id}` as const),
  ...GAMES.map((g) => `game_${g}` as const),
];
export const EFFECT_IDS: readonly EffectId[] = [
  'poop', 'zzz', 'sweat', 'sparkle', 'note', 'skull', 'pill',
];
export const BACKGROUND_IDS: readonly BackgroundId[] = ['room_day', 'room_night'];

const lookup = (path: string): string | null => FILES[`/src/assets/${path}.png`] ?? null;

export function spriteUrl(formId: FormId, pose: Pose): string {
  return (
    lookup(`sprites/${formId}/${pose}`) ??
    lookup(`sprites/${formId}/idle0`) ??
    (lookup('sprites/_placeholder/idle0') as string)
  );
}

export const iconUrl = (id: IconId): string | null => lookup(`ui/icons/${id}`);
export const effectUrl = (id: EffectId): string | null => lookup(`ui/effects/${id}`);
export const backgroundUrl = (id: BackgroundId): string | null => lookup(`ui/bg/${id}`);
