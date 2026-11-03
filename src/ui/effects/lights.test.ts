import { expect, test } from 'vitest';
import { LIGHTS } from './lights';
import { SWITCH_AT } from './layout';
import type { EffectFrame } from './types';

const OFF = { kind: 'lights', on: false } as const;
const ON = { kind: 'lights', on: true } as const;
const sw = (f: EffectFrame) => f.props.find((p) => p.key === 'switch');

test('lights off: the switch is there and clicks down at 200', () => {
  const at = (t: number) => LIGHTS.frame(OFF, t, false);
  expect(sw(at(0))).toMatchObject({ art: { kind: 'icon', id: 'lights' }, ...SWITCH_AT, scale: 3 });
  expect(sw(at(199))?.y).toBe(SWITCH_AT.y);
  expect(sw(at(200))?.y).toBe(SWITCH_AT.y + 4);
  expect(sw(at(999))?.y).toBe(SWITCH_AT.y + 4);
});

test('lights off: the room darkens in four steps after the click', () => {
  expect([0, 200, 400, 600, 800].map((t) => LIGHTS.frame(OFF, t, false).dim)).toEqual([0, 0.25, 0.5, 0.75, 1]);
  expect(LIGHTS.frame(OFF, 999, false).dim).toBe(1);
});

test('lights off: no flash and no shake', () => {
  for (let t = 0; t < 1000; t += 50) expect(LIGHTS.frame(OFF, t, false)).toMatchObject({ flash: false, petDx: 0, pose: null });
});

test('lights on: the switch clicks, the room lights up with one flash frame', () => {
  const at = (t: number) => LIGHTS.frame(ON, t, false);
  expect(sw(at(50))?.y).toBe(SWITCH_AT.y);
  expect(sw(at(100))?.y).toBe(SWITCH_AT.y + 4);
  expect([50, 100].map((t) => at(t).dim)).toEqual([1, 0]);
  expect([50, 150, 250].map((t) => at(t).flash)).toEqual([false, true, false]);
});

test('lights on: the sleeping pet wiggles, keeping its usual pose', () => {
  const at = (t: number) => LIGHTS.frame(ON, t, false);
  expect([150, 250, 350, 450].map((t) => at(t).petDx)).toEqual([0, 4, -4, 4]);
  expect(at(250).pose).toBeNull();
});

test('durations: 1000 off, 800 on, 300 with reduced motion', () => {
  expect([LIGHTS.durationMs(OFF, false), LIGHTS.durationMs(ON, false)]).toEqual([1000, 800]);
  expect([LIGHTS.durationMs(OFF, true), LIGHTS.durationMs(ON, true)]).toEqual([300, 300]);
});

test('the switch clicks', () => {
  expect(LIGHTS.cues(OFF, false)).toEqual([{ atMs: 200, sfx: 'click' }]);
  expect(LIGHTS.cues(ON, false)).toEqual([{ atMs: 100, sfx: 'click' }]);
  expect(LIGHTS.cues(ON, true)).toEqual([{ atMs: 0, sfx: 'click' }]);
});

test('reduced: the room is at its final light at once, still switch, no flash or wiggle', () => {
  expect(LIGHTS.frame(OFF, 0, true)).toMatchObject({ dim: 1, flash: false, petDx: 0 });
  expect(LIGHTS.frame(ON, 0, true)).toMatchObject({ dim: 0, flash: false, petDx: 0 });
  expect(sw(LIGHTS.frame(ON, 0, true))).toEqual(sw(LIGHTS.frame(ON, 250, true)));
});
