import { cleanup, render, screen } from '@testing-library/preact';
import { afterEach, expect, test, vi } from 'vitest';
import type { Memory } from '@/core/types';
import { ZukanView } from './ZukanView';

vi.mock('@/i18n/t', () => ({
  t: (k: string, s?: string | string[]) => (s ? `${k}|${[s].flat().join(',')}` : k),
}));
vi.mock('@/ui/assets', () => ({ spriteUrl: (id: string, pose: string) => `${id}-${pose}.png` }));
afterEach(cleanup);

const mem = (generation: number, finalForm: Memory['finalForm'], ending: Memory['ending']): Memory => ({
  generation, finalForm, path: [], awakeMinutes: 125, ending, endedAt: generation,
});

test('shows discovered name and a silhouette with hint for a child of a discovered parent', () => {
  const { container } = render(
    <ZukanView zukan={{ discovered: ['egg', 'baby_puni', 'child_hoshi'], memories: [] }} />,
  );
  expect(screen.getByText('form_child_hoshi')).toBeTruthy();
  expect(container.querySelectorAll('li').length).toBe(83);
  // young_kirari's parent child_hoshi is discovered -> hint shown, name hidden
  expect(screen.getByText('hint_young_kirari')).toBeTruthy();
  expect(screen.queryByText('form_young_kirari')).toBeNull();
  // adult_dragon's parent (young_hinoko) is not discovered -> no hint
  expect(screen.queryByText('hint_adult_dragon')).toBeNull();
  expect(container.querySelectorAll('img.silhouette').length).toBe(83 - 3);
  expect(screen.getAllByText('zukan_unknown').length).toBe(80);
});

test('shows the discovered count', () => {
  render(<ZukanView zukan={{ discovered: ['egg', 'baby_puni'], memories: [] }} />);
  expect(screen.getByText('zukan_count|2,83')).toBeTruthy();
});

test('lists memories newest first', () => {
  const { container } = render(
    <ZukanView
      zukan={{
        discovered: [],
        memories: [mem(1, 'child_kemu', 'dead'), mem(2, 'adult_bear', 'departed')],
      }}
    />,
  );
  const lines = [...container.querySelectorAll('.memories li')].map((n) => n.textContent);
  expect(lines).toEqual([
    'memory_line|2,form_adult_bear,ending_departed,2',
    'memory_line|1,form_child_kemu,ending_dead,2',
  ]);
});

test('never requests hints for egg or baby', () => {
  render(<ZukanView zukan={{ discovered: [], memories: [] }} />);
  expect(screen.queryByText('hint_egg')).toBeNull();
  expect(screen.queryByText('hint_baby_puni')).toBeNull();
});
