import { act, cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

vi.mock('@/i18n/t', () => ({ t: (k: string) => k }));

interface S { elapsed: number; picks: number[]; lefts: number }
const stub = vi.hoisted(() => ({
  id: 'catch' as const,
  init: (): S => ({ elapsed: 0, picks: [], lefts: 0 }),
  step: (s: S, dt: number, input: { pick: number | null; left: boolean }): S => ({
    elapsed: s.elapsed + dt,
    lefts: s.lefts + (input.left ? 1 : 0),
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

test('host is a modal dialog labelled with the game name', () => {
  render(<MiniGameHost game="catch" onFinish={vi.fn()} onCancel={vi.fn()} />);
  const dialog = screen.getByRole('dialog', { name: 'game_catch' });
  expect(dialog.getAttribute('aria-modal')).toBe('true');
});

test('host marks the frame ready once the loop and input listeners are attached', () => {
  const { container } = render(<MiniGameHost game="catch" onFinish={vi.fn()} onCancel={vi.fn()} />);
  expect(container.querySelector('.minigame__frame')?.getAttribute('data-ready')).toBe('true');
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

const lastState = () => {
  const calls = (stub.render as ReturnType<typeof vi.fn>).mock.calls;
  return calls[calls.length - 1]?.[1] as S;
};

test('taps map from the content box: far right is lane 4, border taps are ignored', () => {
  const ui = render(<MiniGameHost game="catch" onFinish={vi.fn()} onCancel={vi.fn()} />);
  const canvas = ui.container.querySelector('canvas') as HTMLCanvasElement;
  canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 360, height: 360 }) as DOMRect;
  Object.defineProperty(canvas, 'clientLeft', { value: 3 });
  Object.defineProperty(canvas, 'clientTop', { value: 3 });
  fireEvent.pointerDown(canvas, { clientX: 356, clientY: 100 }); // content x = 353 of 354
  fireEvent.pointerDown(canvas, { clientX: 1, clientY: 100 }); // on the border
  act(() => void vi.advanceTimersByTime(20));
  expect(lastState().picks).toEqual([4]);
});

test('quit is removed once the game is over and onFinish still fires once', () => {
  const onFinish = vi.fn();
  const onCancel = vi.fn();
  render(<MiniGameHost game="catch" onFinish={onFinish} onCancel={onCancel} />);
  expect(screen.getByText('game_quit')).toBeTruthy();
  act(() => void vi.advanceTimersByTime(1200));
  expect(screen.queryByText('game_quit')).toBeNull();
  act(() => void vi.advanceTimersByTime(1500));
  expect(onFinish).toHaveBeenCalledTimes(1);
  expect(onCancel).not.toHaveBeenCalled();
});

test('auto-repeat keydown does not add edges', () => {
  render(<MiniGameHost game="catch" onFinish={vi.fn()} onCancel={vi.fn()} />);
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
  act(() => void vi.advanceTimersByTime(20));
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', repeat: true }));
  act(() => void vi.advanceTimersByTime(20));
  expect(lastState().lefts).toBe(1);
});

test('onResult fires once when the result is shown, before onFinish', () => {
  const onResult = vi.fn();
  const onFinish = vi.fn();
  render(<MiniGameHost game="catch" onFinish={onFinish} onCancel={vi.fn()} onResult={onResult} />);
  act(() => void vi.advanceTimersByTime(1200));
  expect(onResult).toHaveBeenCalledTimes(1);
  expect(onResult).toHaveBeenCalledWith(true);
  expect(onFinish).not.toHaveBeenCalled();
  act(() => void vi.advanceTimersByTime(3000));
  expect(onResult).toHaveBeenCalledTimes(1);
});
