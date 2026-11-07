import { expect, test } from 'vitest';
import {
  BACKGROUND_IDS,
  EFFECT_IDS,
  GAME_ART_IDS,
  ICON_IDS,
  accUrl,
  backgroundUrl,
  decorUrl,
  effectUrl,
  foodUrl,
  gameArtUrl,
  iconUrl,
  spriteUrl,
} from '@/ui/assets';
import { ACCESSORY_IDS } from '@/data/accessories';
import { DECOR_IDS } from '@/data/decor';
import { FOODS } from '@/data/foods';
import { ROOM_IDS } from '@/data/rooms';

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
  expect(ICON_IDS).toEqual(expect.arrayContaining(['shop', 'coin', 'decorate']));
  expect(ICON_IDS).toHaveLength(15 + 23 + 3);
  expect(EFFECT_IDS).toHaveLength(12);
  expect(EFFECT_IDS).toEqual(expect.arrayContaining(['crumb', 'dust0', 'dust1', 'dust2', 'star']));
  expect(BACKGROUND_IDS).toEqual([
    'home_day', 'home_night', 'garden_day', 'garden_night', 'beach_day', 'beach_night',
    'forest_day', 'forest_night', 'sweets_day', 'sweets_night', 'snowfield_day', 'snowfield_night',
    'castle_day', 'castle_night', 'washitsu_day', 'washitsu_night', 'space_day', 'space_night',
    'cabin_day', 'cabin_night', 'library_day', 'library_night',
  ]);
  expect(GAME_ART_IDS).toEqual(['rock', 'cup', 'treat']);
});

test('every room has a day and a night picture', () => {
  for (const room of ROOM_IDS) {
    expect(backgroundUrl(`${room}_day`), room).toContain(`/ui/bg/${room}_day`);
    expect(backgroundUrl(`${room}_night`), room).toContain(`/ui/bg/${room}_night`);
  }
});

test('every furniture item has its picture at its size', () => {
  expect(DECOR_IDS).toHaveLength(28);
  for (const id of DECOR_IDS) expect(decorUrl(id), id).toContain(`/ui/decor/${id}`);
});

test('every accessory has its picture at its size', () => {
  expect(ACCESSORY_IDS).toHaveLength(25);
  for (const id of ACCESSORY_IDS) expect(accUrl(id), id).toContain(`/ui/acc/${id}`);
});

test('every food has a whole and two bitten pictures', () => {
  for (const f of FOODS) {
    expect(foodUrl(f.id, 0)).toBe(iconUrl(`food_${f.id}`));
    expect(foodUrl(f.id, 1), f.id).toContain(`/ui/food/${f.id}_bite1`);
    expect(foodUrl(f.id, 2), f.id).toContain(`/ui/food/${f.id}_bite2`);
  }
});
