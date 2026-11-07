import { cleanup, fireEvent, render, screen, within } from '@testing-library/preact';
import { afterEach, expect, test, vi } from 'vitest';
import en from '../../../public/_locales/en/messages.json';
import { DECOR } from '@/data/decor';
import { DecorShop } from './DecorShop';

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
vi.mock('@/ui/assets', () => ({
  iconUrl: (id: string) => `${id}.png`,
  decorUrl: (id: string) => `decor-${id}.png`,
}));
afterEach(cleanup);

const rows = () => screen.getAllByRole('listitem');

test('lists the 28 items with price or owned', () => {
  render(<DecorShop owned={['lamp']} coins={1000} onBuy={() => undefined} />);
  expect(rows()).toHaveLength(28);
  expect(rows().map((r) => r.querySelector('img')?.getAttribute('src'))).toEqual(
    DECOR.map((d) => `decor-${d.id}.png`),
  );
  const lamp = rows()[DECOR.findIndex((d) => d.id === 'lamp')] as HTMLElement;
  expect(within(lamp).getByText('Lamp')).toBeTruthy();
  expect(within(lamp).getByText('Owned')).toBeTruthy();
  expect(within(lamp).queryByRole('button')).toBeNull();
  const candle = rows()[0] as HTMLElement;
  expect(within(candle).getByText('Candle')).toBeTruthy();
  expect(within(candle).getByRole('img', { name: 'Coins: 50' })).toBeTruthy();
  expect(within(candle).getByRole('button', { name: 'Buy Candle' }).textContent).toBe('Buy');
});

test('buy is disabled when coins are short', () => {
  render(<DecorShop owned={[]} coins={99} onBuy={() => undefined} />);
  const disabled = (name: string) => (screen.getByRole('button', { name }) as HTMLButtonElement).disabled;
  expect(disabled('Buy Lamp')).toBe(true);
  expect(disabled('Buy Candle')).toBe(false);
});

test('buying asks first and sends buyDecor only on confirm', () => {
  const onBuy = vi.fn();
  render(<DecorShop owned={[]} coins={1000} onBuy={onBuy} />);
  fireEvent.click(screen.getByRole('button', { name: 'Buy Lamp' }));
  expect(screen.getByText('Buy Lamp for 100 coins?')).toBeTruthy();
  expect(onBuy).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.queryByRole('alertdialog')).toBeNull();
  expect(onBuy).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Buy Lamp' }));
  fireEvent.click(screen.getByRole('button', { name: 'Buy' }));
  expect(onBuy).toHaveBeenCalledWith('lamp');
  expect(screen.queryByRole('alertdialog')).toBeNull();
});
