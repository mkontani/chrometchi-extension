import { cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { afterEach, expect, test, vi } from 'vitest';
import { makePet } from './__fixtures__/pet';
import { EndingView } from './EndingView';

vi.mock('@/i18n/t', () => ({
  t: (k: string, s?: string | string[]) => (s ? `${k}|${[s].flat().join(',')}` : k),
}));
vi.mock('@/ui/assets', () => ({
  spriteUrl: (id: string, pose: string) => `${id}-${pose}.png`,
  effectUrl: () => null,
}));
afterEach(cleanup);

const base = { awakeMinutes: 190, path: ['egg', 'baby_puni', 'child_kemu'] as never };

test('dead shows the grave, summary and starts a new egg', () => {
  const onNewEgg = vi.fn();
  const { container } = render(<EndingView pet={makePet({ ...base, lifecycle: 'dead' })} onNewEgg={onNewEgg} />);
  expect(screen.getByText('ending_dead_title')).toBeTruthy();
  expect(container.querySelector('.grave')).not.toBeNull();
  expect(screen.getByText('ending_summary|3,form_egg → form_baby_puni → form_child_kemu')).toBeTruthy();
  fireEvent.click(screen.getByText('new_egg'));
  expect(onNewEgg).toHaveBeenCalledTimes(1);
});

test('departed shows the happy sprite and farewell', () => {
  const { container } = render(<EndingView pet={makePet({ ...base, lifecycle: 'departed' })} onNewEgg={vi.fn()} />);
  expect(screen.getByText('ending_departed_title')).toBeTruthy();
  expect(container.querySelector('img')?.getAttribute('src')).toBe('child_kemu-happy.png');
});
