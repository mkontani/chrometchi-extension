import { cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { afterEach, expect, test, vi } from 'vitest';
import { PlayPanel } from './PlayPanel';

vi.mock('@/i18n/t', () => ({ t: (k: string) => k }));
afterEach(cleanup);

test('lists the three games and picks one', () => {
  const onPick = vi.fn();
  render(<PlayPanel onPick={onPick} onClose={vi.fn()} />);
  expect(screen.getByText('game_catch')).toBeTruthy();
  expect(screen.getByText('game_cups')).toBeTruthy();
  fireEvent.click(screen.getByText('game_stop'));
  expect(onPick).toHaveBeenCalledWith('stop');
});

test('close button calls onClose', () => {
  const onClose = vi.fn();
  render(<PlayPanel onPick={vi.fn()} onClose={onClose} />);
  fireEvent.click(screen.getByLabelText('close'));
  expect(onClose).toHaveBeenCalled();
});
