import { act, cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { COOKED_MS, CookedNote } from './CookedNote';

vi.mock('@/i18n/t', () => ({ t: (k: string, subs?: string[]) => (subs ? `${k}:${subs.join(',')}` : k) }));
vi.mock('@/ui/assets', () => ({ iconUrl: (id: string) => `${id}.png` }));

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

test('shows nothing until delayMs, then the dish and the title', () => {
  render(<CookedNote cooked={{ dish: 'steak', first: false }} delayMs={1600} onDone={vi.fn()} />);
  expect(screen.queryByRole('status')).toBeNull();
  act(() => void vi.advanceTimersByTime(1599));
  expect(screen.queryByRole('status')).toBeNull();
  act(() => void vi.advanceTimersByTime(1));
  expect(screen.getByText('cooked_title:food_steak')).toBeTruthy();
  expect(document.querySelector('img')?.getAttribute('src')).toBe('food_steak.png');
});

test('marks a first recipe with New recipe!', () => {
  render(<CookedNote cooked={{ dish: 'steak', first: true }} delayMs={0} onDone={vi.fn()} />);
  act(() => void vi.advanceTimersByTime(0));
  expect(screen.getByText('cooked_first')).toBeTruthy();
});

test('a mystery dish has no New recipe! mark', () => {
  render(<CookedNote cooked={{ dish: 'mystery', first: false }} delayMs={0} onDone={vi.fn()} />);
  act(() => void vi.advanceTimersByTime(0));
  expect(screen.getByText('cooked_title:food_mystery')).toBeTruthy();
  expect(screen.queryByText('cooked_first')).toBeNull();
});

test('calls onDone after COOKED_MS', () => {
  const onDone = vi.fn();
  render(<CookedNote cooked={{ dish: 'steak', first: true }} delayMs={800} onDone={onDone} />);
  act(() => void vi.advanceTimersByTime(800 + COOKED_MS - 1));
  expect(onDone).not.toHaveBeenCalled();
  act(() => void vi.advanceTimersByTime(1));
  expect(onDone).toHaveBeenCalledTimes(1);
  expect(COOKED_MS).toBe(2500);
});

test('tapping the note dismisses it', () => {
  const onDone = vi.fn();
  render(<CookedNote cooked={{ dish: 'steak', first: false }} delayMs={0} onDone={onDone} />);
  act(() => void vi.advanceTimersByTime(0));
  fireEvent.click(screen.getByRole('status'));
  expect(onDone).toHaveBeenCalled();
});

test('renders nothing without a cooked dish', () => {
  render(<CookedNote cooked={null} delayMs={0} onDone={vi.fn()} />);
  act(() => void vi.advanceTimersByTime(5000));
  expect(screen.queryByRole('status')).toBeNull();
});
