import { act, cleanup, render, screen } from '@testing-library/preact';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { makePet } from './__fixtures__/pet';
import { BASE_FRAME, type EffectFrame } from '@/ui/effects/types';
import { PetStage } from './PetStage';

const urls = vi.hoisted(() => ({ on: false }));

vi.mock('@/i18n/t', () => ({ t: (k: string) => k }));
vi.mock('@/ui/assets', () => ({
  spriteUrl: (_f: string, pose: string, gen: number) =>
    gen === 1 ? `sprite-${pose}.png` : `sprite-${pose}-g${gen}.png`,
  effectUrl: (id: string) => (urls.on ? `fx-${id}.png` : null),
  backgroundUrl: (id: string) => (urls.on ? `bg-${id}.png` : null),
  foodUrl: (food: string, bites: number) => `food-${food}-${bites}.png`,
  iconUrl: (id: string) => `icon-${id}.png`,
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
  render(<PetStage generation={1} room="home" pet={makePet({ asleep: true })} reaction={null} />);
  expect(src()).toBe('sprite-sleep.png');
});

test('pet uses sick pose when sick', () => {
  render(<PetStage generation={1} room="home" pet={makePet({ sick: true })} reaction={null} />);
  expect(src()).toBe('sprite-sick.png');
});

test('pet uses sad pose at danger warning', () => {
  const pet = makePet();
  render(<PetStage generation={1} room="home" pet={{ ...pet, stats: { ...pet.stats, vitality: 10 } }} reaction={null} />);
  expect(src()).toBe('sprite-sad.png');
});

test('reaction pose wins over sleep', () => {
  render(<PetStage generation={1} room="home" pet={makePet({ asleep: true })} reaction="eat" />);
  expect(src()).toBe('sprite-eat.png');
});

test('idle alternates every 500ms', () => {
  vi.useFakeTimers();
  render(<PetStage generation={1} room="home" pet={makePet()} reaction={null} />);
  expect(src()).toBe('sprite-idle0.png');
  act(() => void vi.advanceTimersByTime(500));
  expect(src()).toBe('sprite-idle1.png');
});

test('idle interval is cleared on unmount', () => {
  vi.useFakeTimers();
  const spy = vi.spyOn(globalThis, 'clearInterval');
  const { unmount } = render(<PetStage generation={1} room="home" pet={makePet()} reaction={null} />);
  unmount();
  expect(spy).toHaveBeenCalled();
  expect(vi.getTimerCount()).toBe(0);
});

test('poop placeholders render one per poop', () => {
  const { container } = render(<PetStage generation={1} room="home" pet={makePet({ poops: 3 })} reaction={null} />);
  expect(container.querySelectorAll('.poop--placeholder')).toHaveLength(3);
});

test('poop images render when the effect url exists', () => {
  urls.on = true;
  const { container } = render(<PetStage generation={1} room="home" pet={makePet({ poops: 2 })} reaction={null} />);
  expect(container.querySelectorAll('img.poop')).toHaveLength(2);
  expect(container.querySelector('.poop--placeholder')).toBeNull();
});

test('background follows asleep state', () => {
  urls.on = true;
  const day = render(<PetStage generation={1} room="home" pet={makePet()} reaction={null} />);
  expect(day.container.querySelector('.stage--day')?.getAttribute('style')).toContain('bg-home_day.png');
  cleanup();
  const night = render(<PetStage generation={1} room="home" pet={makePet({ asleep: true })} reaction={null} />);
  expect(night.container.querySelector('.stage--night')?.getAttribute('style')).toContain('bg-home_night.png');
});

test('the stage shows the current room by day and by night', () => {
  urls.on = true;
  const day = render(<PetStage generation={1} room="beach" pet={makePet()} reaction={null} />);
  expect(day.container.querySelector('.stage--day')?.getAttribute('style')).toContain('bg-beach_day.png');
  cleanup();
  const night = render(<PetStage generation={1} room="beach" pet={makePet({ asleep: true })} reaction={null} />);
  expect(night.container.querySelector('.stage--night')?.getAttribute('style')).toContain('bg-beach_night.png');
});

test('gradient classes are used without background art', () => {
  const { container } = render(<PetStage generation={1} room="home" pet={makePet({ asleep: true })} reaction={null} />);
  expect(container.querySelector('.stage--night')?.getAttribute('style')).toBeNull();
});

test('overlay effects: zzz when asleep, sweat when sick', () => {
  urls.on = true;
  const a = render(<PetStage generation={1} room="home" pet={makePet({ asleep: true })} reaction={null} />);
  expect(fx(a.container, 'zzz')).not.toBeNull();
  expect(fx(a.container, 'sweat')).toBeNull();
  cleanup();
  const s = render(<PetStage generation={1} room="home" pet={makePet({ sick: true })} reaction={null} />);
  expect(fx(s.container, 'sweat')).not.toBeNull();
  expect(fx(s.container, 'zzz')).toBeNull();
});

test('overlay effects: sparkle on happy, note only when from play', () => {
  urls.on = true;
  const h = render(<PetStage generation={1} room="home" pet={makePet()} reaction="happy" />);
  expect(fx(h.container, 'sparkle')).not.toBeNull();
  expect(fx(h.container, 'note')).toBeNull();
  cleanup();
  const p = render(<PetStage generation={1} room="home" pet={makePet()} reaction="happy" fromPlay />);
  expect(fx(p.container, 'note')).not.toBeNull();
});

test('effects render nothing when urls are null', () => {
  const { container } = render(<PetStage generation={1} room="home" pet={makePet({ asleep: true })} reaction="happy" fromPlay />);
  expect(container.querySelectorAll('img.effect')).toHaveLength(0);
});

test('the pet button names the action and the form for screen readers', () => {
  render(<PetStage generation={1} room="home" pet={makePet()} reaction={null} />);
  expect(screen.getByRole('button', { name: 'action_pet: form_child_kemu' })).toBeTruthy();
});

test('passes the generation through for the egg pattern', () => {
  render(<PetStage generation={3} room="home" pet={makePet()} reaction={null} />);
  expect(src()).toBe('sprite-idle0-g3.png');
});

const withFrame = (patch: Partial<EffectFrame>): EffectFrame => ({ ...BASE_FRAME, ...patch });
const petImg = () => screen.getByAltText('form_child_kemu') as HTMLImageElement;

test('an effect pose wins over the usual pose', () => {
  render(<PetStage generation={1} room="home" pet={makePet({ sick: true })} reaction={null} effect={withFrame({ pose: 'eat' })} />);
  expect(src()).toBe('sprite-eat.png');
});

test('a sleeping pet keeps sleeping through an effect pose (cleaning or medicine at night)', () => {
  render(<PetStage generation={1} room="home" pet={makePet({ asleep: true, sick: true })} reaction={null} effect={withFrame({ pose: 'happy' })} />);
  expect(src()).toBe('sprite-sleep.png');
});

test('an effect without a pose keeps the usual pose', () => {
  render(<PetStage generation={1} room="home" pet={makePet({ asleep: true })} reaction={null} effect={withFrame({})} />);
  expect(src()).toBe('sprite-sleep.png');
});

test('the pet shakes by petDx', () => {
  render(<PetStage generation={1} room="home" pet={makePet({ asleep: true })} reaction={null} effect={withFrame({ petDx: 4 })} />);
  expect(petImg().style.left).toBe('116px');
  cleanup();
  render(<PetStage generation={1} room="home" pet={makePet()} reaction={null} effect={withFrame({ petDx: 0 })} />);
  expect(petImg().style.left).toBe('');
});

test('effect props are drawn on the stage', () => {
  const props = [{ key: 'food', art: { kind: 'food', food: 'rice', bites: 0 }, x: 208, y: 148, scale: 2 } as const];
  const { container } = render(<PetStage generation={1} room="home" pet={makePet()} reaction={null} effect={withFrame({ props })} />);
  expect(container.querySelector('img.fx-prop--food')?.getAttribute('src')).toBe('food-rice-0.png');
});

test('effect poops replace the saved count and keep gone slots', () => {
  urls.on = true;
  const poops = [{ look: 'poop', dx: -4 }, { look: 'dust1', dx: -8 }, { look: 'gone', dx: 0 }] as const;
  const { container } = render(
    <PetStage generation={1} room="home" pet={makePet({ poops: 0 })} reaction={null} effect={withFrame({ poops })} />,
  );
  const slots = [...container.querySelectorAll('.poops > *')];
  expect(slots).toHaveLength(3);
  expect(slots[0]!.getAttribute('src')).toBe('fx-poop.png');
  expect((slots[0] as HTMLElement).style.transform).toBe('translateX(-4px)');
  expect(slots[1]!.getAttribute('src')).toBe('fx-dust1.png');
  expect(slots[2]!.className).toContain('poop--gone');
});

test('the room darkens to the effect level, and stars come only when fully dark', () => {
  urls.on = true;
  const pet = makePet({ asleep: true, lightsOn: false });
  const half = render(<PetStage generation={1} room="home" pet={pet} reaction={null} effect={withFrame({ dim: 0.5 })} />);
  const dim = half.container.querySelector('.stage__dim') as HTMLElement;
  expect(dim.style.getPropertyValue('--dim')).toBe('0.5');
  expect(half.container.querySelectorAll('.effect--star')).toHaveLength(0);
  expect(half.container.querySelector('.stage--dark')).toBeNull();
  cleanup();
  const full = render(<PetStage generation={1} room="home" pet={pet} reaction={null} effect={withFrame({ dim: 1 })} />);
  expect(full.container.querySelectorAll('.effect--star')).toHaveLength(3);
  expect(full.container.querySelector('.stage--dark')).not.toBeNull();
});

test('a lit room has no darkness and no stars', () => {
  urls.on = true;
  const { container } = render(
    <PetStage generation={1} room="home" pet={makePet({ asleep: true, lightsOn: false })} reaction={null} effect={withFrame({ dim: 0 })} />,
  );
  expect(container.querySelector('.stage__dim')).toBeNull();
  expect(container.querySelectorAll('.effect--star')).toHaveLength(0);
});

test('stars show for a sleeping egg with the lights off and no effect', () => {
  urls.on = true;
  const egg = makePet({ formId: 'egg', stage: 'egg', asleep: true, lightsOn: false });
  const { container } = render(<PetStage generation={1} room="home" pet={egg} reaction={null} />);
  expect(container.querySelectorAll('.effect--star')).toHaveLength(3);
  expect((container.querySelector('.stage__dim') as HTMLElement).style.getPropertyValue('--dim')).toBe('1');
});

test('the flash is drawn', () => {
  const { container } = render(<PetStage generation={1} room="home" pet={makePet()} reaction={null} effect={withFrame({ flash: true })} />);
  expect(container.querySelector('.stage__flash')).not.toBeNull();
});
