import { expect, test } from 'vitest';
import { COOK } from './cook';
import { POT_AT } from './layout';
import type { EffectFrame } from './types';

const EFFECT = { kind: 'cook', dish: 'steak' } as const;
const at = (t: number, reduced = false) => COOK.frame(EFFECT, t, reduced);
const pot = (f: EffectFrame) => f.props.find((p) => p.key === 'pot');
const steam = (f: EffectFrame) => f.props.filter((p) => p.key.startsWith('steam'));

test('the pot shows for the whole effect and hops only while simmering', () => {
  expect(COOK.durationMs(EFFECT, false)).toBe(1600);
  for (let t = 0; t < 1600; t += 50) {
    expect(pot(at(t)), `t=${t}`).toMatchObject({ art: { kind: 'cook', id: 'pot' }, x: POT_AT.x, scale: 2 });
  }
  const hopping = (t: number) => pot(at(t))?.y === POT_AT.y - 2;
  expect([0, 149, 150, 299, 300, 449, 450, 599, 750, 899, 900, 1049, 1050, 1199, 1200, 1599].map(hopping)).toEqual([
    false, false, true, true, false, false, true, true, true, true, false, false, true, true, false, false,
  ]);
  expect(pot(at(1300))?.y).toBe(POT_AT.y);
});

test('steam puffs rise from the pot while simmering', () => {
  const puff = (t: number) => steam(at(t))[0];
  expect(puff(0)).toMatchObject({ art: { kind: 'effect', id: 'dust0' } });
  expect(puff(100)).toMatchObject({ art: { kind: 'effect', id: 'dust1' } });
  expect(puff(200)).toMatchObject({ art: { kind: 'effect', id: 'dust2' } });
  expect(puff(100)?.y).toBe((puff(0)?.y ?? 0) - 4);
  expect(puff(200)?.y).toBe((puff(0)?.y ?? 0) - 8);
  expect(puff(300)).toBeUndefined();
  expect(puff(400)).toMatchObject({ art: { kind: 'effect', id: 'dust0' } });
  expect(puff(400)?.y).toBe(puff(0)?.y);
  expect(puff(1000)).toMatchObject({ art: { kind: 'effect', id: 'dust2' } });
  expect(steam(at(1200))).toEqual([]);
});

test('the sparkle and the happy pose come at 1200 ms (500 ms reduced)', () => {
  const sparkle = (f: EffectFrame) => f.props.find((p) => p.key === 'sparkle');
  expect(at(1199).pose).toBeNull();
  expect(sparkle(at(1199))).toBeUndefined();
  expect(at(1200).pose).toBe('happy');
  expect(sparkle(at(1200))).toMatchObject({ art: { kind: 'effect', id: 'sparkle' } });
  expect(COOK.durationMs(EFFECT, true)).toBe(800);
  expect(at(499, true).pose).toBeNull();
  expect(sparkle(at(499, true))).toBeUndefined();
  expect(at(500, true).pose).toBe('happy');
  expect(sparkle(at(500, true))).toBeDefined();
  for (let t = 0; t < 800; t += 50) {
    const f = at(t, true);
    expect(pot(f)?.y).toBe(POT_AT.y);
    expect(steam(f)).toEqual([]);
  }
});

test('cues: simmer at 0 and 600, cooked at 1200; reduced: simmer at 0, cooked at 500', () => {
  expect(COOK.cues(EFFECT, false)).toEqual([
    { atMs: 0, sfx: 'simmer' },
    { atMs: 600, sfx: 'simmer' },
    { atMs: 1200, sfx: 'cooked' },
  ]);
  expect(COOK.cues(EFFECT, true)).toEqual([
    { atMs: 0, sfx: 'simmer' },
    { atMs: 500, sfx: 'cooked' },
  ]);
});
