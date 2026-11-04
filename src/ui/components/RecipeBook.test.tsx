import { cleanup, render, screen } from '@testing-library/preact';
import { afterEach, expect, test, vi } from 'vitest';
import en from '../../../public/_locales/en/messages.json';
import { RecipeBook } from './RecipeBook';

type Entry = { message: string; placeholders?: Record<string, { content: string }> };
const MESSAGES = en as Record<string, Entry>;

// Resolve messages from the real en catalog, the way chrome.i18n would ($P1$ -> $1 -> subs[0]).
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

test('shows how many of the 12 recipes are found', () => {
  render(<RecipeBook recipes={['steak']} />);
  expect(screen.getByText('Recipes found 1 / 12')).toBeTruthy();
});

test('a found recipe shows its dish and its ingredients with counts', () => {
  const { container } = render(<RecipeBook recipes={['steak', 'seafoodbowl']} />);
  expect(screen.getByText('Steak')).toBeTruthy();
  expect(screen.getByText('Meat×2 · Veggies×1')).toBeTruthy();
  // ingredients follow the pot order (rice first), not the recipe's key order
  expect(screen.getByText('Rice×1 · Fish×1 · Shrimp×1')).toBeTruthy();
  expect(container.querySelector('img[src="food_steak.png"]')).not.toBeNull();
});

test('a recipe not yet found shows ??? and its hint, not its name', () => {
  render(<RecipeBook recipes={['steak']} />);
  expect(screen.queryByText('Meat is the star…')).toBeNull(); // steak is found: hint gone
  expect(screen.getAllByText('???').length).toBe(11);
  expect(screen.queryByText('Cake')).toBeNull();
  expect(screen.getByText('Lots of fruit…')).toBeTruthy();
});

test('the mystery dish is never listed', () => {
  const { container } = render(<RecipeBook recipes={[]} />);
  expect(container.querySelectorAll('li').length).toBe(12);
  expect(screen.queryByText('Mystery', { exact: false })).toBeNull();
});
