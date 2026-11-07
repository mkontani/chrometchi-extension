import { cleanup, fireEvent, render, screen, within } from '@testing-library/preact';
import { afterEach, expect, test, vi } from 'vitest';
import en from '../../../public/_locales/en/messages.json';
import { INGREDIENT_IDS } from '@/data/foods';
import { ShopView } from './ShopView';

type Entry = { message: string; placeholders?: Record<string, { content: string }> };
const MESSAGES = en as Record<string, Entry>;

vi.mock('@/i18n/t', () => ({
  t: (key: string, subs?: string | string[]) => {
    const entry = MESSAGES[key];
    if (!entry) return key;
    const list = [subs ?? []].flat();
    return entry.message.replace(/\$(\w+)\$/g, (_m, name: string) => {
      const content = entry.placeholders?.[name.toLowerCase()]?.content ?? '';
      return content.replace(/\$(\d)/g, (_x, n: string) => list[Number(n) - 1] ?? '');
    });
  },
}));
vi.mock('@/ui/assets', () => ({ iconUrl: (id: string) => `${id}.png` }));
afterEach(cleanup);

const rows = () => screen.getAllByRole('listitem');

test('lists the 8 ingredients with their stock and price', () => {
  render(<ShopView pantry={{ fish: 4 }} coins={0} onSell={() => undefined} />);
  expect(rows()).toHaveLength(8);
  expect(rows().map((r) => r.querySelector('img')?.getAttribute('src'))).toEqual(
    INGREDIENT_IDS.map((id) => `food_${id}.png`),
  );
  const fish = rows()[INGREDIENT_IDS.indexOf('fish')] as HTMLElement;
  expect(within(fish).getByText('Fish')).toBeTruthy();
  expect(within(fish).getByText('×4')).toBeTruthy();
  const price = within(fish).getByLabelText('Coins: 2');
  expect(price.querySelector('img')?.getAttribute('src')).toBe('coin.png');
});

test('"Sell 1" sends one and "Sell all" sends the whole stock', () => {
  const onSell = vi.fn();
  render(<ShopView pantry={{ fish: 4 }} coins={0} onSell={onSell} />);
  const fish = rows()[INGREDIENT_IDS.indexOf('fish')] as HTMLElement;
  fireEvent.click(within(fish).getByRole('button', { name: 'Sell 1' }));
  fireEvent.click(within(fish).getByRole('button', { name: 'Sell all' }));
  expect(onSell.mock.calls).toEqual([['fish', 1], ['fish', 4]]);
});

test('an ingredient with no stock cannot be sold', () => {
  render(<ShopView pantry={{ fish: 4 }} coins={0} onSell={() => undefined} />);
  const nuts = rows()[INGREDIENT_IDS.indexOf('nuts')] as HTMLElement;
  for (const b of within(nuts).getAllByRole('button')) expect((b as HTMLButtonElement).disabled).toBe(true);
});

test('shows the coins the player has', () => {
  render(<ShopView pantry={{}} coins={123} onSell={() => undefined} />);
  expect(screen.getByText('Coins: 123')).toBeTruthy();
});
