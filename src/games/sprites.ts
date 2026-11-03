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

export function createSpriteCache(
  urlOf: (id: GameArtId) => string | null,
  makeImage: () => LoadableImage = () => new Image(),
): SpriteCache {
  const images = new Map<GameArtId, LoadableImage | null>();
  const load = (id: GameArtId): LoadableImage | null => {
    const url = urlOf(id);
    if (!url) return null;
    const img = makeImage();
    img.src = url;
    return img;
  };
  return {
    get(id) {
      if (!images.has(id)) images.set(id, load(id));
      const img = images.get(id);
      return img && img.complete && img.naturalWidth > 0 ? (img as unknown as CanvasImageSource) : null;
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
