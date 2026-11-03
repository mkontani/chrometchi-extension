import { act, cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

vi.mock('@/i18n/t', () => ({ t: (k: string) => k }));
vi.mock('@/ui/assets', () => ({
  assetUrl: (p: string) => (p === 'ui/outing/float' ? '/float.png' : null),
  iconUrl: () => null,
}));

interface S { elapsed: number }
const stub = vi.hoisted(() => ({
  kind: 'fishing' as const,
  init: (): S => ({ elapsed: 0 }),
  step: (s: S, dt: number): S => ({ elapsed: s.elapsed + dt }),
  isOver: (s: S) => s.elapsed >= 1000,
  score: () => 42,
  render: vi.fn(),
}));
vi.mock('@/outings/registry', () => ({ OUTING_GAMES: { fishing: stub } }));

import { OutingHost } from './OutingHost';

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
      'requestAnimationFrame', 'cancelAnimationFrame', 'performance'],
  });
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({})) as never;
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

test('runs the game and calls onFinish with the score after the result pause', () => {
  const onFinish = vi.fn();
  const onResult = vi.fn();
  render(<OutingHost kind="fishing" onFinish={onFinish} onCancel={vi.fn()} onResult={onResult} />);
  act(() => void vi.advanceTimersByTime(1200));
  expect(screen.getByText('outing_done')).toBeTruthy();
  expect(onResult).toHaveBeenCalledWith(42);
  expect(onFinish).not.toHaveBeenCalled();
  act(() => void vi.advanceTimersByTime(1500));
  expect(onFinish).toHaveBeenCalledWith(42);
  expect(onFinish).toHaveBeenCalledTimes(1);
});

test('cancel calls onCancel and sends nothing', () => {
  const onFinish = vi.fn();
  const onCancel = vi.fn();
  const { unmount } = render(<OutingHost kind="fishing" onFinish={onFinish} onCancel={onCancel} />);
  fireEvent.click(screen.getByText('game_quit'));
  expect(onCancel).toHaveBeenCalledTimes(1);
  unmount(); // the App closes the host on cancel
  act(() => void vi.advanceTimersByTime(5000));
  expect(onFinish).not.toHaveBeenCalled();
});

test('the hint shows for the first 2 seconds only', () => {
  render(<OutingHost kind="fishing" onFinish={vi.fn()} onCancel={vi.fn()} />);
  expect(screen.getByText('outing_hint_fishing')).toBeTruthy();
  act(() => void vi.advanceTimersByTime(1999));
  expect(screen.queryByText('outing_hint_fishing')).toBeTruthy();
  act(() => void vi.advanceTimersByTime(1));
  expect(screen.queryByText('outing_hint_fishing')).toBeNull();
});

test('the view art is null while loading or missing, and the loaded image once ready', () => {
  class LoadedImage { src = ''; complete = true; naturalWidth = 8; }
  vi.stubGlobal('Image', LoadedImage);
  stub.render.mockClear();
  render(<OutingHost kind="fishing" playerUrl="/p.png" onFinish={vi.fn()} onCancel={vi.fn()} />);
  act(() => void vi.advanceTimersByTime(50));
  const view = stub.render.mock.calls.at(-1)?.[2];
  expect(view.player).toBeInstanceOf(LoadedImage);
  expect(view.art('float')).toBeInstanceOf(LoadedImage);
  expect(view.art('grass')).toBeNull();
  expect(view.art('food_fish')).toBeNull();
  vi.unstubAllGlobals();
});
