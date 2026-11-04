import { act, cleanup, fireEvent, render } from '@testing-library/preact';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
vi.mock('@/i18n/t', () => ({ t: (k: string) => k }));
vi.mock('@/ui/assets', () => ({ assetUrl: () => null, iconUrl: () => null }));

import { OUTING_GAMES } from '@/outings/registry';
import { bushX, bushY } from '@/outings/gathering/constants';
import type { FishingState } from '@/outings/fishing/logic';
import type { GatheringState } from '@/outings/gathering/logic';
import type { HuntingState } from '@/outings/hunting/logic';
import { OutingHost } from './OutingHost';

/** The host mounted with the REAL games: a tap on the canvas must reach the game as progress. */
const SCALE = 2; // the 180px logical canvas is shown at 360px

function lastState<S>(render: ReturnType<typeof vi.spyOn>): S {
  return render.mock.calls.at(-1)?.[1] as S;
}

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
      'requestAnimationFrame', 'cancelAnimationFrame', 'performance'],
  });
  vi.spyOn(Math, 'random').mockReturnValue(0);
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({})) as never;
  HTMLCanvasElement.prototype.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 360, height: 360, right: 360, bottom: 360, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

function mountAndTap(kind: 'fishing' | 'hunting' | 'gathering', beforeMs: number, at: { x: number; y: number }) {
  const spy = vi.spyOn(OUTING_GAMES[kind], 'render').mockImplementation(() => undefined);
  const { container } = render(<OutingHost kind={kind} onFinish={vi.fn()} onCancel={vi.fn()} />);
  act(() => void vi.advanceTimersByTime(beforeMs));
  const canvas = container.querySelector('canvas') as HTMLCanvasElement;
  fireEvent.pointerDown(canvas, { clientX: at.x * SCALE, clientY: at.y * SCALE });
  act(() => void vi.advanceTimersByTime(48));
  return spy;
}

test('a tap on the canvas while the float is down catches a fish', () => {
  // rng 0 -> the first wait is 1000 ms, then the bite lasts 600 ms
  const spy = mountAndTap('fishing', 1200, { x: 90, y: 90 });
  expect(lastState<FishingState>(spy).catches).toBe(1);
});

test('a tap on the popped tuft catches it', () => {
  // rng 0 -> the first pop is at tuft 0 after 1000 ms
  const spy = mountAndTap('hunting', 1100, { x: 10, y: 120 });
  expect(lastState<HuntingState>(spy).caught).toBe(1);
});

test('a tap on a bush flips it', () => {
  const spy = mountAndTap('gathering', 100, { x: bushX(4) + 5, y: bushY(4) + 5 });
  const s = lastState<GatheringState>(spy);
  expect(s.flipped[4]).toBe(true);
  expect(s.flips).toBe(1);
});
