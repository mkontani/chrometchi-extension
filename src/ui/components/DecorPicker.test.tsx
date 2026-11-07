import { cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { afterEach, expect, test, vi } from 'vitest';
import { DecorPicker } from './DecorPicker';

vi.mock('@/i18n/t', () => ({ t: (k: string) => k }));
vi.mock('@/ui/assets', () => ({ decorUrl: () => null }));

afterEach(cleanup);

test('lists only owned items that fit the slot', () => {
  const onPlace = vi.fn();
  render(<DecorPicker owned={['candle', 'clock', 'bunting', 'lamp']} slotKind="floor" placed={null} onPlace={onPlace} />);
  expect(screen.getByRole('button', { name: 'decor_candle' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'decor_lamp' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'decor_clock' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'decor_bunting' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'decor_lamp' }));
  expect(onPlace).toHaveBeenCalledWith('lamp');
});

test('remove shows only when the slot is filled', () => {
  const onPlace = vi.fn();
  const ui = render(<DecorPicker owned={['candle']} slotKind="floor" placed={null} onPlace={onPlace} />);
  expect(screen.queryByRole('button', { name: 'decor_remove' })).toBeNull();
  ui.rerender(<DecorPicker owned={['candle']} slotKind="floor" placed="candle" onPlace={onPlace} />);
  fireEvent.click(screen.getByRole('button', { name: 'decor_remove' }));
  expect(onPlace).toHaveBeenCalledWith(null);
  expect(screen.getByRole('button', { name: 'decor_candle' }).getAttribute('aria-pressed')).toBe('true');
});

test('with nothing to place it says where to buy', () => {
  render(<DecorPicker owned={['clock']} slotKind="floor" placed={null} onPlace={() => undefined} />);
  expect(screen.getByText('decor_empty')).toBeTruthy();
});

test('pressing the item already placed sends nothing', () => {
  const onPlace = vi.fn();
  render(<DecorPicker owned={['candle', 'lamp']} slotKind="floor" placed="candle" onPlace={onPlace} />);
  fireEvent.click(screen.getByRole('button', { name: 'decor_candle' }));
  expect(onPlace).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'decor_lamp' }));
  expect(onPlace).toHaveBeenCalledWith('lamp');
});
