import { expect, test } from 'vitest';
import {
  BACKGROUND_IDS,
  EFFECT_IDS,
  GAME_ART_IDS,
  ICON_IDS,
  backgroundUrl,
  effectUrl,
  foodUrl,
  gameArtUrl,
  iconUrl,
  spriteUrl,
} from '@/ui/assets';
import { FOODS } from '@/data/foods';

test('spriteUrl falls back to the plain egg for forms without art', () => {
  expect(spriteUrl('nope', 'happy')).toContain('/sprites/egg/plain/idle0');
});

test('egg sprites follow the generation pattern, other forms ignore it', () => {
  expect(spriteUrl('egg', 'idle0', 1)).toContain('/sprites/egg/plain/idle0');
  expect(spriteUrl('egg', 'idle0', 2)).toContain('/sprites/egg/dots/idle0');
  expect(spriteUrl('egg', 'happy', 4)).toContain('/sprites/egg/stars/idle0');
  expect(spriteUrl('baby_puni', 'idle0', 3)).toContain('/sprites/baby_puni/idle0');
});

test('every UI id resolves to a shipped file', () => {
  for (const id of ICON_IDS) expect(iconUrl(id), id).toBeTruthy();
  for (const id of EFFECT_IDS) expect(effectUrl(id), id).toBeTruthy();
  for (const id of BACKGROUND_IDS) expect(backgroundUrl(id), id).toBeTruthy();
  for (const id of GAME_ART_IDS) expect(gameArtUrl(id), id).toBeTruthy();
});

test('id lists are complete', () => {
  expect(ICON_IDS).toContain('food_rice');
  expect(ICON_IDS).toContain('game_stop');
  expect(ICON_IDS).toHaveLength(11 + 11 + 3);
  expect(EFFECT_IDS).toHaveLength(12);
  expect(EFFECT_IDS).toEqual(expect.arrayContaining(['crumb', 'dust0', 'dust1', 'dust2', 'star']));
  expect(BACKGROUND_IDS).toEqual(['room_day', 'room_night']);
  expect(GAME_ART_IDS).toEqual(['rock', 'cup', 'treat']);
});

test('every food has a whole and two bitten pictures', () => {
  for (const f of FOODS) {
    expect(foodUrl(f.id, 0)).toBe(iconUrl(`food_${f.id}`));
    expect(foodUrl(f.id, 1), f.id).toContain(`/ui/food/${f.id}_bite1`);
    expect(foodUrl(f.id, 2), f.id).toContain(`/ui/food/${f.id}_bite2`);
  }
});
