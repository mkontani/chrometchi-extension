import { act, cleanup, render, screen } from '@testing-library/preact';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { makePet } from './__fixtures__/pet';
import { BASE_FRAME, type EffectFrame } from '@/ui/effects/types';
import { FORM_ANCHORS } from '@/data/anchors';
import { accessoryDef } from '@/data/accessories';
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
  decorUrl: (id: string) => `decor-${id}.png`,
  accUrl: (id: string) => `acc-${id}.png`,
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
  render(<PetStage generation={1} room="home" pet={makePet()} reaction={null} onPetClick={vi.fn()} />);
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
  expect((petImg().parentElement as HTMLElement).style.left).toBe('116px');
  cleanup();
  render(<PetStage generation={1} room="home" pet={makePet()} reaction={null} effect={withFrame({ petDx: 0 })} />);
  expect((petImg().parentElement as HTMLElement).style.left).toBe('');
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

test('the pet is not a button when it cannot be petted', () => {
  const { rerender } = render(<PetStage generation={1} room="home" pet={makePet()} reaction={null} />);
  const img = screen.getByAltText('form_child_kemu');
  expect(img.getAttribute('role')).toBeNull();
  expect(img.getAttribute('tabindex')).toBeNull();
  expect(img.getAttribute('aria-label')).toBeNull();
  rerender(<PetStage generation={1} room="home" pet={makePet()} reaction={null} onPetClick={vi.fn()} />);
  expect(screen.getByRole('button', { name: 'action_pet: form_child_kemu' }).getAttribute('tabindex')).toBe('0');
});

const PLACED = [
  { slot: 'wallL', decor: 'clock' },
  { slot: 'floorR', decor: 'plant' },
] as const;
const item = (c: Element, id: string) => c.querySelector(`img.decor[src="decor-${id}.png"]`) as HTMLImageElement;

test('placed items are drawn in their slots at 2x', () => {
  const { container } = render(<PetStage generation={1} room="home" pet={makePet()} reaction={null} decor={PLACED} />);
  // clock: 24 px art -> 48 px, centred in wallL {48,48,56,56}
  const clock = item(container, 'clock');
  expect([clock.style.left, clock.style.top, clock.style.width, clock.style.height]).toEqual(['52px', '52px', '48px', '48px']);
  expect(clock.getAttribute('alt')).toBe('');
  // plant: 32 px art -> 64 px, bottom-centred in floorR {268,156,72,76}
  const plant = item(container, 'plant');
  expect([plant.style.left, plant.style.top, plant.style.width, plant.style.height]).toEqual(['272px', '168px', '64px', '64px']);
});

test('ceiling items are top-centred and rug items centred', () => {
  const decor = [
    { slot: 'ceiling', decor: 'lantern' },
    { slot: 'rug', decor: 'rug' },
  ] as const;
  const { container } = render(<PetStage generation={1} room="home" pet={makePet()} reaction={null} decor={decor} />);
  const lamp = item(container, 'lantern');
  const rug = item(container, 'rug');
  const w = (el: HTMLImageElement) => Number.parseInt(el.style.width, 10);
  expect(lamp.style.top).toBe('0px');
  expect(Number.parseInt(lamp.style.left, 10)).toBe(112 + (128 - w(lamp)) / 2);
  expect(Number.parseInt(rug.style.left, 10)).toBe(128 + (96 - w(rug)) / 2);
  expect(Number.parseInt(rug.style.top, 10)).toBe(204 + (48 - w(rug)) / 2);
});

test('wall, ceiling and rug items sit behind the pet and floor items in front', () => {
  const decor = [...PLACED, { slot: 'rug', decor: 'rug' }] as const;
  const { container } = render(<PetStage generation={1} room="home" pet={makePet()} reaction={null} decor={decor} />);
  const order = [...container.querySelectorAll('img')];
  const at = (el: Element) => order.indexOf(el as HTMLImageElement);
  const pet = at(petImg());
  expect(at(item(container, 'clock'))).toBeLessThan(at(item(container, 'rug')));
  expect(at(item(container, 'rug'))).toBeLessThan(pet);
  expect(at(item(container, 'plant'))).toBeGreaterThan(pet);
});

test('placed items are dimmed while the pet sleeps', () => {
  const day = render(<PetStage generation={1} room="home" pet={makePet()} reaction={null} decor={PLACED} />);
  expect(day.container.querySelectorAll('.decor--night')).toHaveLength(0);
  cleanup();
  const night = render(<PetStage generation={1} room="home" pet={makePet({ asleep: true })} reaction={null} decor={PLACED} />);
  expect(night.container.querySelectorAll('img.decor.decor--night')).toHaveLength(2);
});

test('the lights-off darkness covers placed items', () => {
  const pet = makePet({ asleep: true, lightsOn: false });
  const { container } = render(
    <PetStage generation={1} room="home" pet={pet} reaction={null} decor={PLACED} effect={withFrame({ dim: 1 })} />,
  );
  const all = [...container.querySelectorAll('*')];
  const dim = container.querySelector('.stage__dim') as Element;
  const lastItem = Math.max(...[...container.querySelectorAll('img.decor')].map((el) => all.indexOf(el)));
  expect(container.querySelectorAll('img.decor')).toHaveLength(2);
  expect(all.indexOf(dim)).toBeGreaterThan(lastItem);
});

test('no items are drawn by default', () => {
  const { container } = render(<PetStage generation={1} room="home" pet={makePet()} reaction={null} />);
  expect(container.querySelectorAll('img.decor')).toHaveLength(0);
});

const wornImg = (c: Element, id: string) => c.querySelector(`img[src="acc-${id}.png"]`) as HTMLImageElement;

test('the stage draws worn items at the current form points', () => {
  const worn = { head: 'crown', face: 'glasses', neck: 'scarf' } as const;
  const items = [['crown', 'head'], ['glasses', 'face'], ['scarf', 'neck']] as const;
  const stage = (stageName: 'child' | 'adult', formId: string) => (
    <PetStage generation={1} room="home" pet={makePet({ stage: stageName, formId })} reaction={null} worn={worn} />
  );
  const { container, rerender } = render(stage('adult', 'adult_phoenix'));
  const boxes = () =>
    items.map(([id]) => {
      const img = wornImg(container, id);
      expect(img.getAttribute('alt')).toBe('');
      // The built extension inlines small art as data URLs, so the item is named here too.
      expect(img.dataset.acc).toBe(id);
      return [img.style.left, img.style.top, img.style.width, img.style.height];
    });
  const expected = (formId: string) =>
    items.map(([id, place]) => {
      const [x, y] = FORM_ANCHORS[formId]![place];
      const def = accessoryDef(id);
      return [`${4 * (x - def.anchor.x)}px`, `${4 * (y - def.anchor.y)}px`, `${4 * def.size}px`, `${4 * def.size}px`];
    });
  expect(boxes()).toEqual(expected('adult_phoenix'));
  const phoenix = boxes();
  rerender(stage('child', 'child_kemu'));
  expect(boxes()).toEqual(expected('child_kemu'));
  // adult_phoenix faces left, so each of its points sits elsewhere than child_kemu's.
  boxes().forEach(([left, top], i) => expect([left, top]).not.toEqual(phoenix[i]!.slice(0, 2)));
});

test('worn items move with the pet slide and bounce', () => {
  const { container } = render(
    <PetStage generation={1} room="home" pet={makePet()} reaction={null} worn={{ head: 'crown' }} effect={withFrame({ petDx: 4 })} />,
  );
  const wrapper = wornImg(container, 'crown').parentElement as HTMLElement;
  expect(wrapper).toBe(petImg().parentElement);
  expect(wrapper.classList.contains('pet--bounce')).toBe(true);
  expect(wrapper.style.left).toBe('116px');
  expect(petImg().classList.contains('pet--bounce')).toBe(false);
});

test('worn items sink with the face in idle1', () => {
  vi.useFakeTimers();
  // adult_kraken's idle1 drops art row 16: its head and face points are above it, its neck point below.
  const pts = FORM_ANCHORS.adult_kraken!;
  expect(pts.face[1]).toBeLessThan(pts.squashRow);
  expect(pts.neck[1]).toBeGreaterThan(pts.squashRow);
  const kraken = makePet({ stage: 'adult', formId: 'adult_kraken' });
  const worn = { head: 'tophat', face: 'glasses', neck: 'bowtie' } as const;
  const { container, rerender } = render(<PetStage generation={1} room="home" pet={kraken} reaction={null} worn={worn} />);
  const tops = () => (['tophat', 'glasses', 'bowtie'] as const).map((id) => Number.parseInt(wornImg(container, id).style.top, 10));
  const [hat0, glasses0, tie0] = tops();
  act(() => void vi.advanceTimersByTime(500));
  expect(screen.getByAltText('form_adult_kraken').getAttribute('src')).toBe('sprite-idle1.png');
  expect(tops()).toEqual([hat0! + 4, glasses0! + 4, tie0]);
  // Every other pose is its own still picture and keeps the idle0 points.
  rerender(<PetStage generation={1} room="home" pet={kraken} reaction="happy" worn={worn} />);
  expect(tops()).toEqual([hat0, glasses0, tie0]);
});

test('layer order is pet, neck, face, head', () => {
  const { container } = render(
    <PetStage generation={1} room="home" pet={makePet()} reaction={null} worn={{ head: 'crown', face: 'glasses', neck: 'scarf' }} />,
  );
  const srcs = Array.from((petImg().parentElement as HTMLElement).querySelectorAll('img')).map((i) => i.getAttribute('src'));
  expect(srcs).toEqual(['sprite-idle0.png', 'acc-scarf.png', 'acc-glasses.png', 'acc-crown.png']);
  // .pet__worn lets clicks through to the pet (style.css; the e2e tests check it in the built popup).
  expect(wornImg(container, 'crown').classList.contains('pet__worn')).toBe(true);
});

test('the egg wears nothing', () => {
  const { container } = render(
    <PetStage generation={1} room="home" pet={makePet({ formId: 'egg' })} reaction={null} worn={{ head: 'crown' }} />,
  );
  expect(wornImg(container, 'crown')).toBeNull();
});
