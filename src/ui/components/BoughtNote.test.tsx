import { act, cleanup, render, screen } from '@testing-library/preact';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import type { CareOutcome } from '@/core/types';
import { BoughtNote } from './BoughtNote';

vi.mock('@/i18n/t', () => ({ t: (k: string) => k }));

const bought = (): CareOutcome => ({ action: 'buy', result: 'ok' });

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

test('shows the hint after a buy, then hides it', () => {
  const { rerender } = render(<BoughtNote outcome={null} />);
  rerender(<BoughtNote outcome={bought()} />);
  expect(screen.getByText('shop_bought')).toBeTruthy();
  act(() => void vi.advanceTimersByTime(2500));
  expect(screen.queryByText('shop_bought')).toBeNull();
});

test('a refused buy shows no hint', () => {
  const { rerender } = render(<BoughtNote outcome={null} />);
  rerender(<BoughtNote outcome={{ action: 'buy', result: 'refused', reason: 'owned' }} />);
  expect(screen.queryByText('shop_bought')).toBeNull();
});

test('reopening the shop with an old buy outcome shows no hint', () => {
  render(<BoughtNote outcome={bought()} />);
  expect(screen.queryByText('shop_bought')).toBeNull();
});
