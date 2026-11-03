import type { PngData } from './lib';

/** Rows [top, bottom] that contain any visible pixel, or null for an empty image. */
function bodyRows(png: PngData): [number, number] | null {
  let top = -1;
  let bottom = -1;
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      if ((png.data[(y * png.width + x) * 4 + 3] ?? 0) > 0) {
        if (top < 0) top = y;
        bottom = y;
        break;
      }
    }
  }
  return top < 0 ? null : [top, bottom];
}

/** Builds a new image where output pixel (x, y) is taken from `from(x, y)` (null = transparent). */
function remap(png: PngData, from: (x: number, y: number) => [number, number] | null): PngData {
  const data = new Uint8Array(png.data.length);
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const src = from(x, y);
      if (!src || src[0] < 0 || src[0] >= png.width || src[1] < 0 || src[1] >= png.height) continue;
      const s = (src[1] * png.width + src[0]) * 4;
      data.set(png.data.subarray(s, s + 4), (y * png.width + x) * 4);
    }
  }
  return { width: png.width, height: png.height, data };
}

/** Number of RGBA channel values (bytes) that differ between row `a` and row `b`. */
function rowDiff(png: PngData, a: number, b: number): number {
  let diff = 0;
  for (let i = 0; i < png.width * 4; i++) {
    if (png.data[a * png.width * 4 + i] !== png.data[b * png.width * 4 + i]) diff++;
  }
  return diff;
}

/** The row to remove: in the lower body (50–85%), the one closest to repeating the row above it. */
function cutRow(png: PngData, top: number, bottom: number): number {
  const span = bottom - top;
  const target = top + Math.round(0.7 * span);
  let best = target;
  let bestScore = Infinity;
  for (let y = top + Math.round(0.5 * span); y <= top + Math.round(0.85 * span); y++) {
    if (y <= top) continue;
    const score = rowDiff(png, y, y - 1) * 100 + Math.abs(y - target);
    if (score < bestScore) {
      best = y;
      bestScore = score;
    }
  }
  return best;
}

/** Idle bounce frame: removes one row low in the body so the top sinks 1px while the feet stay put. */
export function squash(png: PngData): PngData {
  const rows = bodyRows(png);
  // An empty or one-row sprite has no row to spare: return an unchanged copy.
  if (!rows || rows[0] === rows[1]) return remap(png, (x, y) => [x, y]);
  const [top, bottom] = rows;
  const cut = cutRow(png, top, bottom);
  return remap(png, (x, y) => {
    if (y > cut) return [x, y];
    if (y === top) return null;
    return [x, y - 1];
  });
}

/** Egg wobble frame: the whole shell moves 1px right (a partial shift would kink the outline). */
export function nudge(png: PngData): PngData {
  return remap(png, (x, y) => [x - 1, y]);
}
