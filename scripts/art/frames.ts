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

type Box = { x0: number; x1: number; y0: number; y1: number };

/** The smallest box around every visible pixel, or null for an empty image. */
function visibleBox(png: PngData): Box | null {
  let box: Box | null = null;
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      if ((png.data[(y * png.width + x) * 4 + 3] ?? 0) === 0) continue;
      box = box
        ? { x0: Math.min(box.x0, x), x1: Math.max(box.x1, x), y0: Math.min(box.y0, y), y1: Math.max(box.y1, y) }
        : { x0: x, x1: x, y0: y, y1: y };
    }
  }
  return box;
}

/** Whether (x, y) falls inside the bite circles: one on the right edge, and a second deeper one for bite 2. */
function inBite(box: Box, bites: 1 | 2, x: number, y: number): boolean {
  const w = box.x1 - box.x0 + 1;
  const h = box.y1 - box.y0 + 1;
  const r = Math.ceil(w / 3);
  const circles: [number, number][] = [[box.x1, box.y0 + h / 3]];
  if (bites === 2) circles.push([box.x1 - r / 2, box.y0 + (2 * h) / 3]);
  return circles.some(([cx, cy]) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r);
}

const NEIGHBOURS: readonly [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];

const isVisible = (png: PngData, i: number) => png.data[i * 4 + 3] === 255;

/** 1 for each visible pixel inside the bite circles. */
function biteMask(png: PngData, box: Box, bites: 1 | 2): Uint8Array {
  const mask = new Uint8Array(png.width * png.height);
  for (let i = 0; i < mask.length; i++) {
    if (isVisible(png, i) && inBite(box, bites, i % png.width, Math.floor(i / png.width))) mask[i] = 1;
  }
  return mask;
}

/** The 4-connected pieces of the pixels that are visible and not removed: a piece id per pixel (-1 = none). */
function pieces(png: PngData, removed: Uint8Array): { id: Int32Array; sizes: number[] } {
  const id = new Int32Array(removed.length).fill(-1);
  const sizes: number[] = [];
  const keep = (i: number) => isVisible(png, i) && !removed[i] && id[i] === -1;
  for (let start = 0; start < id.length; start++) {
    if (!keep(start)) continue;
    const piece = sizes.length;
    const stack = [start];
    id[start] = piece;
    sizes.push(0);
    while (stack.length > 0) {
      const i = stack.pop() as number;
      sizes[piece] = (sizes[piece] ?? 0) + 1;
      for (const n of neighboursOf(png, i)) {
        if (keep(n)) {
          id[n] = piece;
          stack.push(n);
        }
      }
    }
  }
  return { id, sizes };
}

function neighboursOf(png: PngData, i: number): number[] {
  const x = i % png.width;
  const y = Math.floor(i / png.width);
  return NEIGHBOURS.filter(([dx, dy]) => x + dx >= 0 && y + dy >= 0 && x + dx < png.width && y + dy < png.height).map(
    ([dx, dy]) => (y + dy) * png.width + x + dx,
  );
}

/** Adds to `removed` every piece the bite cut off from the body (a piece touching the bite, other than the largest). */
function withCutOffPieces(png: PngData, removed: Uint8Array): Uint8Array {
  const { id, sizes } = pieces(png, removed);
  const body = sizes.indexOf(Math.max(...sizes));
  const touched = new Set<number>();
  removed.forEach((r, i) => {
    if (r) for (const n of neighboursOf(png, i)) if (id[n] !== undefined && id[n] >= 0) touched.add(id[n]);
  });
  return removed.map((r, i) => (r || (id[i] !== body && touched.has(id[i] ?? -1)) ? 1 : 0));
}

/**
 * A bitten copy of a food picture: round bites are cut from its right side, pieces left floating are dropped,
 * and the new edge gets the outline color so the whole silhouette stays outlined (style guide).
 */
export function bite(png: PngData, bites: 1 | 2, outline: readonly [number, number, number]): PngData {
  const data = png.data.slice();
  const box = visibleBox(png);
  if (!box) return { width: png.width, height: png.height, data };
  const removed = withCutOffPieces(png, biteMask(png, box, bites));
  removed.forEach((r, i) => {
    if (r) data.fill(0, i * 4, i * 4 + 4);
    else if (isVisible(png, i) && neighboursOf(png, i).some((n) => removed[n])) data.set(outline, i * 4);
  });
  return { width: png.width, height: png.height, data };
}
