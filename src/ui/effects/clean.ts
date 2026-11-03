import { BROOM, POOP_ROW, STAGE, poopSlotLeft } from './layout';
import { BASE_FRAME, type EffectFrame, type EffectOf, type PoopView, type Prop, type SfxCue, type Timeline } from './types';

type Clean = EffectOf<'clean'>;

const BROOM_PX = 16 * BROOM.scale;
/** The broom crosses from just off the right edge to just off the left edge. */
const CROSS_MS = 1800;
const STEP_PX = 4;
const STEPS = (STAGE.w + BROOM_PX) / STEP_PX;
/** Sweeping strokes: the broom swings 16 px left on every other slice. */
const STROKE_MS = 150;
const STROKE_PX = -16;
const DURATION_MS = 2200;
/** After the broom reaches a poop: two slide steps, three dust puffs, then gone. */
const POOP_STEP_MS = 100;
const SLIDE: readonly PoopView[] = [{ look: 'poop', dx: -4 }, { look: 'poop', dx: -8 }];
const PUFF: readonly PoopView[] = [{ look: 'dust0', dx: -8 }, { look: 'dust1', dx: -8 }, { look: 'dust2', dx: -8 }];
const AFTER_SWEEP = [...SLIDE, ...PUFF];
const WAITING: PoopView = { look: 'poop', dx: 0 };
const GONE: PoopView = { look: 'gone', dx: 0 };
const REDUCED_MS = 600;
const REDUCED_SWEEP_MS = 300;
const SPARKLE_PX = 32;

const baseX = (t: number) => STAGE.w - STEP_PX * Math.min(STEPS, Math.floor((t * STEPS) / CROSS_MS));
const strokeX = (t: number) => (Math.floor(t / STROKE_MS) % 2 === 1 ? STROKE_PX : 0);

/** The first ms at which the broom's (stroke-free) position reaches the right edge of poop `i`. */
function sweptAt(i: number, n: number): number {
  const right = poopSlotLeft(i, n) + POOP_ROW.size;
  const steps = Math.ceil((STAGE.w - right) / STEP_PX);
  return Math.ceil((steps * CROSS_MS) / STEPS);
}

function poopView(t: number, swept: number): PoopView {
  if (t < swept) return WAITING;
  return AFTER_SWEEP[Math.floor((t - swept) / POOP_STEP_MS)] ?? GONE;
}

const even = (v: number) => Math.round(v / 2) * 2;

/** A sparkle on the floor over the old poop row (or at its right end when there were none). */
function floorSparkle(n: number): Prop {
  const right = STAGE.w - POOP_ROW.right;
  const left = n > 0 ? poopSlotLeft(0, n) : right - SPARKLE_PX;
  const x = even((left + right) / 2 - SPARKLE_PX / 2);
  const y = STAGE.h - POOP_ROW.bottom - SPARKLE_PX;
  return { key: 'sparkle', art: { kind: 'effect', id: 'sparkle' }, x, y, scale: 2 };
}

const broomAt = (x: number): Prop => ({ key: 'broom', art: { kind: 'icon', id: 'clean' }, x, y: BROOM.y, scale: BROOM.scale });
const allPoops = (n: number, view: PoopView) => Array.from({ length: n }, () => view);

function reducedFrame(n: number, t: number): EffectFrame {
  const broom = broomAt(poopSlotLeft(0, n) - BROOM_PX);
  if (t < REDUCED_SWEEP_MS) return { ...BASE_FRAME, poops: allPoops(n, WAITING), props: [broom] };
  return { ...BASE_FRAME, pose: 'happy', poops: allPoops(n, GONE), props: [broom, floorSparkle(n)] };
}

export const CLEAN: Timeline<Clean> = {
  durationMs: (_effect, reduced) => (reduced ? REDUCED_MS : DURATION_MS),
  frame({ poops: n }, t, reduced) {
    if (reduced) return reducedFrame(n, t);
    if (t >= CROSS_MS) return { ...BASE_FRAME, pose: 'happy', poops: allPoops(n, GONE), props: [floorSparkle(n)] };
    const poops = Array.from({ length: n }, (_, i) => poopView(t, sweptAt(i, n)));
    return { ...BASE_FRAME, poops, props: [broomAt(baseX(t) + strokeX(t))] };
  },
  cues({ poops: n }, reduced): readonly SfxCue[] {
    if (n === 0) return [];
    if (reduced) return [{ atMs: REDUCED_SWEEP_MS, sfx: 'sweep' }];
    return Array.from({ length: n }, (_, i) => ({ atMs: sweptAt(i, n), sfx: 'sweep' as const })).sort(
      (a, b) => a.atMs - b.atMs,
    );
  },
};
