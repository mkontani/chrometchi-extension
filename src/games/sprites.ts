import type { GameArtId } from '@/ui/assets';

/** The subset of HTMLImageElement the cache relies on (injectable for tests). */
export interface LoadableImage {
  src: string;
  readonly complete: boolean;
  readonly naturalWidth: number;
}

export interface SpriteCache {
  /** The loaded image, or null while it is loading, missing or broken. */
  get(id: GameArtId): CanvasImageSource | null;
}

const isLoaded = (img: LoadableImage | null): img is LoadableImage =>
  img !== null && img.complete && img.naturalWidth > 0;

/** Starts loading `url` now; the getter returns the image once it has loaded, else null. */
export function loadSprite(
  url: string | null,
  makeImage: () => LoadableImage = () => new Image(),
): () => CanvasImageSource | null {
  if (!url) return () => null;
  const img = makeImage();
  img.src = url;
  return () => (isLoaded(img) ? (img as unknown as CanvasImageSource) : null);
}

export function createSpriteCache(
  urlOf: (id: GameArtId) => string | null,
  makeImage: () => LoadableImage = () => new Image(),
): SpriteCache {
  const sprites = new Map<GameArtId, () => CanvasImageSource | null>();
  return {
    get(id) {
      const cached = sprites.get(id);
      if (cached) return cached();
      const loaded = loadSprite(urlOf(id), makeImage);
      sprites.set(id, loaded);
      return loaded();
    },
  };
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Draws pixel art without smoothing, or a flat box while the sprite is unavailable. */
export function drawSprite(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource | null,
  box: Box,
  fallbackColor: string,
): void {
  if (img) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, box.x, box.y, box.w, box.h);
    return;
  }
  ctx.fillStyle = fallbackColor;
  ctx.fillRect(box.x, box.y, box.w, box.h);
}
