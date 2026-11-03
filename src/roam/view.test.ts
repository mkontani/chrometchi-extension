import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { makePet, type PetOverrides } from '@/core/__fixtures__/pet';
import { createRng } from '@/core/rng';
import type { RoamDisplay } from './display';
import type { RoamFrames } from './frames';
import { bubbleLeft, HOST_TAG, mountRoam, type RoamView } from './view';

const FRAMES: RoamFrames = {
  walk: Array.from({ length: 8 }, (_, i) => `data:walk${i}`),
  rest: ['data:idle0', 'data:idle1'],
  sleep: 'data:sleep',
  happy: 'data:happy',
};
const pet = (motion: 'walk' | 'still' = 'walk', over: PetOverrides = {}, pose: 'idle' | 'sleep' = 'idle'): RoamDisplay => ({
  kind: 'pet', pet: makePet(over), generation: 1, motion, pose,
});

let frameCbs: FrameRequestCallback[] = [];
let clock = 0;
const raf = vi.fn((cb: FrameRequestCallback) => frameCbs.push(cb));
const cancelRaf = vi.fn();
/** Runs `n` animation frames `ms` apart. */
function frames(n: number, ms = 16) {
  for (let i = 0; i < n; i++) {
    clock += ms;
    const cbs = frameCbs;
    frameCbs = [];
    cbs.forEach((cb) => cb(clock));
  }
}

let views: RoamView[] = [];
function mount(onHide = vi.fn()) {
  const view = mountRoam(document, { t: (k) => `t:${k}`, onHide, rng: createRng(1), raf, cancelRaf });
  views.push(view);
  return view;
}
const host = () => document.querySelector(HOST_TAG) as HTMLElement | null;
const $ = (sel: string) => host()?.shadowRoot?.querySelector(sel) as HTMLElement | null;
const img = () => $('.pet img') as HTMLImageElement;
const moverX = () => Number(/translateX\((-?[\d.]+)px\)/.exec($('.mover')?.style.transform ?? '')?.[1]);

beforeEach(() => {
  frameCbs = [];
  clock = 0;
  window.innerWidth = 1000;
});
afterEach(() => {
  views.forEach((v) => v.destroy());
  views = [];
});

describe('roaming view', () => {
  test('nothing renders until frames arrive', () => {
    mount().render(pet(), null);
    expect(host()).toBeNull();
  });

  test('mounts one host even when mounted twice', () => {
    const first = mount();
    first.render(pet(), FRAMES);
    mount().render(pet(), FRAMES);
    first.render(pet(), FRAMES);
    expect(document.querySelectorAll(HOST_TAG)).toHaveLength(1);
  });

  test('the host lets clicks through; only the pet and bubble take pointer events', () => {
    mount().render(pet(), FRAMES);
    expect(host()?.style.getPropertyValue('pointer-events')).toBe('none');
    expect(host()?.style.getPropertyValue('z-index')).toBe('2147483647');
    const css = host()?.shadowRoot?.querySelector('style')?.textContent ?? '';
    expect(css).toMatch(/\.pet\s*\{[^}]*pointer-events:\s*auto/);
    expect(css).toMatch(/\.bubble\s*\{[^}]*pointer-events:\s*auto/);
  });

  test('clicking the pet opens the bubble with the status line; hide calls onHide', () => {
    const onHide = vi.fn();
    mount(onHide).render(pet('walk', { stats: { hunger: 10 } }), FRAMES);
    $('.pet')?.click();
    expect($('.bubble')?.hidden).toBe(false);
    expect($('.say')?.textContent).toBe('t:roam_say_hungry');
    expect($('.hide')?.textContent).toBe('t:roam_hide_here');
    frames(1);
    expect(img().src).toBe('data:happy');
    $('.hide')?.click();
    expect(onHide).toHaveBeenCalledTimes(1);
  });

  test('a second click or Escape closes the bubble', () => {
    mount().render(pet(), FRAMES);
    $('.pet')?.click();
    $('.pet')?.click();
    expect($('.bubble')?.hidden).toBe(true);
    $('.pet')?.click();
    host()?.shadowRoot?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect($('.bubble')?.hidden).toBe(true);
  });

  test('dragging moves the pet and does not open the bubble', () => {
    mount().render(pet('still'), FRAMES);
    frames(1);
    const start = moverX();
    const button = $('.pet') as HTMLElement;
    button.dispatchEvent(new PointerEvent('pointerdown', { clientX: 500, pointerId: 1, bubbles: true }));
    button.dispatchEvent(new PointerEvent('pointermove', { clientX: 400, pointerId: 1, bubbles: true }));
    button.dispatchEvent(new PointerEvent('pointerup', { clientX: 400, pointerId: 1, bubbles: true }));
    button.click();
    frames(1);
    expect(moverX()).toBe(Math.max(0, start - 100));
    expect($('.bubble')?.hidden).toBe(true);
  });

  test('still pets do not move across frames', () => {
    mount().render(pet('still'), FRAMES);
    frames(1);
    const x = moverX();
    frames(200, 50);
    expect(moverX()).toBe(x);
    expect(FRAMES.rest).toContain(img().src);
  });

  test('a sleeping pet shows its sleep frame', () => {
    mount().render(pet('still', { asleep: true }, 'sleep'), FRAMES);
    frames(3);
    expect(img().src).toBe('data:sleep');
  });

  test('a walking pet plays the walk cycle and is mirrored only when walking left', () => {
    mount().render(pet(), FRAMES);
    const seen = new Set<string>();
    let mirrored = false;
    for (let i = 0; i < 600; i++) {
      frames(1, 50);
      seen.add(img().src);
      if (img().style.transform.includes('scaleX(-1)')) {
        mirrored = true;
        expect(FRAMES.walk).toContain(img().src);
      }
    }
    expect(FRAMES.walk.every((f) => seen.has(f))).toBe(true);
    expect(mirrored).toBe(true);
  });

  test('hidden removes the host; destroy stops the loop', () => {
    const view = mount();
    view.render(pet(), FRAMES);
    view.render({ kind: 'hidden' }, FRAMES);
    expect(host()).toBeNull();
    view.render(pet(), FRAMES);
    view.destroy();
    expect(host()).toBeNull();
    expect(cancelRaf).toHaveBeenCalled();
  });
});

describe('bubbleLeft', () => {
  test('centres the bubble over the pet but keeps it on screen', () => {
    expect(bubbleLeft(500, 1000, 200)).toBe(-68);
    expect(bubbleLeft(0, 1000, 200)).toBe(0);
    expect(bubbleLeft(936, 1000, 200)).toBe(1000 - 936 - 200);
  });
});
