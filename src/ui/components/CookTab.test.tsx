import { cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { useState } from 'preact/hooks';
import { afterEach, expect, test, vi } from 'vitest';
import type { Pantry } from '@/core/types';
import type { PotItem } from '@/data/recipes';
import { CookTab } from './CookTab';

vi.mock('@/i18n/t', () => ({ t: (k: string) => k }));
afterEach(cleanup);

/** Holds the pot the way FoodPanel does, around the real CookTab. */
function Harness({ pantry, onCook }: { pantry: Pantry; onCook(items: readonly PotItem[]): void }) {
  const [pot, setPot] = useState<readonly PotItem[]>([]);
  return <CookTab pantry={pantry} pot={pot} onPot={setPot} onCook={onCook} />;
}

const ALL: Pantry = { fish: 5, shrimp: 5, meat: 5, egg: 5, nuts: 5, mushroom: 5, veggie: 5, fruit: 5 };
const tap = (food: string) => fireEvent.click(screen.getByText(`food_${food}`));
const slots = (c: Element) => [...c.querySelectorAll('.cook__slot')] as HTMLButtonElement[];
const cookButton = () => screen.getByText('cook_make').closest('button') as HTMLButtonElement;

test('the pot offers rice and the 8 ingredients, never candy or dishes', () => {
  const { container } = render(<Harness pantry={{ ...ALL, steak: 2, cake: 1 }} onCook={vi.fn()} />);
  const names = [...container.querySelectorAll('.panel__grid .panel__text > span:first-child')].map((e) => e.textContent);
  expect(names).toEqual(
    ['rice', 'fish', 'shrimp', 'meat', 'egg', 'nuts', 'mushroom', 'veggie', 'fruit'].map((f) => `food_${f}`),
  );
  expect(screen.queryByText('food_candy')).toBeNull();
  expect(screen.queryByText('food_steak')).toBeNull();
});

test('tapping an ingredient puts it in the pot, and tapping it in the pot takes it back', () => {
  const { container } = render(<Harness pantry={ALL} onCook={vi.fn()} />);
  expect(screen.getByText('cook_pot_empty')).toBeTruthy();
  tap('fish');
  tap('rice');
  expect(screen.queryByText('cook_pot_empty')).toBeNull();
  expect(slots(container).map((s) => s.getAttribute('aria-label'))).toEqual([
    'food_fish', 'food_rice', null, null,
  ]);
  fireEvent.click(screen.getByLabelText('food_fish'));
  expect(slots(container).map((s) => s.getAttribute('aria-label'))).toEqual(['food_rice', null, null, null]);
});

test('an ingredient goes in only as many times as you have it; rice any number of times', () => {
  render(<Harness pantry={{ meat: 1 }} onCook={vi.fn()} />);
  const meat = screen.getByText('food_meat').closest('button') as HTMLButtonElement;
  expect(meat.disabled).toBe(false);
  fireEvent.click(meat);
  expect(meat.disabled).toBe(true);
  expect(meat.textContent).toContain('×0');
  const rice = screen.getByText('food_rice').closest('button') as HTMLButtonElement;
  fireEvent.click(rice);
  fireEvent.click(rice);
  expect(rice.disabled).toBe(false);
  expect(rice.textContent).toContain('∞');
});

test('the pot holds at most 4', () => {
  const { container } = render(<Harness pantry={ALL} onCook={vi.fn()} />);
  for (let i = 0; i < 6; i++) tap('rice');
  expect(slots(container).filter((s) => s.hasAttribute('aria-label'))).toHaveLength(4);
  expect((screen.getByText('food_fish').closest('button') as HTMLButtonElement).disabled).toBe(true);
});

test('Cook it is disabled for an empty pot and sends the pot items in the order they went in', () => {
  const onCook = vi.fn();
  render(<Harness pantry={ALL} onCook={onCook} />);
  expect(cookButton().disabled).toBe(true);
  fireEvent.click(cookButton());
  expect(onCook).not.toHaveBeenCalled();
  tap('egg');
  tap('rice');
  tap('egg');
  expect(cookButton().disabled).toBe(false);
  fireEvent.click(cookButton());
  expect(onCook).toHaveBeenCalledWith(['egg', 'rice', 'egg']);
});
