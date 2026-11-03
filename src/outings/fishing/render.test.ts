import { describe, expect, test } from 'vitest';
import { recordCanvas } from '../__fixtures__/canvas';
import type { OutingView } from '../types';
import { BITE_MS } from './logic';
import type { FishingState } from './logic';
import { FLOAT_X, FLOAT_Y, LINE_COLOR, PET_BOX, renderFishing, ROD_TIP, ROD_COLOR } from './render';

const NO_ART: OutingView = { player: null, art: () => null };
const wait: FishingState = { elapsed: 0, phase: 'wait', phaseMs: 0, waitMs: 1500, catches: 0 };
const bite: FishingState = { ...wait, phase: 'bite', phaseMs: BITE_MS / 2 };

const withArt = (map: Record<string, CanvasImageSource>): OutingView => ({ player: null, art: (id) => map[id] ?? null });

describe('fishing scene', () => {
  test('the counter shows the fish icon and the catch count', () => {
    const { ctx, images, texts } = recordCanvas();
    const fish = {} as CanvasImageSource;
    renderFishing(ctx, { ...wait, catches: 3 }, withArt({ hud_fish: fish }));
    expect(images.filter((i) => i.img === fish)).toEqual([{ img: fish, x: 4, y: 160, w: 16, h: 16 }]);
    expect(texts).toEqual(['×3']);
  });

  test('the counter falls back to a water-colored square without the art', () => {
    const { ctx, images, rects } = recordCanvas();
    renderFishing(ctx, wait, NO_ART);
    expect(images).toEqual([]);
    expect(rects.some((r) => r.x === 4 && r.y === 169 && r.w === 7 && r.color === '#4a90d9')).toBe(true);
  });


  test.each([['wait', wait, 0], ['bite', bite, 4]] as const)('the line hangs straight down from the rod tip in the %s phase', (_n, s, dip) => {
    const { ctx, pixel } = recordCanvas();
    renderFishing(ctx, s, NO_ART);
    const floatTop = FLOAT_Y + dip;
    expect(floatTop).toBeGreaterThan(ROD_TIP.y + 4);
    for (let y = ROD_TIP.y + 3; y < floatTop; y++) {
      expect(pixel(ROD_TIP.x, y), `line pixel at y=${y}`).toBe(LINE_COLOR);
      expect(pixel(ROD_TIP.x - 1, y)).not.toBe(LINE_COLOR);
      expect(pixel(ROD_TIP.x + 1, y)).not.toBe(LINE_COLOR);
    }
  });

  test('the line stays above the float and is longer when the float dips', () => {
    const lineLength = (s: FishingState): number => {
      const { ctx, pixel } = recordCanvas();
      renderFishing(ctx, s, NO_ART);
      let n = 0;
      for (let y = 0; y < 180; y++) if (pixel(ROD_TIP.x, y) === LINE_COLOR) n++;
      return n;
    };
    expect(lineLength(bite)).toBe(lineLength(wait) + 4);
  });

  test('a rod reaches from the pet to the tip', () => {
    const { ctx, pixel } = recordCanvas();
    renderFishing(ctx, wait, NO_ART);
    for (let x = PET_BOX.x + PET_BOX.w; x <= ROD_TIP.x; x++) {
      const column = Array.from({ length: 180 }, (_v, y) => pixel(x, y));
      expect(column.filter((c) => c === ROD_COLOR).length, `rod pixels at x=${x}`).toBeGreaterThanOrEqual(2);
    }
  });

  test('the rod has a black outline', () => {
    const { ctx, pixel } = recordCanvas();
    renderFishing(ctx, wait, NO_ART);
    const x = (PET_BOX.x + PET_BOX.w + ROD_TIP.x) >> 1;
    const column = Array.from({ length: 180 }, (_v, y) => pixel(x, y));
    const first = column.indexOf(ROD_COLOR);
    expect(column[first - 1]).toBe('#000000');
  });

  test('the float is drawn on the water at the tip column', () => {
    const { ctx, images } = recordCanvas();
    const float = {} as CanvasImageSource;
    renderFishing(ctx, wait, { player: null, art: (id) => (id === 'float' ? float : null) });
    const drawn = images.find((i) => i.img === float);
    expect(drawn).toMatchObject({ y: FLOAT_Y, x: FLOAT_X });
    expect(FLOAT_X + (drawn?.w ?? 0) / 2).toBe(ROD_TIP.x);
  });
});
