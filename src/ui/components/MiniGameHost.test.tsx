import { act, cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

vi.mock('@/i18n/t', () => ({ t: (k: string) => k }));

interface S { elapsed: number; picks: number[] }
const stub = vi.hoisted(() => ({
  id: 'catch' as const,
  init: (): S => ({ elapsed: 0, picks: [] }),
  step: (s: S, dt: number, input: { pick: number | null }): S => ({
    elapsed: s.elapsed + dt,
    picks: input.pick === null ? s.picks : [...s.picks, input.pick],
  }),
  isOver: (s: S) => s.elapsed >= 1000,
  won: () => true,
  render: vi.fn(),
  pickFromPointer: (x: number) => Math.floor(x / 36),
}));
vi.mock('@/games/registry', () => ({ MINI_GAMES: { catch: stub } }));

import { MiniGameHost } from './MiniGameHost';

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

test('host calls onFinish with won after the result delay', () => {
  const onFinish = vi.fn();
  render(<MiniGameHost game="catch" onFinish={onFinish} onCancel={vi.fn()} />);
  act(() => void vi.advanceTimersByTime(1200));
  expect(screen.getByText('game_win')).toBeTruthy();
  expect(onFinish).not.toHaveBeenCalled();
  act(() => void vi.advanceTimersByTime(1500));
  expect(onFinish).toHaveBeenCalledWith(true);
  expect(onFinish).toHaveBeenCalledTimes(1);
});

test('quit calls onCancel and never onFinish', () => {
  const onFinish = vi.fn();
  const onCancel = vi.fn();
  const ui = render(<MiniGameHost game="catch" onFinish={onFinish} onCancel={onCancel} />);
  fireEvent.click(screen.getByText('game_quit'));
  ui.unmount(); // the parent unmounts the host on cancel
  act(() => void vi.advanceTimersByTime(5000));
  expect(onCancel).toHaveBeenCalledTimes(1);
  expect(onFinish).not.toHaveBeenCalled();
});

test('shows the hint', () => {
  render(<MiniGameHost game="catch" onFinish={vi.fn()} onCancel={vi.fn()} />);
  expect(screen.getByText('game_hint_catch')).toBeTruthy();
});

test('cleans up RAF on unmount', () => {
  const cancel = vi.spyOn(globalThis, 'cancelAnimationFrame');
  const ui = render(<MiniGameHost game="catch" onFinish={vi.fn()} onCancel={vi.fn()} />);
  act(() => void vi.advanceTimersByTime(50));
  ui.unmount();
  expect(cancel).toHaveBeenCalled();
});

test('pointer taps are scaled to canvas coordinates', () => {
  const ui = render(<MiniGameHost game="catch" onFinish={vi.fn()} onCancel={vi.fn()} />);
  const canvas = ui.container.querySelector('canvas') as HTMLCanvasElement;
  canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 360, height: 360 }) as DOMRect;
  fireEvent.pointerDown(canvas, { clientX: 300, clientY: 10 });
  act(() => void vi.advanceTimersByTime(50));
  const calls = (stub.render as ReturnType<typeof vi.fn>).mock.calls;
  const last = calls[calls.length - 1]?.[1] as S;
  expect(last.picks).toEqual([4]);
});

test('arrow keys feed edges', () => {
  render(<MiniGameHost game="catch" onFinish={vi.fn()} onCancel={vi.fn()} />);
  const ev = new KeyboardEvent('keydown', { key: 'ArrowLeft', cancelable: true });
  window.dispatchEvent(ev);
  expect(ev.defaultPrevented).toBe(true);
});
