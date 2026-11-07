import { cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { afterEach, expect, test, vi } from 'vitest';
import { DressPicker } from './DressPicker';

vi.mock('@/i18n/t', () => ({ t: (k: string) => k }));
vi.mock('@/ui/assets', () => ({ accUrl: () => null }));

afterEach(cleanup);

test('lists only owned items that belong to the place', () => {
  const onWear = vi.fn();
  render(<DressPicker owned={['ribbon', 'glasses', 'crown']} place="head" worn={{}} onWear={onWear} />);
  expect(screen.getByRole('button', { name: 'acc_ribbon' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'acc_crown' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'acc_glasses' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'acc_crown' }));
  expect(onWear).toHaveBeenCalledWith('crown');
});

test('take off shows only when something is worn there, and the worn item is pressed', () => {
  const onWear = vi.fn();
  const ui = render(<DressPicker owned={['ribbon']} place="head" worn={{}} onWear={onWear} />);
  expect(screen.queryByRole('button', { name: 'dress_remove' })).toBeNull();
  ui.rerender(<DressPicker owned={['ribbon']} place="head" worn={{ head: 'ribbon' }} onWear={onWear} />);
  expect(screen.getByRole('button', { name: 'acc_ribbon' }).getAttribute('aria-pressed')).toBe('true');
  fireEvent.click(screen.getByRole('button', { name: 'dress_remove' }));
  expect(onWear).toHaveBeenCalledWith(null);
});

test('says where to buy when nothing is owned for the place', () => {
  render(<DressPicker owned={['glasses']} place="head" worn={{}} onWear={vi.fn()} />);
  expect(screen.getByText('dress_empty')).toBeTruthy();
});
