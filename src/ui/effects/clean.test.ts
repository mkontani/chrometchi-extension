import { expect, test } from 'vitest';
import { POOP } from '@/core/constants';
import { CLEAN } from './clean';
import { poopSlotLeft } from './layout';
import type { EffectFrame, PoopLook } from './types';

const clean = (poops: number) => ({ kind: 'clean', poops }) as const;
const at = (n: number, t: number, reduced = false) => CLEAN.frame(clean(n), t, reduced);
const broom = (f: EffectFrame) => f.props.find((p) => p.key === 'broom');
const RANK: Record<PoopLook, number> = { poop: 0, dust0: 1, dust1: 2, dust2: 3, gone: 4 };
const times = (end: number) => Array.from({ length: end / 50 }, (_, i) => i * 50);
const sparkles = (f: EffectFrame) => f.props.filter((p) => p.art.kind === 'effect' && p.art.id === 'sparkle');

test('starts with the poops from before cleaning and the broom at the right edge', () => {
  expect(at(3, 0).poops).toEqual(Array(3).fill({ look: 'poop', dx: 0 }));
  expect(broom(at(3, 0))?.x).toBeGreaterThanOrEqual(336);
  expect(broom(at(3, 0))?.art).toEqual({ kind: 'icon', id: 'clean' });
});

test('a poop moves only once the broom has reached it', () => {
  for (const n of [1, 2, 4]) {
    for (let i = 0; i < n; i++) {
      const t = times(2200).find((t) => {
        const p = at(n, t).poops?.[i];
        return p?.look !== 'poop' || p.dx !== 0;
      });
      expect(t, `${n}/${i}`).toBeDefined();
      expect(broom(at(n, t!))!.x).toBeLessThanOrEqual(poopSlotLeft(i, n) + 32);
    }
  }
});

test('each poop slides, puffs and is gone, never going back', () => {
  for (let i = 0; i < 4; i++) {
    const looks = times(2200).map((t) => at(4, t).poops![i]!);
    looks.slice(1).forEach((p, k) => expect(RANK[p.look]).toBeGreaterThanOrEqual(RANK[looks[k]!.look]));
    expect(Math.min(...looks.map((p) => p.dx))).toBe(-8);
    expect(new Set(looks.map((p) => p.look))).toEqual(new Set(['poop', 'dust0', 'dust1', 'dust2', 'gone']));
  }
});

test('the broom sweeps back and forth while crossing', () => {
  const xs = times(1800).map((t) => broom(at(2, t))!.x);
  expect(xs.slice(1).filter((x, k) => x > xs[k]!).length).toBeGreaterThanOrEqual(2);
});

test('by 1800 every poop is gone, the broom has left, the floor sparkles and the pet is happy', () => {
  for (const n of [0, 1, 4]) {
    const f = at(n, 1800);
    expect(f.poops).toEqual(Array(n).fill({ look: 'gone', dx: 0 }));
    expect(broom(f)).toBeUndefined();
    expect(f.pose).toBe('happy');
    expect(sparkles(f).length).toBeGreaterThan(0);
    expect(sparkles(at(n, 1750))).toEqual([]);
  }
});

test('the most poops there can be all fit on the stage', () => {
  expect(poopSlotLeft(0, POOP.max)).toBeGreaterThanOrEqual(0);
});

test('one sweep sound per poop, while the broom is crossing', () => {
  const cues = CLEAN.cues(clean(3), false);
  expect(cues.map((c) => c.sfx)).toEqual(['sweep', 'sweep', 'sweep']);
  expect(cues.every((c) => c.atMs > 0 && c.atMs < 1800)).toBe(true);
  expect(CLEAN.cues(clean(0), false)).toEqual([]);
});

test('every poop gets its sweep sound plays when it starts to slide (in time order, rightmost first)', () => {
  const cues = CLEAN.cues(clean(2), false);
  expect(cues.map((c) => c.atMs)).toEqual([...cues.map((c) => c.atMs)].sort((x, y) => x - y));
  for (let i = 0; i < 2; i++) {
    const starts = cues.filter(
      (c) => at(2, c.atMs - 1).poops?.[i]?.dx === 0 && (at(2, c.atMs).poops?.[i]?.dx ?? 0) < 0,
    );
    expect(starts, `poop ${i}`).toHaveLength(1);
  }
});

test('it lasts 2200 ms; reduced: the broom stands still and the poops vanish at 300', () => {
  expect(CLEAN.durationMs(clean(2), false)).toBe(2200);
  expect(CLEAN.durationMs(clean(2), true)).toBe(600);
  expect(broom(at(2, 0, true))?.x).toBe(broom(at(2, 550, true))?.x);
  expect(at(2, 299, true).poops?.[0]?.look).toBe('poop');
  expect(at(2, 300, true)).toMatchObject({ pose: 'happy', poops: [{ look: 'gone', dx: 0 }, { look: 'gone', dx: 0 }] });
  expect(CLEAN.cues(clean(2), true)).toEqual([{ atMs: 300, sfx: 'sweep' }]);
  expect(CLEAN.cues(clean(0), true)).toEqual([]);
});

test('cleaning never touches the lights', () => {
  for (const t of times(2200)) expect(at(2, t)).toMatchObject({ dim: null, flash: false, petDx: 0 });
});
