import { readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { checkImage, requiredSpritePaths } from '../../scripts/art/lib';
import { FOODS } from '@/data/foods';
import { FORMS } from '@/data/forms';
import { BACKGROUND_IDS, COOK_ART_IDS, EFFECT_IDS, GAME_ART_IDS, ICON_IDS, OUTING_ART_IDS, OUTING_ART_SIZE } from '@/ui/assets';
import palette from './palette.json';

const sprite = { width: 32, height: 32, palette, transparentCorners: true };
const sized = (n: number) => ({ width: n, height: n, palette, transparentCorners: true });
const SMALL_ICONS = new Set<string>([
  'feed', 'play', 'outing', 'clean', 'medicine', 'lights', 'zukan', 'settings', 'back',
  'shop', 'coin',
  'heart_full', 'heart_half', 'heart_empty',
]);
const GAME_ART_SIZE: Record<string, number> = { rock: 16, cup: 32, treat: 16 };
const TOOLBAR_ICONS = [16, 48, 128] as const;
/** Foods with bites taken out (scripts/art/bite.ts), shown while the pet eats. */
const BITTEN_FOODS = FOODS.flatMap((f) => [1, 2].map((n) => `src/assets/ui/food/${f.id}_bite${n}.png`));

/** Every PNG the popup bundles (assets.ts globs all of src/assets). */
function shippedPngs(dir = 'src/assets'): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return shippedPngs(p);
    return e.name.endsWith('.png') ? [p] : [];
  });
}

function checkedPngs(): Set<string> {
  return new Set([
    ...requiredSpritePaths(FORMS),
    ...ICON_IDS.map((id) => `src/assets/ui/icons/${id}.png`),
    ...EFFECT_IDS.map((id) => `src/assets/ui/effects/${id}.png`),
    ...GAME_ART_IDS.map((id) => `src/assets/ui/game/${id}.png`),
    ...OUTING_ART_IDS.map((id) => `src/assets/ui/outing/${id}.png`),
    ...COOK_ART_IDS.map((id) => `src/assets/ui/cook/${id}.png`),
    ...BACKGROUND_IDS.map((id) => `src/assets/ui/bg/${id}.png`),
    ...BITTEN_FOODS,
    'src/assets/ui/frame.png',
  ]);
}

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
  test.each(BITTEN_FOODS)('bitten food %s', (p) => {
    expect(checkImage(p, sprite)).toEqual([]);
  });
  test.each(GAME_ART_IDS)('game art %s', (id) => {
    expect(checkImage(`src/assets/ui/game/${id}.png`, sized(GAME_ART_SIZE[id] ?? 0))).toEqual([]);
  });
  test.each(COOK_ART_IDS)('cook art %s', (id) => {
    expect(checkImage(`src/assets/ui/cook/${id}.png`, sized(32))).toEqual([]);
  });
  test.each(OUTING_ART_IDS)('outing art %s', (id) => {
    expect(checkImage(`src/assets/ui/outing/${id}.png`, sized(OUTING_ART_SIZE[id]))).toEqual([]);
  });
  test.each(BACKGROUND_IDS)('background %s', (id) => {
    const opts = { width: 88, height: 68, palette, transparentCorners: false };
    expect(checkImage(`src/assets/ui/bg/${id}.png`, opts)).toEqual([]);
  });
  test('panel frame', () => {
    expect(checkImage('src/assets/ui/frame.png', sized(24))).toEqual([]);
  });
  test.each(TOOLBAR_ICONS)('toolbar icon %spx', (n) => {
    expect(checkImage(`public/icon/${n}.png`, sized(n))).toEqual([]);
  });
  test('every bundled PNG is one of the checked files above', () => {
    const checked = checkedPngs();
    expect(shippedPngs().filter((p) => !checked.has(p))).toEqual([]);
  });
});
