import { cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { afterEach, expect, test, vi } from 'vitest';
import { FOODS } from '@/data/foods';
import { FoodPanel } from './FoodPanel';

vi.mock('@/i18n/t', () => ({ t: (k: string) => k }));
afterEach(cleanup);

test('lists all foods with a meal or snack tag', () => {
  render(<FoodPanel onPick={vi.fn()} onClose={vi.fn()} />);
  for (const f of FOODS) expect(screen.getByText(`food_${f.id}`)).toBeTruthy();
  expect(screen.getAllByText('food_kind_meal')).toHaveLength(4);
  expect(screen.getAllByText('food_kind_snack')).toHaveLength(2);
});

test('picking a food calls onPick with its id', () => {
  const onPick = vi.fn();
  render(<FoodPanel onPick={onPick} onClose={vi.fn()} />);
  fireEvent.click(screen.getByText('food_cake'));
  expect(onPick).toHaveBeenCalledWith('cake');
});

test('close button calls onClose', () => {
  const onClose = vi.fn();
  render(<FoodPanel onPick={vi.fn()} onClose={onClose} />);
  fireEvent.click(screen.getByLabelText('close'));
  expect(onClose).toHaveBeenCalled();
});
