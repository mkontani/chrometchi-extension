import { cleanup, render, screen } from '@testing-library/preact';
import { afterEach, expect, test, vi } from 'vitest';
import { makePet } from './__fixtures__/pet';
import { StatusBar } from './StatusBar';

vi.mock('@/i18n/t', () => ({ t: (k: string) => k }));

test('status bar renders 4 hearts per need with half hearts', () => {
  const pet = makePet();
  const base = pet.stats;
  const { container } = render(
    <StatusBar pet={{ ...pet, stats: { ...base, hunger: 60, mood: 100, vitality: 0, weight: 12.4 } }} />,
  );
  const hunger = screen.getByLabelText('stat_hunger');
  expect(hunger.querySelectorAll('.heart--full')).toHaveLength(2);
  expect(hunger.querySelectorAll('.heart--half')).toHaveLength(1);
  expect(hunger.querySelectorAll('.heart--empty')).toHaveLength(1);
  expect(screen.getByLabelText('stat_mood').querySelectorAll('.heart--full')).toHaveLength(4);
  expect(screen.getByLabelText('stat_vitality').querySelectorAll('.heart--empty')).toHaveLength(4);
  expect(container.textContent).toContain('12g');
});

afterEach(cleanup);
