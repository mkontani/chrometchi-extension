import { describe, expect, test } from 'vitest';
import { recordCanvas } from '../__fixtures__/canvas';
import type { OutingView } from '../types';
import type { HuntingState } from './logic';
import { renderHunting } from './render';

const base: HuntingState = { elapsed: 0, cursor: 2, caught: 0, sinceSpawn: 0, pop: null, burst: null };
const withArt = (map: Record<string, CanvasImageSource>): OutingView => ({ player: null, art: (id) => map[id] ?? null });

describe('hunting counter', () => {
  test('shows the meat icon and the caught count', () => {
    const { ctx, images, texts } = recordCanvas();
    const meat = {} as CanvasImageSource;
    renderHunting(ctx, { ...base, caught: 4 }, withArt({ hud_meat: meat }));
    expect(images.filter((i) => i.img === meat)).toEqual([{ img: meat, x: 4, y: 160, w: 16, h: 16 }]);
    expect(texts).toEqual(['×4']);
  });

  test('falls back to a ground-colored square without the art', () => {
    const { ctx, images, rects } = recordCanvas();
    renderHunting(ctx, base, withArt({}));
    expect(images).toEqual([]);
    expect(rects.some((r) => r.x === 4 && r.y === 169 && r.w === 7 && r.color === '#a5d66b')).toBe(true);
  });
});
