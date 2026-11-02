import { existsSync, readFileSync } from 'node:fs';
import { basename, extname } from 'node:path';
import { PNG } from 'pngjs';
import type { FormDef, Pose } from '../../src/core/types';
import { EGG_PATTERNS } from '../../src/data/eggs';

export type IssueKind =
  | 'missing'
  | 'size'
  | 'opaqueBackground'
  | 'partialAlpha'
  | 'offPalette'
  | 'tooManyColors';
export type Issue = { file: string; kind: IssueKind; detail: string };
export type PngData = { width: number; height: number; data: Uint8Array };
export type CheckOptions = {
  width: number;
  height: number;
  palette?: string[];
  maxColors?: number;
  transparentCorners?: boolean;
};

const MAX_OFF_PALETTE_LISTED = 8;
const ALL_POSES: readonly Pose[] = ['idle0', 'idle1', 'happy', 'eat', 'sick', 'sleep', 'sad'];
const EGG_POSES: readonly Pose[] = ['idle0', 'idle1'];

export function readPng(file: string): PngData | null {
  if (!existsSync(file)) return null;
  const png = PNG.sync.read(readFileSync(file));
  return { width: png.width, height: png.height, data: new Uint8Array(png.data) };
}

const hex = (n: number) => n.toString(16).padStart(2, '0');

export function opaqueColors(png: PngData): string[] {
  const seen = new Set<string>();
  const d = png.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 255) seen.add(`#${hex(d[i] ?? 0)}${hex(d[i + 1] ?? 0)}${hex(d[i + 2] ?? 0)}`);
  }
  return [...seen];
}

function hasOpaqueCorner(png: PngData): boolean {
  const { width: w, height: h, data } = png;
  const corners = [0, w - 1, (h - 1) * w, h * w - 1];
  return corners.some((p) => (data[p * 4 + 3] ?? 0) > 0);
}

function hasPartialAlpha(png: PngData): boolean {
  for (let i = 3; i < png.data.length; i += 4) {
    const a = png.data[i];
    if (a !== 0 && a !== 255) return true;
  }
  return false;
}

function paletteIssues(file: string, colors: string[], palette: string[]): Issue[] {
  const allowed = new Set(palette.map((c) => c.toLowerCase()));
  const off = colors.filter((c) => !allowed.has(c));
  if (off.length === 0) return [];
  const listed = off.slice(0, MAX_OFF_PALETTE_LISTED).join(', ');
  return [{ file, kind: 'offPalette', detail: `${off.length} off-palette: ${listed}` }];
}

export function checkImage(file: string, opts: CheckOptions): Issue[] {
  const png = readPng(file);
  if (!png) return [{ file, kind: 'missing', detail: 'file not found' }];
  if (png.width !== opts.width || png.height !== opts.height) {
    return [{ file, kind: 'size', detail: `${png.width}x${png.height}, expected ${opts.width}x${opts.height}` }];
  }
  const issues: Issue[] = [];
  if ((opts.transparentCorners ?? true) && hasOpaqueCorner(png)) {
    issues.push({ file, kind: 'opaqueBackground', detail: 'a corner pixel is not transparent' });
  }
  if (hasPartialAlpha(png)) {
    issues.push({ file, kind: 'partialAlpha', detail: 'alpha values other than 0/255' });
  }
  const colors = opaqueColors(png);
  if (opts.palette) issues.push(...paletteIssues(file, colors, opts.palette));
  if (opts.maxColors !== undefined && colors.length > opts.maxColors) {
    issues.push({ file, kind: 'tooManyColors', detail: `${colors.length} colors, max ${opts.maxColors}` });
  }
  return issues;
}

const spriteDirs = (f: FormDef): string[] =>
  f.id === 'egg' ? EGG_PATTERNS.map((p) => `egg/${p}`) : [f.id];

export function requiredSpritePaths(forms: readonly FormDef[]): string[] {
  return forms.flatMap((f) =>
    spriteDirs(f).flatMap((dir) =>
      (f.id === 'egg' ? EGG_POSES : ALL_POSES).map((p) => `src/assets/sprites/${dir}/${p}.png`),
    ),
  );
}

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c] ?? c);
}

export type SheetGroup = { label: string; files: string[] };
export type SheetCopy = { from: string; name: string };

const sanitize = (s: string) => s.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'g';

function planCopies(groups: readonly SheetGroup[]): SheetCopy[][] {
  let n = 0;
  return groups.map((g) =>
    g.files.map((from) => ({ from, name: `${sanitize(g.label)}_${n++}_${basename(from)}` })),
  );
}

function cardHtml(copy: SheetCopy): string {
  const stem = basename(copy.from, extname(copy.from));
  return (
    `<div class="card" data-choice="${escapeHtml(copy.from)}" onclick="toggleSelect(this)">` +
    `<div class="card-image" style="background:#f4f4f4;padding:8px">` +
    `<img src="/files/${escapeHtml(copy.name)}" width="128" height="128" ` +
    `style="image-rendering: pixelated"></div>` +
    `<div class="card-body">${escapeHtml(stem)}</div></div>`
  );
}

export function buildSheet(title: string, groups: readonly SheetGroup[]): { html: string; copies: SheetCopy[] } {
  const plans = planCopies(groups);
  const sections = groups.map(
    (g, i) =>
      `<p class="label">${escapeHtml(g.label)}</p>` +
      `<div class="cards" data-multiselect>${(plans[i] ?? []).map(cardHtml).join('')}</div>`,
  );
  const html = `<h2>${escapeHtml(title)}</h2>\n${sections.join('\n')}\n`;
  return { html, copies: plans.flat() };
}
