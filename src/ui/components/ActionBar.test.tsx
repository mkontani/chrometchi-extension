import { cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { afterEach, expect, test, vi } from 'vitest';
import { ActionBar } from './ActionBar';
import { makePet } from './__fixtures__/pet';

vi.mock('@/i18n/t', () => ({ t: (k: string) => k }));

const isDisabled = (key: string) =>
  (screen.getByLabelText(key) as HTMLButtonElement).disabled;

test('action bar disables clean without poop and medicine when healthy', () => {
  render(<ActionBar pet={makePet()} badge={false} onSelect={() => {}} />);
  expect(isDisabled('action_clean')).toBe(true);
  expect(isDisabled('action_medicine')).toBe(true);
  expect(isDisabled('action_feed')).toBe(false);
  expect(isDisabled('action_lights')).toBe(false);
});

test('action bar enables clean with poop and medicine when sick', () => {
  render(<ActionBar pet={makePet({ poops: 1, sick: true })} badge={false} onSelect={() => {}} />);
  expect(isDisabled('action_clean')).toBe(false);
  expect(isDisabled('action_medicine')).toBe(false);
});

test('action bar disables feed and play for an egg', () => {
  render(<ActionBar pet={makePet({ stage: 'egg' })} badge={false} onSelect={() => {}} />);
  expect(isDisabled('action_feed')).toBe(true);
  expect(isDisabled('action_play')).toBe(true);
});

test('feed and play are disabled while asleep', () => {
  render(<ActionBar pet={makePet({ asleep: true })} badge={false} onSelect={() => {}} />);
  expect(isDisabled('action_feed')).toBe(true);
  expect(isDisabled('action_play')).toBe(true);
});

test('zukan and settings are always enabled', () => {
  render(<ActionBar pet={makePet({ stage: 'egg', asleep: true })} badge={false} onSelect={() => {}} />);
  expect(isDisabled('action_zukan')).toBe(false);
  expect(isDisabled('action_settings')).toBe(false);
});

test('clicking calls onSelect with the kind', () => {
  const onSelect = vi.fn();
  render(<ActionBar pet={makePet()} badge={false} onSelect={onSelect} />);
  fireEvent.click(screen.getByLabelText('action_zukan'));
  expect(onSelect).toHaveBeenCalledWith('zukan');
});

afterEach(cleanup);

test('the action bar has 5 columns and the decorate button takes the fifth slot', () => {
  const { container } = render(<ActionBar pet={makePet()} badge={false} onSelect={() => {}} />);
  const labels = screen.getAllByRole('button').map((b) => b.getAttribute('aria-label'));
  expect(labels).toEqual([
    'action_feed', 'action_play', 'action_outing', 'action_clean', 'action_decorate',
    'action_medicine', 'action_lights', 'action_zukan', 'action_shop', 'action_settings',
  ]);
  const nav = container.querySelector('.action-bar') as HTMLElement;
  expect(nav.children).toHaveLength(10);
  expect(nav.children[4]?.getAttribute('aria-label')).toBe('action_decorate');
});

test('the decorate button is disabled while asleep or an egg', () => {
  render(<ActionBar pet={makePet()} badge={false} onSelect={() => {}} />);
  expect(isDisabled('action_decorate')).toBe(false);
  cleanup();
  render(<ActionBar pet={makePet({ asleep: true })} badge={false} onSelect={() => {}} />);
  expect(isDisabled('action_decorate')).toBe(true);
  cleanup();
  render(<ActionBar pet={makePet({ stage: 'egg' })} badge={false} onSelect={() => {}} />);
  expect(isDisabled('action_decorate')).toBe(true);
});

test('the shop button is never disabled', () => {
  render(<ActionBar pet={makePet({ asleep: true })} badge={false} onSelect={() => {}} />);
  expect(isDisabled('action_shop')).toBe(false);
  cleanup();
  render(<ActionBar pet={makePet({ stage: 'egg' })} badge={false} onSelect={() => {}} />);
  expect(isDisabled('action_shop')).toBe(false);
});

test('the zukan button shows a dot when there are new rewards', () => {
  const { container } = render(<ActionBar pet={makePet()} badge={true} onSelect={() => {}} />);
  expect(container.querySelectorAll('.icon-button__dot')).toHaveLength(1);
  expect(screen.getByLabelText('action_zukan new_rewards')).toBeTruthy();
  cleanup();
  const off = render(<ActionBar pet={makePet()} badge={false} onSelect={() => {}} />);
  expect(off.container.querySelector('.icon-button__dot')).toBeNull();
  expect(screen.queryByLabelText('action_zukan new_rewards')).toBeNull();
});

test('outing is disabled for an egg and while asleep', () => {
  render(<ActionBar pet={makePet({ stage: 'egg' })} badge={false} onSelect={() => {}} />);
  expect(isDisabled('action_outing')).toBe(true);
  cleanup();
  render(<ActionBar pet={makePet({ asleep: true })} badge={false} onSelect={() => {}} />);
  expect(isDisabled('action_outing')).toBe(true);
  cleanup();
  render(<ActionBar pet={makePet()} badge={false} onSelect={() => {}} />);
  expect(isDisabled('action_outing')).toBe(false);
});
