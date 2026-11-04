export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
}

export interface ImageDraw {
  img: unknown;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface RecordedCanvas {
  ctx: CanvasRenderingContext2D;
  rects: Rect[];
  images: ImageDraw[];
  texts: string[];
  /** The last value assigned to each context property, such as imageSmoothingEnabled. */
  props: Record<string, unknown>;
  /** The color of the last fillRect covering the pixel, or undefined when nothing was filled there. */
  pixel(x: number, y: number): string | undefined;
}

/** A 2D context that records fillRect, drawImage and fillText calls and ignores everything else. */
export function recordCanvas(): RecordedCanvas {
  const rects: Rect[] = [];
  const images: ImageDraw[] = [];
  const texts: string[] = [];
  const props: Record<string, unknown> = {};
  let fillStyle = '';
  const calls: Record<string, unknown> = {
    fillRect: (x: number, y: number, w: number, h: number) => rects.push({ x, y, w, h, color: fillStyle }),
    drawImage: (img: unknown, x: number, y: number, w: number, h: number) => images.push({ img, x, y, w, h }),
    fillText: (text: string) => texts.push(text),
  };
  const ctx = new Proxy({} as CanvasRenderingContext2D, {
    get: (_t, key) => (key === 'fillStyle' ? fillStyle : (calls[key as string] ?? (() => undefined))),
    set: (_t, key, value) => {
      props[String(key)] = value;
      if (key === 'fillStyle') fillStyle = String(value);
      return true;
    },
  });
  const pixel = (x: number, y: number): string | undefined =>
    [...rects].reverse().find((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h)?.color;
  return { ctx, rects, images, texts, props, pixel };
}
