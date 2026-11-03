import { cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { afterEach, expect, test, vi } from 'vitest';
import { FOODS } from '@/data/foods';
import { FoodPanel } from './FoodPanel';

vi.mock('@/i18n/t', () => ({ t: (k: string) => k }));
afterEach(cleanup);

test('lists all foods with a meal or snack tag', () => {
  render(<FoodPanel pantry={{ cake: 1 }} onPick={vi.fn()} onClose={vi.fn()} />);
  for (const f of FOODS) expect(screen.getByText(`food_${f.id}`)).toBeTruthy();
  expect(screen.getAllByText('food_kind_meal')).toHaveLength(9);
  expect(screen.getAllByText('food_kind_snack')).toHaveLength(2);
});

test('picking a food calls onPick with its id', () => {
  const onPick = vi.fn();
  render(<FoodPanel pantry={{ cake: 1 }} onPick={onPick} onClose={vi.fn()} />);
  fireEvent.click(screen.getByText('food_cake'));
  expect(onPick).toHaveBeenCalledWith('cake');
});

test('close button calls onClose', () => {
  const onClose = vi.fn();
  render(<FoodPanel pantry={{ cake: 1 }} onPick={vi.fn()} onClose={onClose} />);
  fireEvent.click(screen.getByLabelText('close'));
  expect(onClose).toHaveBeenCalled();
});

test('rice and candy show ∞', () => {
  render(<FoodPanel pantry={{}} onPick={vi.fn()} onClose={vi.fn()} />);
  expect(screen.getAllByText('∞')).toHaveLength(2);
});

test('stocked foods show ×count', () => {
  render(<FoodPanel pantry={{ fish: 3, meat: 12 }} onPick={vi.fn()} onClose={vi.fn()} />);
  expect(screen.getByText('×3')).toBeTruthy();
  expect(screen.getByText('×12')).toBeTruthy();
});

test('foods at 0 are disabled', () => {
  const onPick = vi.fn();
  render(<FoodPanel pantry={{ fish: 3 }} onPick={onPick} onClose={vi.fn()} />);
  const btn = (name: string) => screen.getByText(name).closest('button') as HTMLButtonElement;
  const disabled = (name: string) => btn(name).disabled;
  expect(disabled('food_shrimp')).toBe(true);
  expect(disabled('food_fish')).toBe(false);
  expect(disabled('food_rice')).toBe(false);
  fireEvent.click(btn('food_shrimp'));
  expect(onPick).not.toHaveBeenCalled();
});
