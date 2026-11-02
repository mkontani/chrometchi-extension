import { cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { afterEach, expect, test, vi } from 'vitest';
import { ActionBar } from './ActionBar';
import { makePet } from './fixtures';

vi.mock('@/i18n/t', () => ({ t: (k: string) => k }));

const isDisabled = (key: string) =>
  (screen.getByLabelText(key) as HTMLButtonElement).disabled;

test('action bar disables clean without poop and medicine when healthy', () => {
  render(<ActionBar pet={makePet()} onSelect={() => {}} />);
  expect(isDisabled('action_clean')).toBe(true);
  expect(isDisabled('action_medicine')).toBe(true);
  expect(isDisabled('action_feed')).toBe(false);
  expect(isDisabled('action_lights')).toBe(false);
});

test('action bar enables clean with poop and medicine when sick', () => {
  render(<ActionBar pet={makePet({ poops: 1, sick: true })} onSelect={() => {}} />);
  expect(isDisabled('action_clean')).toBe(false);
  expect(isDisabled('action_medicine')).toBe(false);
});

test('action bar disables feed and play for an egg', () => {
  render(<ActionBar pet={makePet({ stage: 'egg' })} onSelect={() => {}} />);
  expect(isDisabled('action_feed')).toBe(true);
  expect(isDisabled('action_play')).toBe(true);
});

test('feed and play are disabled while asleep', () => {
  render(<ActionBar pet={makePet({ asleep: true })} onSelect={() => {}} />);
  expect(isDisabled('action_feed')).toBe(true);
  expect(isDisabled('action_play')).toBe(true);
});

test('clicking calls onSelect with the kind', () => {
  const onSelect = vi.fn();
  render(<ActionBar pet={makePet()} onSelect={onSelect} />);
  fireEvent.click(screen.getByLabelText('action_zukan'));
  expect(onSelect).toHaveBeenCalledWith('zukan');
});

afterEach(cleanup);
