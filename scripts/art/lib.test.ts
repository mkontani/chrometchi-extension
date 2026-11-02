import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import { describe, expect, test } from 'vitest';
import { FORMS } from '../../src/data/forms';
import {
  buildSheet,
  checkImage,
  escapeHtml,
  opaqueColors,
  readPng,
  requiredSpritePaths,
} from './lib';

const dir = mkdtempSync(join(tmpdir(), 'art-'));
type Px = [number, number, number, number];

function makePng(name: string, w: number, h: number, pixels: Record<string, Px> = {}): string {
  const png = new PNG({ width: w, height: h });
  for (const [key, px] of Object.entries(pixels)) {
    const [x = 0, y = 0] = key.split(',').map(Number);
    const i = (y * w + x) * 4;
    png.data.set(px, i);
  }
  const file = join(dir, name);
  writeFileSync(file, PNG.sync.write(png));
  return file;
}

const opts = { width: 32, height: 32 };
const kinds = (f: string, o = opts) => checkImage(f, o).map((i) => i.kind);

describe('checkImage', () => {
  test('clean image passes', () => {
    const f = makePng('ok.png', 32, 32, { '10,10': [255, 0, 0, 255] });
    expect(checkImage(f, { ...opts, palette: ['#FF0000'], maxColors: 2 })).toEqual([]);
  });
  test('flags missing file', () => {
    expect(kinds(join(dir, 'nope.png'))).toEqual(['missing']);
  });
  test('flags wrong size', () => {
    expect(kinds(makePng('s.png', 30, 32))).toContain('size');
  });
  test('flags opaque corner as opaqueBackground', () => {
    expect(kinds(makePng('c.png', 32, 32, { '31,31': [1, 2, 3, 255] }))).toContain('opaqueBackground');
  });
  test('transparentCorners=false skips corner check', () => {
    const f = makePng('c2.png', 32, 32, { '0,0': [1, 2, 3, 255] });
    expect(kinds(f, { ...opts, transparentCorners: false } as typeof opts)).toEqual([]);
  });
  test('flags alpha 128 as partialAlpha', () => {
    expect(kinds(makePng('p.png', 32, 32, { '5,5': [1, 2, 3, 128] }))).toContain('partialAlpha');
  });
  test('flags colors outside palette with the offending hex', () => {
    const f = makePng('o.png', 32, 32, { '5,5': [171, 205, 239, 255], '6,6': [255, 0, 0, 255] });
    const issues = checkImage(f, { ...opts, palette: ['#ff0000'] });
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ kind: 'offPalette' });
    expect(issues[0]?.detail).toContain('#abcdef');
  });
  test('flags too many colors', () => {
    const f = makePng('m.png', 32, 32, { '5,5': [1, 0, 0, 255], '6,6': [2, 0, 0, 255] });
    expect(kinds(f, { ...opts, maxColors: 1 } as typeof opts)).toContain('tooManyColors');
  });
});

describe('png helpers', () => {
  test('readPng returns null for missing file; opaqueColors dedupes', () => {
    expect(readPng(join(dir, 'zzz.png'))).toBeNull();
    const png = readPng(makePng('d.png', 4, 4, { '1,1': [255, 0, 0, 255], '2,2': [255, 0, 0, 255] }));
    expect(opaqueColors(png as NonNullable<typeof png>)).toEqual(['#ff0000']);
  });
});

describe('requiredSpritePaths', () => {
  test('289 paths: 2 for egg + 7 for each of 41 other forms', () => {
    expect(requiredSpritePaths(FORMS)).toHaveLength(289);
  });
});

describe('buildSheet', () => {
  const groups = [{ label: 'A <b>&"x"', files: ['/w/egg/idle0.png', '/v/egg/idle0.png'] }];
  const sheet = buildSheet('Pick <one>', groups);
  test('escapes html', () => {
    expect(escapeHtml(`<a href="x">&'`)).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&#39;');
    expect(sheet.html).not.toContain('<b>');
    expect(sheet.html).toContain('Pick &lt;one&gt;');
    expect(sheet.html).not.toContain('<html');
  });
  test('unique basenames, copy plan and card markup', () => {
    const names = sheet.copies.map((c) => c.name);
    expect(new Set(names).size).toBe(2);
    expect(sheet.copies.map((c) => c.from)).toEqual(groups[0]?.files);
    expect(sheet.html).toContain('data-multiselect');
    expect(sheet.html).toContain('onclick="toggleSelect(this)"');
    expect(sheet.html).toContain('data-choice="/w/egg/idle0.png"');
    expect(sheet.html).toContain(`src="/files/${names[0]}"`);
    expect(sheet.html).toContain('image-rendering: pixelated');
  });
});
