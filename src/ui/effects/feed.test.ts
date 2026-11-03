import { expect, test } from 'vitest';
import type { EffectId } from '@/ui/assets';
import { FEED } from './feed';
import { FOOD_AT } from './layout';
import type { EffectFrame } from './types';

const rice = { kind: 'feed', food: 'rice' } as const;
const at = (t: number, reduced = false) => FEED.frame(rice, t, reduced);
const food = (f: EffectFrame) => f.props.find((p) => p.art.kind === 'food');
const has = (f: EffectFrame, id: EffectId) => f.props.some((p) => p.art.kind === 'effect' && p.art.id === id);

test('the food appears whole at the mouth', () => {
  expect(food(at(0))).toMatchObject({ art: { kind: 'food', food: 'rice', bites: 0 }, ...FOOD_AT, scale: 2 });
  expect(at(0).pose).toBe('idle0');
});

test('the pet opens and closes its mouth three times', () => {
  expect([300, 600, 900, 1200, 1500, 1800].map((t) => at(t).pose)).toEqual([
    'eat', 'idle0', 'eat', 'idle0', 'eat', 'idle0',
  ]);
});

test('each bite takes a piece: whole, 2/3, 1/3, gone', () => {
  expect(food(at(599))?.art).toMatchObject({ bites: 0 });
  expect(food(at(600))?.art).toMatchObject({ bites: 1 });
  expect(food(at(1200))?.art).toMatchObject({ bites: 2 });
  expect(food(at(1800))).toBeUndefined();
});

test('crumbs fly only just after a bite', () => {
  expect(has(at(500), 'crumb')).toBe(false);
  expect(has(at(650), 'crumb')).toBe(true);
  expect(has(at(950), 'crumb')).toBe(false);
});

test('it ends happy with a sparkle', () => {
  expect(at(2200).pose).toBe('happy');
  expect(has(at(2200), 'sparkle')).toBe(true);
  expect(has(at(2000), 'sparkle')).toBe(false);
});

test('it lasts 2600 ms, and 800 ms with reduced motion', () => {
  expect(FEED.durationMs(rice, false)).toBe(2600);
  expect(FEED.durationMs(rice, true)).toBe(800);
});

test('each bite sounds', () => {
  expect(FEED.cues(rice, false)).toEqual([600, 1200, 1800].map((atMs) => ({ atMs, sfx: 'eat' })));
});

test('reduced: eat with the whole food, then happy without it', () => {
  expect(at(0, true).pose).toBe('eat');
  expect(food(at(0, true))?.art).toMatchObject({ bites: 0 });
  expect(at(400, true).pose).toBe('happy');
  expect(food(at(400, true))).toBeUndefined();
  expect(FEED.cues(rice, true)).toEqual([{ atMs: 400, sfx: 'eat' }]);
});

test('feeding never touches the lights or the poops', () => {
  for (let t = 0; t < 2600; t += 50) {
    expect(at(t)).toMatchObject({ dim: null, poops: null, flash: false, petDx: 0 });
  }
});

test('the food shown is the one that was picked', () => {
  expect(food(FEED.frame({ kind: 'feed', food: 'cake' }, 0, false))?.art).toMatchObject({ food: 'cake' });
});
