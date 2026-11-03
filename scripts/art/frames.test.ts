import { describe, expect, test } from 'vitest';
import { bite, nudge, squash } from './frames';
import type { PngData } from './lib';

/** Builds a PngData from ASCII rows: '.' transparent, any other char an opaque color. */
function fromRows(rows: string[]): PngData {
  const height = rows.length;
  const width = rows[0]?.length ?? 0;
  const data = new Uint8Array(width * height * 4);
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch === '.') return;
      data.set([ch.charCodeAt(0), 0, 0, 255], (y * width + x) * 4);
    }),
  );
  return { width, height, data };
}

function toRows(png: PngData): string[] {
  const rows: string[] = [];
  for (let y = 0; y < png.height; y++) {
    let row = '';
    for (let x = 0; x < png.width; x++) {
      const i = (y * png.width + x) * 4;
      row += png.data[i + 3] === 0 ? '.' : String.fromCharCode(png.data[i] ?? 46);
    }
    rows.push(row);
  }
  return rows;
}

describe('squash', () => {
  test('drops one row at 70% of the body and lowers everything above it by 1px', () => {
    const src = fromRows(['....', '.aa.', '.bb.', '.cc.', '.dd.', '.ee.', '.ff.', '....']);
    // body rows 1..6 → drop row 1 + round(0.7 * 5) = 5 ('ee')
    expect(toRows(squash(src))).toEqual(['....', '....', '.aa.', '.bb.', '.cc.', '.dd.', '.ff.', '....']);
  });

  test('prefers dropping a row that repeats the row above it, so details like a mouth survive', () => {
    const src = fromRows(['.a.', '.b.', '.c.', '.c.', '.m.', '.d.', '.e.', '.f.', '.g.', '.h.', '.i.']);
    // body rows 0..10, window rows 5..9: the repeat at row 3 is outside it, and inside it every
    // row differs equally from the one above → the row nearest 70% (row 7) is removed
    expect(toRows(squash(src))).toEqual(['...', '.a.', '.b.', '.c.', '.c.', '.m.', '.d.', '.e.', '.g.', '.h.', '.i.']);
    const dup = fromRows(['.a.', '.b.', '.c.', '.d.', '.e.', '.f.', '.f.', '.m.', '.g.', '.h.', '.i.']);
    // row 6 repeats row 5 and sits inside the window (rows 5..9) → it is the one removed
    expect(toRows(squash(dup))).toEqual(['...', '.a.', '.b.', '.c.', '.d.', '.e.', '.f.', '.m.', '.g.', '.h.', '.i.']);
  });

  test('keeps the source untouched and the size the same', () => {
    const src = fromRows(['.a.', '.b.', '.c.']);
    const before = [...src.data];
    const out = squash(src);
    expect([...src.data]).toEqual(before);
    expect([out.width, out.height]).toEqual([3, 3]);
  });

  test('leaves a one-row sprite as it is (there is no row to spare)', () => {
    const src = fromRows(['...', '.a.', '...']);
    expect(toRows(squash(src))).toEqual(['...', '.a.', '...']);
  });

  test('returns a copy of an empty image', () => {
    const src = fromRows(['...', '...']);
    expect(toRows(squash(src))).toEqual(['...', '...']);
  });
});

describe('nudge', () => {
  test('moves the whole sprite 1px to the right so the outline stays intact', () => {
    const src = fromRows(['.a..', '.bc.', '.d..']);
    expect(toRows(nudge(src))).toEqual(['..a.', '..bc', '..d.']);
  });

  test('clips pixels pushed past the right edge', () => {
    const src = fromRows(['..a', '.bc']);
    expect(toRows(nudge(src))).toEqual(['...', '..b']);
  });
});

describe('bite', () => {
  const BLACK = [0, 0, 0] as const;
  const RED = [0xc7, 0x40, 0x5d] as const;
  /** 32x32: a filled square at [4, 27] with a 1px black border and a red fill. */
  const square: PngData = (() => {
    const data = new Uint8Array(32 * 32 * 4);
    for (let y = 4; y <= 27; y++) {
      for (let x = 4; x <= 27; x++) {
        const edge = x === 4 || x === 27 || y === 4 || y === 27;
        data.set([...(edge ? BLACK : RED), 255], (y * 32 + x) * 4);
      }
    }
    return { width: 32, height: 32, data };
  })();
  const alphaAt = (p: PngData, x: number, y: number) => p.data[(y * p.width + x) * 4 + 3] ?? 0;
  const visible = (p: PngData) => {
    let n = 0;
    for (let i = 3; i < p.data.length; i += 4) if (p.data[i] === 255) n++;
    return n;
  };
  /** Pixels visible in `before` and transparent in `after`. */
  const removed = (before: PngData, after: PngData) => {
    const out: [number, number][] = [];
    for (let y = 0; y < before.height; y++) {
      for (let x = 0; x < before.width; x++) {
        if (alphaAt(before, x, y) === 255 && alphaAt(after, x, y) === 0) out.push([x, y]);
      }
    }
    return out;
  };
  const lost = (n: 1 | 2) => 1 - visible(bite(square, n, BLACK)) / visible(square);

  test('bite 1 takes a bite from the right side', () => {
    expect(lost(1)).toBeGreaterThan(0.1);
    expect(lost(1)).toBeLessThan(0.45);
    expect(removed(square, bite(square, 1, BLACK)).every(([x]) => x >= 16)).toBe(true);
  });

  test('bite 2 takes more than bite 1 and leaves the left third', () => {
    expect(lost(2)).toBeGreaterThan(lost(1));
    expect(lost(2)).toBeLessThan(0.75);
    expect(removed(square, bite(square, 2, BLACK)).every(([x]) => x >= 12)).toBe(true);
  });

  test('the bitten edge is outlined', () => {
    for (const n of [1, 2] as const) {
      const out = bite(square, n, BLACK);
      const gone = new Set(removed(square, out).map(([x, y]) => `${x},${y}`));
      for (let y = 0; y < 32; y++) {
        for (let x = 0; x < 32; x++) {
          if (alphaAt(out, x, y) !== 255) continue;
          const touches = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => gone.has(`${x + dx!},${y + dy!}`));
          if (!touches) continue;
          const i = (y * 32 + x) * 4;
          expect([...out.data.subarray(i, i + 3)], `${n}: ${x},${y}`).toEqual([0, 0, 0]);
        }
      }
    }
  });

  test('drops any piece the bite cuts off from the body', () => {
    // A square with a 1px stalk on top: the first bite cuts through the stalk and would leave its tip floating.
    const stalked: PngData = { width: 32, height: 32, data: square.data.slice() };
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) if (y < 10) stalked.data.fill(0, (y * 32 + x) * 4, (y * 32 + x) * 4 + 4);
    for (let y = 2; y <= 10; y++) stalked.data.set([0, 0, 0, 255], (y * 32 + 26) * 4);
    for (let x = 4; x <= 27; x++) stalked.data.set([0, 0, 0, 255], (10 * 32 + x) * 4);
    expect(alphaAt(bite(stalked, 1, BLACK), 26, 2)).toBe(0);
  });

  test('keeps the size, uses only 0/255 alpha and only colors already in the image', () => {
    const before = square.data.slice();
    const out = bite(square, 2, BLACK);
    expect([out.width, out.height]).toEqual([32, 32]);
    expect(square.data).toEqual(before); // the input is not mutated
    for (let i = 0; i < out.data.length; i += 4) {
      expect([0, 255]).toContain(out.data[i + 3]);
      if (out.data[i + 3] === 255) {
        const rgb = [...out.data.subarray(i, i + 3)];
        expect([[...BLACK], [...RED]]).toContainEqual(rgb);
      }
    }
  });
});
