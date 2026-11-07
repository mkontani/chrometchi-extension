import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/preact';
import { afterEach, expect, test, vi } from 'vitest';
import en from '../../../public/_locales/en/messages.json';
import { INGREDIENT_IDS } from '@/data/foods';
import { ShopView } from './ShopView';

const noop = () => undefined;
const noBuy = () => Promise.resolve(false);
const view = (props: Partial<Parameters<typeof ShopView>[0]> = {}) =>
  render(<ShopView pantry={{}} coins={0} ownedDecor={[]} onSell={noop} onBuy={noBuy} {...props} />);
const sellTab = () => fireEvent.click(screen.getByRole('tab', { name: 'Sell' }));

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
vi.mock('@/ui/assets', () => ({ iconUrl: (id: string) => `${id}.png`, decorUrl: (id: string) => `decor-${id}.png` }));
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const rows = () => screen.getAllByRole('listitem');

test('lists the 8 ingredients with their stock and price', () => {
  view({ pantry: { fish: 4 }, coins: 0, onSell: () => undefined });
  sellTab();
  expect(rows()).toHaveLength(8);
  expect(rows().map((r) => r.querySelector('img')?.getAttribute('src'))).toEqual(
    INGREDIENT_IDS.map((id) => `food_${id}.png`),
  );
  const fish = rows()[INGREDIENT_IDS.indexOf('fish')] as HTMLElement;
  expect(within(fish).getByText('Fish')).toBeTruthy();
  expect(within(fish).getByText('×4')).toBeTruthy();
  const price = within(fish).getByRole('img', { name: 'Coins: 2' });
  expect(price.querySelector('img')?.getAttribute('src')).toBe('coin.png');
});

test('"Sell 1" sends one and "Sell all" sends the whole stock', () => {
  const onSell = vi.fn();
  view({ pantry: { fish: 4 }, coins: 0, onSell: onSell });
  sellTab();
  const fish = rows()[INGREDIENT_IDS.indexOf('fish')] as HTMLElement;
  fireEvent.click(within(fish).getByRole('button', { name: 'Sell 1 Fish' }));
  fireEvent.click(within(fish).getByRole('button', { name: 'Sell all Fish' }));
  expect(onSell.mock.calls).toEqual([['fish', 1], ['fish', 4]]);
});

test('an ingredient with no stock cannot be sold', () => {
  view({ pantry: { fish: 4 }, coins: 0, onSell: () => undefined });
  sellTab();
  const nuts = rows()[INGREDIENT_IDS.indexOf('nuts')] as HTMLElement;
  for (const b of within(nuts).getAllByRole('button')) expect((b as HTMLButtonElement).disabled).toBe(true);
});

test('shows the coins the player has', () => {
  view({ pantry: {}, coins: 123, onSell: () => undefined });
  sellTab();
  expect(screen.getByText('Coins: 123')).toBeTruthy();
});

test('each sell button is named after its food', () => {
  view({ pantry: { fish: 4 }, coins: 0, onSell: () => undefined });
  sellTab();
  expect(screen.getByRole('button', { name: 'Sell 1 Fish' }).textContent).toBe('Sell 1');
  expect(screen.getByRole('button', { name: 'Sell all Fish' }).textContent).toBe('Sell all');
  expect(screen.getAllByRole('button')).toHaveLength(16);
});

test('opens on the furniture tab and the sell list is one tab away', () => {
  view({ pantry: { fish: 4 } });
  expect(screen.getByRole('tab', { name: 'Furniture' }).getAttribute('aria-selected')).toBe('true');
  expect(screen.getAllByRole('listitem')).toHaveLength(28);
  expect(screen.queryByRole('button', { name: 'Sell 1 Fish' })).toBeNull();
  sellTab();
  expect(screen.getAllByRole('listitem')).toHaveLength(8);
  expect(screen.getByRole('tab', { name: 'Sell' }).getAttribute('aria-selected')).toBe('true');
});

test('buying from the furniture tab passes the item on', () => {
  const onBuy = vi.fn().mockResolvedValue(false);
  view({ coins: 500, onBuy });
  fireEvent.click(screen.getByRole('button', { name: 'Buy Candle' }));
  fireEvent.click(screen.getByRole('button', { name: 'Buy' }));
  expect(onBuy).toHaveBeenCalledWith('candle');
});

const buyCandle = async () => {
  fireEvent.click(screen.getByRole('button', { name: 'Buy Candle' }));
  fireEvent.click(screen.getByRole('button', { name: 'Buy' }));
  await act(async () => undefined);
};
const HINT = 'Place it from Decorate';

test('the bought hint shows after a successful buy and hides after its time', async () => {
  vi.useFakeTimers();
  view({ coins: 500, onBuy: () => Promise.resolve(true) });
  await buyCandle();
  expect(screen.getByText(HINT)).toBeTruthy();
  act(() => void vi.advanceTimersByTime(2500));
  expect(screen.queryByText(HINT)).toBeNull();
});

test('a refused buy shows no hint', async () => {
  vi.useFakeTimers();
  view({ coins: 500, onBuy: () => Promise.resolve(false) });
  await buyCandle();
  expect(screen.queryByText(HINT)).toBeNull();
});

test('the bought hint hides after its time even if a sync arrives meanwhile', async () => {
  vi.useFakeTimers();
  const props = { pantry: {}, coins: 500, ownedDecor: [], onSell: noop, onBuy: () => Promise.resolve(true) };
  const ui = render(<ShopView {...props} />);
  await buyCandle();
  act(() => void vi.advanceTimersByTime(1000));
  ui.rerender(<ShopView {...props} coins={450} ownedDecor={['candle']} />);
  act(() => void vi.advanceTimersByTime(1500));
  expect(screen.queryByText(HINT)).toBeNull();
});

test('reopening the shop after a buy shows no hint', async () => {
  vi.useFakeTimers();
  const onBuy = () => Promise.resolve(true);
  const first = view({ coins: 500, onBuy });
  await buyCandle();
  first.unmount();
  view({ coins: 450, ownedDecor: ['candle'], onBuy });
  expect(screen.queryByText(HINT)).toBeNull();
});

test('a second buy shows the hint again', async () => {
  vi.useFakeTimers();
  view({ coins: 500, onBuy: () => Promise.resolve(true) });
  await buyCandle();
  act(() => void vi.advanceTimersByTime(2500));
  expect(screen.queryByText(HINT)).toBeNull();
  await buyCandle();
  expect(screen.getByText(HINT)).toBeTruthy();
});
