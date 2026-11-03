import { expect, test } from 'vitest';
import { MEDICINE } from './medicine';
import { MOUTH_AT, PILL_FROM, SWEAT_AT } from './layout';
import type { EffectFrame } from './types';

const dose = (cured: boolean) => ({ kind: 'medicine', cured }) as const;
const at = (cured: boolean, t: number, reduced = false) => MEDICINE.frame(dose(cured), t, reduced);
const prop = (f: EffectFrame, id: string) => f.props.filter((p) => p.art.kind === 'effect' && p.art.id === id);

test('the pill floats from the upper right into the mouth, then is gone', () => {
  expect(prop(at(false, 0), 'pill')[0]).toMatchObject({ ...PILL_FROM, scale: 2 });
  expect(prop(at(false, 599), 'pill')[0]).toMatchObject(MOUTH_AT);
  const xs = [0, 100, 200, 300, 400, 500].map((t) => prop(at(false, t), 'pill')[0]!.x);
  expect(xs).toEqual([...xs].sort((a, b) => b - a));
  expect(new Set(xs).size).toBe(6);
  expect(prop(at(false, 600), 'pill')).toEqual([]);
});

test('the pet looks sick until it gulps the pill', () => {
  expect(at(false, 0).pose).toBe('sick');
  expect(at(true, 500).pose).toBe('sick');
  expect(at(false, 700).pose).toBe('eat');
  expect(at(true, 700).pose).toBe('eat');
});

test('first dose: the pet shivers, stays sick and gets a small sparkle', () => {
  expect([950, 1050, 1150].map((t) => at(false, t).petDx)).toEqual([4, -4, 4]);
  expect(at(false, 1200).pose).toBe('sick');
  expect(at(false, 1600).petDx).toBe(0);
  expect(prop(at(false, 1600), 'sparkle')).toEqual([expect.objectContaining({ scale: 1 })]);
  expect(prop(at(false, 1400), 'sparkle')).toEqual([]);
});

test('first dose never draws a sweat of its own (the saved sickness keeps the usual one)', () => {
  for (let t = 0; t < 2000; t += 50) expect(prop(at(false, t), 'sweat')).toEqual([]);
});

test('cured: the sweat flies off and never comes back', () => {
  expect(prop(at(true, 0), 'sweat')[0]).toMatchObject({ ...SWEAT_AT, scale: 2 });
  expect(prop(at(true, 899), 'sweat')[0]).toMatchObject(SWEAT_AT);
  const ys = [900, 1000, 1100, 1200].map((t) => prop(at(true, t), 'sweat')[0]!.y);
  expect(ys).toEqual([...ys].sort((a, b) => b - a));
  expect(ys[0]).toBeLessThan(SWEAT_AT.y);
  for (let t = 1300; t < 2000; t += 50) expect(prop(at(true, t), 'sweat')).toEqual([]);
});

test('cured: the pet turns happy and sparkles burst outward', () => {
  expect(at(true, 1300).pose).toBe('happy');
  const near = prop(at(true, 1300), 'sparkle');
  const far = prop(at(true, 1700), 'sparkle');
  expect(near).toHaveLength(4);
  expect(far).toHaveLength(4);
  expect(near.every((p) => p.scale === 2)).toBe(true);
  const spread = (ps: typeof near) => Math.max(...ps.map((p) => p.x)) - Math.min(...ps.map((p) => p.x));
  expect(spread(far)).toBeGreaterThan(spread(near));
  expect(at(true, 1200).pose).not.toBe('happy');
});

test('it lasts 2000 ms, 800 ms with reduced motion', () => {
  expect(MEDICINE.durationMs(dose(true), false)).toBe(2000);
  expect(MEDICINE.durationMs(dose(false), true)).toBe(800);
});

test('it gulps, and a cure sounds happy', () => {
  expect(MEDICINE.cues(dose(false), false)).toEqual([{ atMs: 600, sfx: 'gulp' }]);
  expect(MEDICINE.cues(dose(true), false)).toEqual([{ atMs: 600, sfx: 'gulp' }, { atMs: 1300, sfx: 'happy' }]);
  expect(MEDICINE.cues(dose(false), true)).toEqual([{ atMs: 0, sfx: 'gulp' }]);
  expect(MEDICINE.cues(dose(true), true)).toEqual([{ atMs: 0, sfx: 'gulp' }, { atMs: 400, sfx: 'happy' }]);
});

test('reduced: the pill sits at the mouth, then the result shows', () => {
  expect(at(true, 0, true)).toMatchObject({ pose: 'eat' });
  expect(prop(at(true, 0, true), 'pill')[0]).toMatchObject(MOUTH_AT);
  expect(prop(at(true, 0, true), 'sweat')[0]).toMatchObject(SWEAT_AT);
  expect(at(true, 400, true).pose).toBe('happy');
  expect(prop(at(true, 400, true), 'sweat')).toEqual([]);
  expect(prop(at(true, 400, true), 'sparkle')).toEqual([expect.objectContaining({ scale: 2 })]);
  expect(at(false, 400, true).pose).toBe('sick');
  expect(prop(at(false, 400, true), 'sparkle')).toEqual([expect.objectContaining({ scale: 1 })]);
});
