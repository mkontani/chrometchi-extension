import { expect, test, vi } from 'vitest';
import { createSpriteCache, drawSprite, loadSprite, type LoadableImage } from './sprites';

function fakeImage(): LoadableImage & { src: string } {
  return { src: '', complete: false, naturalWidth: 0 };
}

test('sprite cache returns null until the image has loaded, then the image', () => {
  const made: Array<ReturnType<typeof fakeImage>> = [];
  const cache = createSpriteCache(
    (id) => `/art/${id}.png`,
    () => {
      const img = fakeImage();
      made.push(img);
      return img;
    },
  );
  expect(cache.get('treat')).toBeNull();
  expect(made).toHaveLength(1);
  expect(made[0]?.src).toBe('/art/treat.png');
  Object.assign(made[0] ?? {}, { complete: true, naturalWidth: 16 });
  expect(cache.get('treat')).toBe(made[0]);
  expect(made).toHaveLength(1);
});

test('sprite cache never loads ids without a file', () => {
  const make = vi.fn(fakeImage);
  const cache = createSpriteCache(() => null, make);
  expect(cache.get('rock')).toBeNull();
  expect(cache.get('rock')).toBeNull();
  expect(make).not.toHaveBeenCalled();
});

test('sprite cache treats a broken image (complete, zero width) as missing', () => {
  const cache = createSpriteCache(
    () => '/x.png',
    () => ({ src: '', complete: true, naturalWidth: 0 }),
  );
  expect(cache.get('cup')).toBeNull();
});

test('loadSprite starts loading at once and returns the image only after it has loaded', () => {
  const img = fakeImage();
  const get = loadSprite('/sprites/puni/idle0.png', () => img);
  expect(img.src).toBe('/sprites/puni/idle0.png');
  expect(get()).toBeNull();
  Object.assign(img, { complete: true, naturalWidth: 32 });
  expect(get()).toBe(img);
});

test('loadSprite without a url never creates an image', () => {
  const make = vi.fn(fakeImage);
  const get = loadSprite(null, make);
  expect(get()).toBeNull();
  expect(make).not.toHaveBeenCalled();
});

function fakeCtx() {
  return {
    fillStyle: '',
    imageSmoothingEnabled: true,
    fillRect: vi.fn(),
    drawImage: vi.fn(),
  };
}

test('drawSprite draws the image crisp when present', () => {
  const ctx = fakeCtx();
  const img = { complete: true, naturalWidth: 16 } as unknown as CanvasImageSource;
  drawSprite(ctx as unknown as CanvasRenderingContext2D, img, { x: 1, y: 2, w: 16, h: 16 }, '#fff');
  expect(ctx.imageSmoothingEnabled).toBe(false);
  expect(ctx.drawImage).toHaveBeenCalledWith(img, 1, 2, 16, 16);
  expect(ctx.fillRect).not.toHaveBeenCalled();
});

test('drawSprite falls back to a colored box', () => {
  const ctx = fakeCtx();
  drawSprite(ctx as unknown as CanvasRenderingContext2D, null, { x: 3, y: 4, w: 12, h: 10 }, '#abc');
  expect(ctx.fillStyle).toBe('#abc');
  expect(ctx.fillRect).toHaveBeenCalledWith(3, 4, 12, 10);
  expect(ctx.drawImage).not.toHaveBeenCalled();
});
