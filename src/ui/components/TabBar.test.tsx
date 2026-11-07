import { cleanup, render, screen } from '@testing-library/preact';
import { afterEach, expect, test } from 'vitest';
import { TabBar } from './TabBar';

afterEach(cleanup);
const tabs = [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }] as const;

test('the tab strip has a label', () => {
  render(<TabBar tabs={tabs} active="a" onTab={() => undefined} label="Shop" />);
  expect(screen.getByRole('tablist', { name: 'Shop' })).toBeTruthy();
});

test('the tab strip has no label unless given one', () => {
  render(<TabBar tabs={tabs} active="a" onTab={() => undefined} />);
  expect(screen.getByRole('tablist').getAttribute('aria-label')).toBeNull();
});
