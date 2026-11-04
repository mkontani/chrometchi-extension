import { afterEach, expect, test, vi } from 'vitest';
import { createSfx } from './sound';

function fakeContext(state: 'running' | 'suspended' = 'running') {
  const oscillators: { type: string; frequency: { value: number }; start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> }[] = [];
  const ctx = {
    currentTime: 0,
    state,
    destination: {},
    resume: vi.fn().mockResolvedValue(undefined),
    createOscillator: vi.fn(() => {
      const osc = { type: 'sine', frequency: { value: 0 }, connect: vi.fn(), start: vi.fn(), stop: vi.fn() };
      oscillators.push(osc);
      return osc;
    }),
    createGain: vi.fn(() => ({
      gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
    })),
  };
  return { ctx, oscillators };
}
const asCtx = (c: unknown) => c as AudioContext;

afterEach(() => vi.restoreAllMocks());

test('does not create an AudioContext while sound is disabled', () => {
  const make = vi.fn();
  createSfx(() => false, make).play('eat');
  expect(make).not.toHaveBeenCalled();
});

test('plays a short square-wave sequence when enabled', () => {
  const { ctx, oscillators } = fakeContext();
  createSfx(() => true, () => asCtx(ctx)).play('happy');
  expect(oscillators.map((o) => o.frequency.value)).toEqual([659, 784, 1046]);
  expect(oscillators.every((o) => o.type === 'square')).toBe(true);
  const last = oscillators[oscillators.length - 1]!;
  expect(last.stop.mock.calls[0]![0]).toBeLessThanOrEqual(0.4);
});

test('alert has a rest between two beeps', () => {
  const { ctx, oscillators } = fakeContext();
  createSfx(() => true, () => asCtx(ctx)).play('alert');
  expect(oscillators.map((o) => o.frequency.value)).toEqual([988, 988]);
  expect(oscillators[1]!.start.mock.calls[0]![0]).toBeCloseTo(0.2);
});

test('creates the context once and reuses it', () => {
  const { ctx } = fakeContext();
  const make = vi.fn(() => asCtx(ctx));
  const sfx = createSfx(() => true, make);
  sfx.play('select');
  sfx.play('win');
  expect(make).toHaveBeenCalledTimes(1);
});

test('reads the enabled flag at play time', () => {
  const { ctx, oscillators } = fakeContext();
  let on = false;
  const sfx = createSfx(() => on, () => asCtx(ctx));
  sfx.play('select');
  expect(oscillators).toHaveLength(0);
  on = true;
  sfx.play('select');
  expect(oscillators).toHaveLength(1);
});

test('resumes a suspended context', () => {
  const { ctx } = fakeContext('suspended');
  createSfx(() => true, () => asCtx(ctx)).play('lose');
  expect(ctx.resume).toHaveBeenCalled();
});

test('a throwing context factory is reported, not thrown', () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const err = new Error('no audio');
  const sfx = createSfx(() => true, () => {
    throw err;
  });
  expect(() => sfx.play('eat')).not.toThrow();
  expect(warn).toHaveBeenCalledWith('[chrometchi] sfx', err);
});

test.each([
  ['sweep', [330, 262]],
  ['gulp', [392, 262]],
  ['click', [1318]],
] as const)('%s plays its notes', (name, notes) => {
  const { ctx, oscillators } = fakeContext();
  createSfx(() => true, () => asCtx(ctx)).play(name);
  expect(oscillators.map((o) => o.frequency.value)).toEqual(notes);
});

test('get is a short two-note rising chime', () => {
  const { ctx, oscillators } = fakeContext();
  createSfx(() => true, () => asCtx(ctx)).play('get');
  expect(oscillators.map((o) => o.frequency.value)).toEqual([784, 1047]);
  expect(oscillators[1]!.start.mock.calls[0]![0]).toBeCloseTo(0.06);
});
