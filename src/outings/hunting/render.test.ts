import { describe, expect, test } from 'vitest';
import { recordCanvas } from '../__fixtures__/canvas';
import type { OutingView } from '../types';
import { forageAmount } from '@/core/outings';
import { huntingGame, type HuntingState } from './logic';
import { PICK_BOTTOM, PICK_TOP, tuftX } from './constants';
import { POP_SIZE, renderHunting } from './render';

const base: HuntingState = { elapsed: 0, cursor: 2, caught: 0, sinceSpawn: 0, pop: null, burst: null };
const withArt = (map: Record<string, CanvasImageSource>): OutingView => ({ player: null, art: (id) => map[id] ?? null });

describe('hunting counter', () => {
  test('shows the meat icon', () => {
    const { ctx, images } = recordCanvas();
    const meat = {} as CanvasImageSource;
    renderHunting(ctx, { ...base, caught: 4 }, withArt({ hud_meat: meat }));
    expect(images.filter((i) => i.img === meat)).toEqual([{ img: meat, x: 4, y: 160, w: 16, h: 16 }]);
  });

  test.each([[0, 1], [3, 1], [4, 2], [7, 3], [10, 4], [12, 4]])(
    'shows the haul %i caught earn: x%i',
    (caught, haul) => {
      const { ctx, texts } = recordCanvas();
      renderHunting(ctx, { ...base, caught }, withArt({}));
      expect(texts).toEqual([`×${haul}`]);
      expect(haul).toBe(forageAmount(huntingGame.score({ ...base, caught })));
    },
  );

  test('falls back to a ground-colored square without the art', () => {
    const { ctx, images, rects } = recordCanvas();
    renderHunting(ctx, base, withArt({}));
    expect(images).toEqual([]);
    expect(rects.some((r) => r.x === 4 && r.y === 169 && r.w === 7 && r.color === '#a5d66b')).toBe(true);
  });
});

describe('hunting pop', () => {
  const pop = (egg: boolean): HuntingState => ({ ...base, pop: { tuft: 1, ageMs: 0, windowMs: 700, egg } });
  const boar = {} as CanvasImageSource;
  const chicken = {} as CanvasImageSource;
  const food = {} as CanvasImageSource;
  const art = withArt({ boar, chicken, food_meat: food, food_egg: food });

  test('a boar pops out of the tuft for meat, drawn at its native 24px size', () => {
    const { ctx, images } = recordCanvas();
    renderHunting(ctx, pop(false), art);
    expect(POP_SIZE).toBe(24);
    expect(images.filter((i) => i.img === boar)).toEqual([
      { img: boar, x: tuftX(1) + 2, y: expect.any(Number), w: 24, h: 24 },
    ]);
    expect(images.some((i) => i.img === chicken || i.img === food)).toBe(false);
  });

  test('a chicken pops out for an egg', () => {
    const { ctx, images } = recordCanvas();
    renderHunting(ctx, pop(true), art);
    expect(images.filter((i) => i.img === chicken)).toHaveLength(1);
    expect(images.some((i) => i.img === boar || i.img === food)).toBe(false);
  });

  test('the animal sits inside the tap band so a tap on it picks its tuft', () => {
    const { ctx, images } = recordCanvas();
    renderHunting(ctx, pop(false), art);
    const drawn = images.find((i) => i.img === boar);
    expect(drawn?.y).toBeGreaterThanOrEqual(PICK_TOP);
    expect((drawn?.y ?? 0) + POP_SIZE).toBeLessThanOrEqual(PICK_BOTTOM);
  });

  test.each([[false, '#c0623b'], [true, '#fff3d6']])('falls back to a flat box without the art (egg=%s)', (egg, color) => {
    const { ctx, images, rects } = recordCanvas();
    renderHunting(ctx, pop(egg), withArt({}));
    expect(images).toEqual([]);
    expect(rects.some((r) => r.w === 24 && r.h === 24 && r.color === color)).toBe(true);
  });

  test('catching just sends the animal back into the grass with the star burst', () => {
    const { ctx, images, rects } = recordCanvas();
    renderHunting(ctx, { ...base, caught: 1, burst: { tuft: 1, ageMs: 100 } }, art);
    expect(images.some((i) => i.img === boar || i.img === chicken)).toBe(false);
    expect(rects.filter((r) => r.color === '#ffd93b')).toHaveLength(8);
  });
});
