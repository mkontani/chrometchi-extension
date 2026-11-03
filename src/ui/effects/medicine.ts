import type { Pose } from '@/core/types';
import { MOUTH_AT, PET, PILL_FROM, SPARKLE_AT, SWEAT_AT } from './layout';
import { BASE_FRAME, type EffectFrame, type EffectOf, type Prop, type SfxCue, type Timeline } from './types';

type Medicine = EffectOf<'medicine'>;

const STEP_MS = 100;
const PILL_STEPS = 5;
const GULP_MS = 600;
const RESULT_MS = 900;
/** First dose: shiver until here, then a small sparkle. */
const SHIVER_END_MS = 1500;
/** Cure: the sweat flies off until here, then sparkles burst. */
const BURST_MS = 1300;
const SWEAT_STEP_PX = 8;
const BURST_START_PX = 16;
const BURST_STEP_PX = 8;
const BURST_STEPS = 4;
const DURATION_MS = 2000;
const REDUCED_MS = 800;
const REDUCED_RESULT_MS = 400;
const SHAKE_PX = 4;
/** A small (1×) sparkle near the pet's head for "one more dose". */
const SMALL_SPARKLE_AT = { x: 246, y: 98 } as const;
/** The burst is centered on the pet (for 32 px sparkles). */
const BURST_CENTER = { x: PET.x + PET.size / 2 - 16, y: PET.y + PET.size / 2 - 32 } as const;

const even = (v: number) => Math.round(v / 2) * 2;
const fx = (key: string, id: 'pill' | 'sweat' | 'sparkle', x: number, y: number, scale = 2): Prop => ({
  key, art: { kind: 'effect', id }, x, y, scale,
});

function pill(t: number): Prop {
  const k = Math.min(PILL_STEPS, Math.floor(t / STEP_MS)) / PILL_STEPS;
  return fx('pill', 'pill', even(PILL_FROM.x + (MOUTH_AT.x - PILL_FROM.x) * k), even(PILL_FROM.y + (MOUTH_AT.y - PILL_FROM.y) * k));
}

function flyingSweat(t: number): Prop[] {
  if (t < RESULT_MS) return [fx('sweat', 'sweat', SWEAT_AT.x, SWEAT_AT.y)];
  if (t >= BURST_MS) return [];
  const k = Math.floor((t - RESULT_MS) / STEP_MS) + 1;
  return [fx('sweat', 'sweat', SWEAT_AT.x - SWEAT_STEP_PX * k, SWEAT_AT.y - SWEAT_STEP_PX * k)];
}

function burst(t: number): Prop[] {
  const d = BURST_START_PX + BURST_STEP_PX * Math.min(BURST_STEPS, Math.floor((t - BURST_MS) / STEP_MS));
  const corners: [number, number][] = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
  return corners.map(([sx, sy], i) => fx(`sparkle${i}`, 'sparkle', BURST_CENTER.x + sx * d, BURST_CENTER.y + sy * d));
}

function firstDose(t: number): EffectFrame {
  if (t < SHIVER_END_MS) {
    const petDx = Math.floor((t - RESULT_MS) / STEP_MS) % 2 === 0 ? SHAKE_PX : -SHAKE_PX;
    return { ...BASE_FRAME, pose: 'sick', petDx };
  }
  return { ...BASE_FRAME, pose: 'sick', props: [fx('sparkle', 'sparkle', SMALL_SPARKLE_AT.x, SMALL_SPARKLE_AT.y, 1)] };
}

function cure(t: number): EffectFrame {
  if (t < BURST_MS) return { ...BASE_FRAME, props: flyingSweat(t) };
  return { ...BASE_FRAME, pose: 'happy', props: burst(t) };
}

function beforeResult(effect: Medicine, t: number): EffectFrame {
  const pose: Pose = t < GULP_MS ? 'sick' : 'eat';
  const sweat = effect.cured ? flyingSweat(t) : [];
  return { ...BASE_FRAME, pose, props: [...(t < GULP_MS ? [pill(t)] : []), ...sweat] };
}

function reducedFrame(effect: Medicine, t: number): EffectFrame {
  if (t < REDUCED_RESULT_MS) {
    const sweat = effect.cured ? [fx('sweat', 'sweat', SWEAT_AT.x, SWEAT_AT.y)] : [];
    return { ...BASE_FRAME, pose: 'eat', props: [fx('pill', 'pill', MOUTH_AT.x, MOUTH_AT.y), ...sweat] };
  }
  if (effect.cured) return { ...BASE_FRAME, pose: 'happy', props: [fx('sparkle', 'sparkle', SPARKLE_AT.x, SPARKLE_AT.y)] };
  return { ...BASE_FRAME, pose: 'sick', props: [fx('sparkle', 'sparkle', SMALL_SPARKLE_AT.x, SMALL_SPARKLE_AT.y, 1)] };
}

export const MEDICINE: Timeline<Medicine> = {
  durationMs: (_effect, reduced) => (reduced ? REDUCED_MS : DURATION_MS),
  frame(effect, t, reduced) {
    if (reduced) return reducedFrame(effect, t);
    if (t < RESULT_MS) return beforeResult(effect, t);
    return effect.cured ? cure(t) : firstDose(t);
  },
  cues(effect, reduced): readonly SfxCue[] {
    const gulp: SfxCue = { atMs: reduced ? 0 : GULP_MS, sfx: 'gulp' };
    if (!effect.cured) return [gulp];
    return [gulp, { atMs: reduced ? REDUCED_RESULT_MS : BURST_MS, sfx: 'happy' }];
  },
};
