import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { NO_INPUT } from '@/games/types';
import { startLoop } from './gameLoop';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
});
afterEach(() => vi.useRealTimers());

const def = {
  init: () => 0,
  step: (s: number, dt: number) => s + dt,
  isOver: (s: number) => s >= 100,
  render: vi.fn(),
};
const ctx = {} as CanvasRenderingContext2D;

test('steps and renders each frame, then calls onOver once with the final state', () => {
  const onOver = vi.fn();
  startLoop(def, ctx, () => NO_INPUT, () => 'view', onOver);
  vi.advanceTimersByTime(500);
  expect(def.render).toHaveBeenCalled();
  expect(def.render.mock.calls[0]?.[2]).toBe('view');
  expect(onOver).toHaveBeenCalledTimes(1);
  expect(onOver.mock.calls[0]?.[0]).toBeGreaterThanOrEqual(100);
});

test('caps a long frame gap so a stalled tab cannot skip the game', () => {
  const steps: number[] = [];
  const onOver = vi.fn();
  startLoop({ ...def, step: (s, dt) => (steps.push(dt), s + dt), isOver: () => steps.length >= 3 }, ctx, () => NO_INPUT, () => 0, onOver);
  vi.advanceTimersByTime(1000);
  expect(Math.max(...steps)).toBeLessThanOrEqual(100);
});

test('the returned cleanup stops the loop', () => {
  const onOver = vi.fn();
  const stop = startLoop(def, ctx, () => NO_INPUT, () => 0, onOver);
  stop();
  vi.advanceTimersByTime(500);
  expect(onOver).not.toHaveBeenCalled();
});
