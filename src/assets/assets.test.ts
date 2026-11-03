import { describe, expect, test } from 'vitest';
import { checkImage, requiredSpritePaths } from '../../scripts/art/lib';
import { FORMS } from '@/data/forms';
import { BACKGROUND_IDS, EFFECT_IDS, GAME_ART_IDS, ICON_IDS } from '@/ui/assets';
import palette from './palette.json';

const sprite = { width: 32, height: 32, palette, transparentCorners: true };
const sized = (n: number) => ({ width: n, height: n, palette, transparentCorners: true });
const SMALL_ICONS = new Set<string>([
  'feed', 'play', 'clean', 'medicine', 'lights', 'zukan', 'settings', 'back',
  'heart_full', 'heart_half', 'heart_empty',
]);
const GAME_ART_SIZE: Record<string, number> = { rock: 16, cup: 32, treat: 16 };

describe('shipped art is complete and on-palette', () => {
  test.each(requiredSpritePaths(FORMS))('%s', (p) => {
    expect(checkImage(p, sprite)).toEqual([]);
  });
  test.each(ICON_IDS)('icon %s', (id) => {
    expect(checkImage(`src/assets/ui/icons/${id}.png`, sized(SMALL_ICONS.has(id) ? 16 : 32))).toEqual([]);
  });
  test.each(EFFECT_IDS)('effect %s', (id) => {
    expect(checkImage(`src/assets/ui/effects/${id}.png`, sized(16))).toEqual([]);
  });
  test.each(GAME_ART_IDS)('game art %s', (id) => {
    expect(checkImage(`src/assets/ui/game/${id}.png`, sized(GAME_ART_SIZE[id] ?? 0))).toEqual([]);
  });
  test.each(BACKGROUND_IDS)('background %s', (id) => {
    const opts = { width: 88, height: 68, palette, transparentCorners: false };
    expect(checkImage(`src/assets/ui/bg/${id}.png`, opts)).toEqual([]);
  });
  test('panel frame', () => {
    expect(checkImage('src/assets/ui/frame.png', sized(24))).toEqual([]);
  });
});
