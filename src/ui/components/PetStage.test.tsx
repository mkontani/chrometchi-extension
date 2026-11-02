import { act, cleanup, render, screen } from '@testing-library/preact';
import { afterEach, expect, test, vi } from 'vitest';
import { makePet } from './fixtures';
import { PetStage } from './PetStage';

vi.mock('@/i18n/t', () => ({ t: (k: string) => k }));
vi.mock('@/ui/assets', () => ({
  spriteUrl: (_f: string, pose: string) => `sprite-${pose}.png`,
  effectUrl: () => null,
  backgroundUrl: () => null,
}));

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

test('pet uses sleep pose when asleep', () => {
  render(<PetStage pet={makePet({ asleep: true })} reaction={null} />);
  expect(screen.getByAltText('form_child_kemu').getAttribute('src')).toBe('sprite-sleep.png');
});

test('reaction pose wins over sleep', () => {
  render(<PetStage pet={makePet({ asleep: true })} reaction="eat" />);
  expect(screen.getByAltText('form_child_kemu').getAttribute('src')).toBe('sprite-eat.png');
});

test('idle alternates every 500ms', () => {
  vi.useFakeTimers();
  render(<PetStage pet={makePet()} reaction={null} />);
  const img = screen.getByAltText('form_child_kemu');
  expect(img.getAttribute('src')).toBe('sprite-idle0.png');
  act(() => void vi.advanceTimersByTime(500));
  expect(img.getAttribute('src')).toBe('sprite-idle1.png');
});

test('poop placeholders render one per poop', () => {
  const { container } = render(<PetStage pet={makePet({ poops: 3 })} reaction={null} />);
  expect(container.querySelectorAll('.poop--placeholder')).toHaveLength(3);
});

