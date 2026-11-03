import { expect, test } from 'vitest';
import { POOP } from '@/core/constants';
import { FOODS } from '@/data/foods';
import { MAX_EFFECT_MS, MAX_REDUCED_MS, cuesBetween, effectDurationMs, effectFrame } from './timeline';
import type { CareEffect, EffectFrame } from './types';

const EFFECTS: CareEffect[] = [
  ...FOODS.map((f) => ({ kind: 'feed', food: f.id }) as const),
  ...Array.from({ length: POOP.max + 1 }, (_, poops) => ({ kind: 'clean', poops }) as const),
  { kind: 'medicine', cured: false },
  { kind: 'medicine', cured: true },
  { kind: 'lights', on: false },
  { kind: 'lights', on: true },
];
const frames = (e: CareEffect, reduced: boolean): EffectFrame[] =>
  Array.from({ length: Math.ceil(effectDurationMs(e, reduced) / 50) }, (_, i) => effectFrame(e, i * 50, reduced));

test('every effect is short enough', () => {
  for (const e of EFFECTS) {
    expect(effectDurationMs(e, false), JSON.stringify(e)).toBeLessThanOrEqual(MAX_EFFECT_MS);
    expect(effectDurationMs(e, true), JSON.stringify(e)).toBeLessThanOrEqual(MAX_REDUCED_MS);
  }
  expect([MAX_EFFECT_MS, MAX_REDUCED_MS]).toEqual([3000, 1000]);
});

test('everything moves in whole display pixels', () => {
  for (const e of EFFECTS) {
    for (const reduced of [false, true]) {
      for (const f of frames(e, reduced)) {
        expect([-4, 0, 4]).toContain(f.petDx);
        for (const p of f.props) {
          expect(Number.isInteger(p.x / 2), `${JSON.stringify(e)} ${p.key} x=${p.x}`).toBe(true);
          expect(Number.isInteger(p.y / 2), `${JSON.stringify(e)} ${p.key} y=${p.y}`).toBe(true);
          expect(Number.isInteger(p.scale) && p.scale >= 1).toBe(true);
        }
      }
    }
  }
});

test('reduced motion has no movement and no flash', () => {
  for (const e of EFFECTS) {
    const seen = new Map<string, string>();
    for (const f of frames(e, true)) {
      expect(f.petDx).toBe(0);
      expect(f.flash).toBe(false);
      for (const p of f.props) {
        const where = `${p.x},${p.y}`;
        expect(seen.get(p.key) ?? where, `${JSON.stringify(e)} ${p.key}`).toBe(where);
        seen.set(p.key, where);
      }
    }
  }
});

test('every cue falls inside its effect', () => {
  for (const e of EFFECTS) {
    for (const reduced of [false, true]) {
      const all = cuesBetween(e, reduced, -1, effectDurationMs(e, reduced) - 1);
      expect(all, JSON.stringify(e)).toEqual(cuesBetween(e, reduced, -1, Number.MAX_SAFE_INTEGER));
    }
  }
});

test('cuesBetween returns the cues in (from, to]', () => {
  const feed = { kind: 'feed', food: 'rice' } as const;
  expect(cuesBetween(feed, false, -1, 600)).toEqual(['eat']);
  expect(cuesBetween(feed, false, 600, 1199)).toEqual([]);
  expect(cuesBetween(feed, false, 599, 1800)).toEqual(['eat', 'eat', 'eat']);
  expect(cuesBetween({ kind: 'lights', on: false }, true, -1, 0)).toEqual(['click']);
  expect(cuesBetween({ kind: 'clean', poops: 2 }, false, -1, 2200)).toEqual(['sweep', 'sweep']);
  expect(cuesBetween({ kind: 'medicine', cured: true }, false, -1, 2000)).toEqual(['gulp', 'happy']);
});
