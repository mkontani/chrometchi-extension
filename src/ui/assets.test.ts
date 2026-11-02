import { expect, test } from 'vitest';
import { BACKGROUND_IDS, EFFECT_IDS, ICON_IDS, backgroundUrl, effectUrl, iconUrl, spriteUrl } from '@/ui/assets';

test('spriteUrl falls back to placeholder for unknown forms', () => {
  const placeholder = spriteUrl('_placeholder', 'idle0');
  expect(placeholder).toBeTruthy();
  expect(spriteUrl('nope', 'happy')).toBe(placeholder);
});

test('egg sprites follow the generation pattern, other forms ignore it', () => {
  expect(spriteUrl('egg', 'idle0', 1)).toContain('/sprites/egg/plain/idle0');
  expect(spriteUrl('egg', 'idle0', 2)).toContain('/sprites/egg/dots/idle0');
  expect(spriteUrl('egg', 'happy', 4)).toContain('/sprites/egg/stars/idle0');
  expect(spriteUrl('baby_puni', 'idle0', 3)).toContain('/sprites/baby_puni/idle0');
});

test('iconUrl returns null when the icon file does not exist', () => {
  expect(iconUrl('feed')).toBeNull();
  expect(effectUrl('poop')).toBeNull();
  expect(backgroundUrl('room_day')).toBeNull();
});

test('id lists are complete', () => {
  expect(ICON_IDS).toContain('food_rice');
  expect(ICON_IDS).toContain('game_stop');
  expect(ICON_IDS).toHaveLength(11 + 6 + 3);
  expect(EFFECT_IDS).toHaveLength(7);
  expect(BACKGROUND_IDS).toEqual(['room_day', 'room_night']);
});
