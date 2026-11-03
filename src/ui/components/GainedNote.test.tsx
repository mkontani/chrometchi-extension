import { act, cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { GainedNote } from './GainedNote';

vi.mock('@/i18n/t', () => ({ t: (k: string) => k }));
vi.mock('@/ui/assets', () => ({ iconUrl: (id: string) => `${id}.png` }));

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

test('lists each gained food with its count', () => {
  render(<GainedNote gained={{ fish: 2, meat: 1, egg: 0 }} onDone={vi.fn()} />);
  expect(screen.getByText('gained_title')).toBeTruthy();
  expect(screen.getByText('food_fish')).toBeTruthy();
  expect(screen.getByText('×2')).toBeTruthy();
  expect(screen.getByText('food_meat')).toBeTruthy();
  expect(screen.getByText('×1')).toBeTruthy();
  expect(screen.queryByText('food_egg')).toBeNull();
  expect(document.querySelector('img')?.getAttribute('src')).toBe('food_fish.png');
});

test('hides after 2500 ms', () => {
  const onDone = vi.fn();
  render(<GainedNote gained={{ fish: 1 }} onDone={onDone} />);
  act(() => void vi.advanceTimersByTime(2499));
  expect(onDone).not.toHaveBeenCalled();
  act(() => void vi.advanceTimersByTime(1));
  expect(onDone).toHaveBeenCalledTimes(1);
});

test('clicking dismisses it', () => {
  const onDone = vi.fn();
  render(<GainedNote gained={{ fish: 1 }} onDone={onDone} />);
  fireEvent.click(screen.getByRole('status'));
  expect(onDone).toHaveBeenCalledTimes(1);
});

test('shows nothing for an empty haul', () => {
  const onDone = vi.fn();
  const { container } = render(<GainedNote gained={{}} onDone={onDone} />);
  expect(container.innerHTML).toBe('');
  render(<GainedNote gained={null} onDone={onDone} />);
  act(() => void vi.advanceTimersByTime(3000));
  expect(onDone).not.toHaveBeenCalled();
});
