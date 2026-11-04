import { describe, expect, test } from 'vitest';
import type { GameId } from '@/core/types';
import { createRng } from '@/core/rng';
import { recordCanvas } from '@/outings/__fixtures__/canvas';
import { ART_HUD_TOP, ART_ICON, drawArtCounter, drawCounter, HUD_TOP } from './hud';
import { MINI_GAMES } from './registry';
import { NO_VIEW, type GameInput } from './types';

/** A 2D context that ignores drawing but records every string drawn with fillText. */
function recordingContext(): { ctx: CanvasRenderingContext2D; texts: string[] } {
  const texts: string[] = [];
  const ctx = new Proxy({} as CanvasRenderingContext2D, {
    get: (_target, key) => (key === 'fillText' ? (text: string) => texts.push(text) : () => undefined),
    set: () => true,
  });
  return { ctx, texts };
}

function playAndRender(id: GameId): string[] {
  const def = MINI_GAMES[id];
  const rng = createRng(7);
  const { ctx, texts } = recordingContext();
  let state = def.init(rng);
  for (let frame = 0; frame < 600 && !def.isOver(state); frame++) {
    const input: GameInput = { left: frame % 7 === 0, right: frame % 5 === 0, action: frame % 9 === 0, pick: frame % 11 === 0 ? frame % 3 : null };
    state = def.step(state, 100, input, rng);
    def.render(ctx, state, NO_VIEW);
  }
  return texts;
}

describe('mini-game HUD text is language-neutral', () => {
  test.each(['catch', 'cups', 'stop'] as const)('%s draws only numbers and symbols', (id) => {
    const texts = playAndRender(id);
    expect(texts.length).toBeGreaterThan(0);
    for (const text of texts) expect(text).not.toMatch(/\p{L}/u);
  });
});

describe('drawArtCounter', () => {
  test('draws the art at its native size, crisp, with the label to its right', () => {
    const { ctx, images, texts, rects, props } = recordCanvas();
    const art = {} as CanvasImageSource;
    drawArtCounter(ctx, 4, art, '#123456', '×3');
    expect(images).toEqual([{ img: art, x: 4, y: 176 - ART_ICON, w: ART_ICON, h: ART_ICON }]);
    expect(props.imageSmoothingEnabled).toBe(false);
    expect(texts).toEqual(['×3']);
    expect(rects).toEqual([]);
  });

  test('falls back to the colored square of drawCounter when the art is not loaded', () => {
    const art = recordCanvas();
    drawArtCounter(art.ctx, 4, null, '#123456', '×3');
    const plain = recordCanvas();
    drawCounter(plain.ctx, 4, '#123456', '×3');
    expect(art.images).toEqual([]);
    expect(art.rects).toEqual(plain.rects);
    expect(art.texts).toEqual(plain.texts);
  });

  test('the art strip is taller than the old HUD strip and sits below it', () => {
    expect(ART_HUD_TOP).toBe(176 - ART_ICON);
    expect(ART_HUD_TOP).toBeLessThan(HUD_TOP);
  });
});
