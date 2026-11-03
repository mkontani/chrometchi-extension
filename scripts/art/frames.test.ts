import { describe, expect, test } from 'vitest';
import { nudge, squash } from './frames';
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
