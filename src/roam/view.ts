import type { Rng } from '@/core/types';
import { bubbleKey } from './bubble';
import { PET_PX } from './constants';
import type { RoamDisplay } from './display';
import type { RoamFrames } from './frames';
import { bounceOffset, GAIT_STYLES, gaitOf, type Gait, type GaitStyle } from './gait';
import { ROAM_STYLES } from './styles';
import { createWalker, dragWalker, frameIndex, restWalker, stepWalker, type Walker } from './walker';

export const HOST_TAG = 'chrometchi-roam';
const DRAG_PX = 4;
const HAPPY_MS = 1000;
const BUBBLE_W = 200;
/** The host covers no page area that takes input: it is a zero-height strip at the bottom. */
const HOST_STYLE: Record<string, string> = {
  position: 'fixed', left: '0', right: '0', bottom: '0', height: '0', margin: '0', padding: '0',
  border: '0', display: 'block', 'z-index': '2147483647', 'pointer-events': 'none',
};

export interface RoamViewDeps {
  t(key: string): string;
  onHide(): void;
  rng: Rng;
  /** Only real user input moves the pet or hides it, never page scripts (the shadow root is open). */
  trusted?: (e: Event) => boolean;
  raf?: (cb: FrameRequestCallback) => number;
  cancelRaf?: (id: number) => void;
}

export interface RoamView {
  render(display: RoamDisplay, frames: RoamFrames | null): void;
  destroy(): void;
}

/** Bubble offset from the pet: centred above it, but never past either edge of the window. */
export function bubbleLeft(x: number, width: number, bubbleW: number): number {
  return Math.min(Math.max((PET_PX - bubbleW) / 2, 0 - x), width - x - bubbleW);
}

function createDom(doc: Document) {
  doc.querySelector(HOST_TAG)?.remove();
  const host = doc.createElement(HOST_TAG);
  Object.entries(HOST_STYLE).forEach(([k, v]) => host.style.setProperty(k, v, 'important'));
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `<style>${ROAM_STYLES}</style><div class="mover"><div class="shadow" hidden></div><div class="bubble" hidden>
    <p class="say"></p><button type="button" class="hide"></button></div>
    <button type="button" class="pet"><img alt="" draggable="false"></button></div>`;
  const q = <T extends HTMLElement>(sel: string) => root.querySelector(sel) as T;
  return {
    host, root, mover: q('.mover'), shadow: q('.shadow'), bubble: q('.bubble'), say: q('.say'), hide: q('.hide'),
    pet: q<HTMLButtonElement>('.pet'), img: q<HTMLImageElement>('img'),
  };
}
type Dom = ReturnType<typeof createDom>;

interface State {
  display: Extract<RoamDisplay, { kind: 'pet' }> | null;
  frames: RoamFrames | null;
  walker: Walker;
  now: number;
  last: number | null;
  happyUntil: number;
  /** Pressed or dragged: the pet stays under the pointer. */
  held: boolean;
}

/** The current form's gait; the egg (which never walks) gets the default. */
const gaitFor = (s: State): Gait => gaitOf(s.display?.pet.formId ?? 'egg');
const gaitStyle = (s: State): GaitStyle => GAIT_STYLES[gaitFor(s)];
const isWalking = (s: State): boolean => s.display?.motion === 'walk' && s.walker.mode === 'walk';

function pickFrame(s: State): { src: string; mirrored: boolean } {
  const { display, frames, walker } = s;
  if (!display || !frames) return { src: '', mirrored: false };
  if (s.now < s.happyUntil) return { src: frames.happy, mirrored: false };
  if (display.pose === 'sleep') return { src: frames.sleep, mirrored: false };
  const walking = isWalking(s);
  const list = walking ? frames.walk : frames.rest;
  const src = list[frameIndex(walker, list.length, gaitStyle(s).frameMs)] ?? frames.rest[0] ?? '';
  return { src, mirrored: walking && walker.dir === -1 };
}

function paint(dom: Dom, s: State, width: number): void {
  const { src, mirrored } = pickFrame(s);
  if (dom.img.getAttribute('src') !== src) dom.img.src = src;
  const moving = s.display?.motion === 'walk';
  const bounce = moving ? bounceOffset(gaitFor(s), { walkMs: isWalking(s) ? s.walker.clockMs : null, nowMs: s.now }) : 0;
  dom.img.style.transform = [mirrored ? 'scaleX(-1)' : '', bounce ? `translateY(${-bounce}px)` : ''].join(' ').trim();
  dom.mover.style.transform = `translateX(${s.walker.x}px)`;
  const { liftPx } = gaitStyle(s);
  dom.mover.style.bottom = `${liftPx}px`;
  dom.shadow.style.bottom = `${-liftPx}px`;
  dom.shadow.hidden = liftPx === 0;
  dom.bubble.style.left = `${bubbleLeft(s.walker.x, width, BUBBLE_W)}px`;
}

function wirePointer(dom: Dom, s: State, width: () => number, toggle: () => void, trusted: (e: Event) => boolean): void {
  let drag: { startX: number; petX: number; moved: boolean } | null = null;
  let suppressClick = false;
  dom.pet.addEventListener('pointerdown', (e) => {
    if (!trusted(e)) return;
    drag = { startX: e.clientX, petX: s.walker.x, moved: false };
    s.held = true;
    dom.pet.setPointerCapture?.(e.pointerId);
  });
  dom.pet.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    if (!drag.moved && Math.abs(dx) <= DRAG_PX) return;
    drag.moved = true;
    s.walker = dragWalker(s.walker, drag.petX + dx, width());
  });
  dom.pet.addEventListener('pointerup', () => {
    suppressClick = drag?.moved ?? false;
    drag = null;
    s.held = false;
  });
  dom.pet.addEventListener('pointercancel', () => {
    drag = null;
    s.held = false;
  });
  dom.pet.addEventListener('click', (e) => {
    if (!trusted(e)) return;
    if (suppressClick) suppressClick = false;
    else toggle();
  });
}

function bubbleControls(dom: Dom, s: State, t: (key: string) => string) {
  const close = () => void (dom.bubble.hidden = true);
  const toggle = () => {
    if (!dom.bubble.hidden || !s.display) return close();
    dom.say.textContent = t(bubbleKey(s.display.pet));
    dom.hide.textContent = t('roam_hide_here');
    dom.bubble.hidden = false;
    s.happyUntil = s.now + HAPPY_MS;
  };
  return { close, toggle };
}

/** The animation loop: steps the walker (or rests in place) and repaints every frame. */
function createLoop(dom: Dom, s: State, deps: RoamViewDeps, width: () => number) {
  const raf = deps.raf ?? ((cb: FrameRequestCallback) => requestAnimationFrame(cb));
  const cancelRaf = deps.cancelRaf ?? ((id: number) => cancelAnimationFrame(id));
  let rafId: number | null = null;
  const tick = (now: number) => {
    const dt = s.last === null ? 0 : now - s.last;
    s.last = now;
    s.now = now;
    const still = s.display?.motion !== 'walk' || s.held || !dom.bubble.hidden;
    s.walker = still ? restWalker(s.walker, dt, width()) : stepWalker(s.walker, dt, width(), deps.rng, gaitStyle(s).pxPerS);
    paint(dom, s, width());
    rafId = raf(tick);
  };
  return {
    start() {
      if (rafId !== null) return;
      s.last = null;
      rafId = raf(tick);
    },
    stop() {
      if (rafId !== null) cancelRaf(rafId);
      rafId = null;
    },
  };
}

export function mountRoam(doc: Document, deps: RoamViewDeps): RoamView {
  const width = () => doc.defaultView?.innerWidth ?? 0;
  const dom = createDom(doc);
  const s: State = {
    display: null, frames: null, walker: createWalker(width(), deps.rng), now: 0, last: null, happyUntil: 0, held: false,
  };
  const trusted = deps.trusted ?? ((e: Event) => e.isTrusted);
  const loop = createLoop(dom, s, deps, width);
  const bubble = bubbleControls(dom, s, deps.t);
  let destroyed = false;

  wirePointer(dom, s, width, bubble.toggle, trusted);
  dom.hide.addEventListener('click', (e) => {
    if (trusted(e)) deps.onHide();
  });
  dom.root.addEventListener('keydown', (e) => {
    if ((e as KeyboardEvent).key === 'Escape') bubble.close();
  });

  const detach = () => {
    loop.stop();
    bubble.close();
    dom.host.remove();
  };
  const destroy = () => {
    destroyed = true;
    detach();
  };
  return {
    render(display, frames) {
      if (destroyed) return;
      const other = doc.querySelector(HOST_TAG);
      if (other && other !== dom.host) return destroy(); // a newer copy of the script took over
      if (display.kind === 'hidden' || !frames) return detach();
      s.display = display;
      s.frames = frames;
      dom.pet.setAttribute('aria-label', deps.t(`form_${display.pet.formId}`));
      if (!dom.host.isConnected) doc.documentElement.append(dom.host);
      loop.start();
    },
    destroy,
  };
}
