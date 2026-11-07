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

const FAMILIES = ['solar', 'water', 'earth', 'wind', 'metal', 'lunar', 'ether', 'heavy'];

test('the zukan shows the early section and the 8 families in order', () => {
  const { container } = render(<ZukanView zukan={{ discovered: [], memories: [] }} />);
  const heads = [...container.querySelectorAll('.zukan__section > h3')].map((n) => n.textContent);
  expect(heads).toEqual(['zukan_section_early', ...FAMILIES.map((f) => `family_${f}`)]);
});

test('each family shows its 2 young and 7 adults in the spec order', () => {
  const { container } = render(
    <ZukanView zukan={{ discovered: ['adult_dragon', 'young_hinoko'], memories: [] }} />,
  );
  const sections = [...container.querySelectorAll('.zukan__section')];
  expect(sections.length).toBe(9);
  expect(sections[0]?.querySelectorAll('li').length).toBe(11);
  for (const section of sections.slice(1)) {
    const rows = section.querySelectorAll('ul.zukan__row');
    expect(rows[0]?.querySelectorAll('li').length).toBe(2);
    expect(rows[1]?.querySelectorAll('li').length).toBe(7);
  }
  const solar = sections[1]?.querySelectorAll('ul.zukan__row')[1];
  const imgs = [...(solar?.querySelectorAll('img') ?? [])].map((n) => n.getAttribute('src'));
  expect(imgs).toEqual([
    'adult_dragon-idle0.png', 'adult_beast-idle0.png', 'adult_salamander-idle0.png',
    'adult_hedgehog-idle0.png', 'adult_ferret-idle0.png', 'adult_rooster-idle0.png', 'adult_phoenix-idle0.png',
  ]);
});

test('the count is found / 83', () => {
  render(<ZukanView zukan={{ discovered: ['egg', 'adult_dragon', 'adult_bear'], memories: [] }} />);
  expect(screen.getByText('zukan_count|3,83')).toBeTruthy();
});
