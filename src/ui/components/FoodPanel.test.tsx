import { act, cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { afterEach, expect, test, vi } from 'vitest';
import { FOODS, isDish } from '@/data/foods';
import { FoodPanel } from './FoodPanel';

vi.mock('@/i18n/t', () => ({ t: (k: string) => k }));
afterEach(cleanup);

const OWNED = FOODS.filter((f) => !isDish(f.id));

test('lists the ingredients with a meal or snack tag', () => {
  render(<FoodPanel onCook={vi.fn()} pantry={{}} onPick={vi.fn()} onClose={vi.fn()} />);
  for (const f of OWNED) expect(screen.getByText(`food_${f.id}`)).toBeTruthy();
  expect(screen.getAllByText('food_kind_meal')).toHaveLength(OWNED.filter((f) => f.kind === 'meal').length);
  expect(screen.getAllByText('food_kind_snack')).toHaveLength(OWNED.filter((f) => f.kind === 'snack').length);
});

test('the eat tab hides dishes you have none of but keeps the ingredients', () => {
  render(<FoodPanel onCook={vi.fn()} pantry={{ steak: 1 }} onPick={vi.fn()} onClose={vi.fn()} />);
  const steak = screen.getByText('food_steak').closest('button') as HTMLButtonElement;
  expect(steak.textContent).toContain('×1');
  for (const hidden of ['cake', 'omurice', 'mystery']) expect(screen.queryByText(`food_${hidden}`)).toBeNull();
  const fish = screen.getByText('food_fish').closest('button') as HTMLButtonElement;
  expect(fish.textContent).toContain('×0');
  expect(fish.disabled).toBe(true);
});

test('the tabs switch between eating and cooking', () => {
  render(<FoodPanel onCook={vi.fn()} pantry={{ steak: 1 }} onPick={vi.fn()} onClose={vi.fn()} />);
  const eat = screen.getByRole('tab', { name: 'tab_eat' });
  const cook = screen.getByRole('tab', { name: 'tab_cook' });
  expect(eat.getAttribute('aria-selected')).toBe('true');
  expect(cook.getAttribute('aria-selected')).toBe('false');
  expect(screen.queryByText('cook_make')).toBeNull();
  fireEvent.click(cook);
  expect(cook.getAttribute('aria-selected')).toBe('true');
  expect(eat.getAttribute('aria-selected')).toBe('false');
  expect(screen.getByText('cook_make')).toBeTruthy();
  expect(screen.queryByText('food_steak')).toBeNull();
  fireEvent.click(eat);
  expect(screen.getByText('food_steak')).toBeTruthy();
});

test('the pot survives a switch of tab, and cooking sends it', () => {
  const onCook = vi.fn();
  render(<FoodPanel onCook={onCook} pantry={{ egg: 1 }} onPick={vi.fn()} onClose={vi.fn()} />);
  fireEvent.click(screen.getByRole('tab', { name: 'tab_cook' }));
  fireEvent.click(screen.getByText('food_egg'));
  fireEvent.click(screen.getByRole('tab', { name: 'tab_eat' }));
  fireEvent.click(screen.getByRole('tab', { name: 'tab_cook' }));
  fireEvent.click(screen.getByText('cook_make'));
  expect(onCook).toHaveBeenCalledWith(['egg']);
});

test('picking a food calls onPick with its id', () => {
  const onPick = vi.fn();
  render(<FoodPanel onCook={vi.fn()} pantry={{ cake: 1 }} onPick={onPick} onClose={vi.fn()} />);
  fireEvent.click(screen.getByText('food_cake'));
  expect(onPick).toHaveBeenCalledWith('cake');
});

test('close button calls onClose', () => {
  const onClose = vi.fn();
  render(<FoodPanel onCook={vi.fn()} pantry={{ cake: 1 }} onPick={vi.fn()} onClose={onClose} />);
  fireEvent.click(screen.getByLabelText('close'));
  expect(onClose).toHaveBeenCalled();
});

test('rice and candy show ∞', () => {
  render(<FoodPanel onCook={vi.fn()} pantry={{}} onPick={vi.fn()} onClose={vi.fn()} />);
  expect(screen.getAllByText('∞')).toHaveLength(2);
});

test('stocked foods show ×count', () => {
  render(<FoodPanel onCook={vi.fn()} pantry={{ fish: 3, meat: 12 }} onPick={vi.fn()} onClose={vi.fn()} />);
  expect(screen.getByText('×3')).toBeTruthy();
  expect(screen.getByText('×12')).toBeTruthy();
});

test('foods at 0 are disabled', () => {
  const onPick = vi.fn();
  render(<FoodPanel onCook={vi.fn()} pantry={{ fish: 3 }} onPick={onPick} onClose={vi.fn()} />);
  const btn = (name: string) => screen.getByText(name).closest('button') as HTMLButtonElement;
  const disabled = (name: string) => btn(name).disabled;
  expect(disabled('food_shrimp')).toBe(true);
  expect(disabled('food_fish')).toBe(false);
  expect(disabled('food_rice')).toBe(false);
  fireEvent.click(btn('food_shrimp'));
  expect(onPick).not.toHaveBeenCalled();
});

function stubScroll(el: Element, m: { scrollHeight: number; clientHeight: number; scrollTop: number }) {
  for (const k of ['scrollHeight', 'clientHeight', 'scrollTop'] as const) {
    Object.defineProperty(el, k, { configurable: true, get: () => m[k] });
  }
}

test('shows a decorative scroll cue while foods hide below, and hides it at the bottom', () => {
  const { container } = render(<FoodPanel onCook={vi.fn()} pantry={{}} onPick={vi.fn()} onClose={vi.fn()} />);
  const list = container.querySelector('.panel__grid--food')!;
  const m = { scrollHeight: 200, clientHeight: 112, scrollTop: 0 };
  stubScroll(list, m);
  act(() => { list.dispatchEvent(new Event('scroll')); });
  const cue = container.querySelector('.panel__more');
  expect(cue).toBeTruthy();
  expect(cue!.getAttribute('aria-hidden')).toBe('true');
  m.scrollTop = 88;
  act(() => { list.dispatchEvent(new Event('scroll')); });
  expect(container.querySelector('.panel__more')).toBeNull();
});

test('no scroll cue when every food fits', () => {
  const { container } = render(<FoodPanel onCook={vi.fn()} pantry={{}} onPick={vi.fn()} onClose={vi.fn()} />);
  const list = container.querySelector('.panel__grid--food')!;
  stubScroll(list, { scrollHeight: 100, clientHeight: 100, scrollTop: 0 });
  act(() => { list.dispatchEvent(new Event('scroll')); });
  expect(container.querySelector('.panel__more')).toBeNull();
});

test('clicking the cue scrolls the list down by one row', () => {
  const { container } = render(<FoodPanel onCook={vi.fn()} pantry={{}} onPick={vi.fn()} onClose={vi.fn()} />);
  const list = container.querySelector('.panel__grid--food') as HTMLElement;
  stubScroll(list, { scrollHeight: 200, clientHeight: 112, scrollTop: 0 });
  const scrollBy = vi.fn();
  list.scrollBy = scrollBy;
  act(() => { list.dispatchEvent(new Event('scroll')); });
  fireEvent.click(container.querySelector('.panel__more')!);
  expect(scrollBy).toHaveBeenCalledWith({ top: 50 });
});
