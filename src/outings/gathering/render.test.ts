import { describe, expect, test } from 'vitest';
import { recordCanvas } from '../__fixtures__/canvas';
import type { OutingView } from '../types';
import { BUSHES } from './constants';
import { forageAmount } from '@/core/outings';
import { gatheringGame, type GatheringState } from './logic';
import { renderGathering } from './render';

const none = Array.from({ length: BUSHES }, () => false);
const base: GatheringState = { elapsed: 0, cursor: 0, nuts: none, flipped: none, flips: 1, found: 2 };
const withArt = (map: Record<string, CanvasImageSource>): OutingView => ({ player: null, art: (id) => map[id] ?? null });

describe('gathering counters', () => {
  test('show the bush icon with the flips left and the nuts icon with the haul found nuts earn', () => {
    const { ctx, images, texts } = recordCanvas();
    const bush = {} as CanvasImageSource;
    const nuts = {} as CanvasImageSource;
    renderGathering(ctx, base, withArt({ hud_bush: bush, hud_nuts: nuts }));
    expect(images.filter((i) => i.img === bush)).toEqual([{ img: bush, x: 4, y: 160, w: 16, h: 16 }]);
    expect(images.filter((i) => i.img === nuts)).toEqual([{ img: nuts, x: 40, y: 160, w: 16, h: 16 }]);
    expect(texts).toEqual(['3', '×3']);
  });

  test.each([[0, 1], [1, 1], [2, 3], [3, 4]])('the nuts counter for %i found is x%i', (found, haul) => {
    const { ctx, texts } = recordCanvas();
    renderGathering(ctx, { ...base, found }, withArt({}));
    expect(texts).toEqual(['3', `×${haul}`]);
    expect(haul).toBe(forageAmount(gatheringGame.score({ ...base, found })));
  });

  test('fall back to colored squares without the art', () => {
    const { ctx, images, rects } = recordCanvas();
    renderGathering(ctx, base, withArt({}));
    expect(images).toEqual([]);
    expect(rects.some((r) => r.x === 4 && r.y === 169 && r.w === 7 && r.color === '#4caf50')).toBe(true);
    expect(rects.some((r) => r.x === 40 && r.y === 169 && r.w === 7 && r.color === '#a8703a')).toBe(true);
  });
});
