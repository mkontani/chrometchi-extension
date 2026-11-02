import { act, cleanup, render, screen } from '@testing-library/preact';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { makePet } from './__fixtures__/pet';
import { PetStage } from './PetStage';

const urls = vi.hoisted(() => ({ on: false }));

vi.mock('@/i18n/t', () => ({ t: (k: string) => k }));
vi.mock('@/ui/assets', () => ({
  spriteUrl: (_f: string, pose: string) => `sprite-${pose}.png`,
  effectUrl: (id: string) => (urls.on ? `fx-${id}.png` : null),
  backgroundUrl: (id: string) => (urls.on ? `bg-${id}.png` : null),
}));

beforeEach(() => {
  urls.on = false;
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const src = () => screen.getByAltText('form_child_kemu').getAttribute('src');
const fx = (c: Element, id: string) => c.querySelector(`img[src="fx-${id}.png"]`);

test('pet uses sleep pose when asleep', () => {
  render(<PetStage pet={makePet({ asleep: true })} reaction={null} />);
  expect(src()).toBe('sprite-sleep.png');
});

test('pet uses sick pose when sick', () => {
  render(<PetStage pet={makePet({ sick: true })} reaction={null} />);
  expect(src()).toBe('sprite-sick.png');
});

test('pet uses sad pose at danger warning', () => {
  const pet = makePet();
  render(<PetStage pet={{ ...pet, stats: { ...pet.stats, vitality: 10 } }} reaction={null} />);
  expect(src()).toBe('sprite-sad.png');
});

test('reaction pose wins over sleep', () => {
  render(<PetStage pet={makePet({ asleep: true })} reaction="eat" />);
  expect(src()).toBe('sprite-eat.png');
});

test('idle alternates every 500ms', () => {
  vi.useFakeTimers();
  render(<PetStage pet={makePet()} reaction={null} />);
  expect(src()).toBe('sprite-idle0.png');
  act(() => void vi.advanceTimersByTime(500));
  expect(src()).toBe('sprite-idle1.png');
});

test('idle interval is cleared on unmount', () => {
  vi.useFakeTimers();
  const spy = vi.spyOn(globalThis, 'clearInterval');
  const { unmount } = render(<PetStage pet={makePet()} reaction={null} />);
  unmount();
  expect(spy).toHaveBeenCalled();
  expect(vi.getTimerCount()).toBe(0);
});

test('poop placeholders render one per poop', () => {
  const { container } = render(<PetStage pet={makePet({ poops: 3 })} reaction={null} />);
  expect(container.querySelectorAll('.poop--placeholder')).toHaveLength(3);
});

test('poop images render when the effect url exists', () => {
  urls.on = true;
  const { container } = render(<PetStage pet={makePet({ poops: 2 })} reaction={null} />);
  expect(container.querySelectorAll('img.poop')).toHaveLength(2);
  expect(container.querySelector('.poop--placeholder')).toBeNull();
});

test('background follows asleep state', () => {
  urls.on = true;
  const day = render(<PetStage pet={makePet()} reaction={null} />);
  expect(day.container.querySelector('.stage--day')?.getAttribute('style')).toContain('bg-room_day.png');
  cleanup();
  const night = render(<PetStage pet={makePet({ asleep: true })} reaction={null} />);
  expect(night.container.querySelector('.stage--night')?.getAttribute('style')).toContain('bg-room_night.png');
});

test('gradient classes are used without background art', () => {
  const { container } = render(<PetStage pet={makePet({ asleep: true })} reaction={null} />);
  expect(container.querySelector('.stage--night')?.getAttribute('style')).toBeNull();
});

test('overlay effects: zzz when asleep, sweat when sick', () => {
  urls.on = true;
  const a = render(<PetStage pet={makePet({ asleep: true })} reaction={null} />);
  expect(fx(a.container, 'zzz')).not.toBeNull();
  expect(fx(a.container, 'sweat')).toBeNull();
  cleanup();
  const s = render(<PetStage pet={makePet({ sick: true })} reaction={null} />);
  expect(fx(s.container, 'sweat')).not.toBeNull();
  expect(fx(s.container, 'zzz')).toBeNull();
});

test('overlay effects: sparkle on happy, note only when from play', () => {
  urls.on = true;
  const h = render(<PetStage pet={makePet()} reaction="happy" />);
  expect(fx(h.container, 'sparkle')).not.toBeNull();
  expect(fx(h.container, 'note')).toBeNull();
  cleanup();
  const p = render(<PetStage pet={makePet()} reaction="happy" fromPlay />);
  expect(fx(p.container, 'note')).not.toBeNull();
});

test('effects render nothing when urls are null', () => {
  const { container } = render(<PetStage pet={makePet({ asleep: true })} reaction="happy" fromPlay />);
  expect(container.querySelectorAll('img.effect')).toHaveLength(0);
});
