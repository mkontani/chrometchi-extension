import type { SfxName } from '@/ui/sound';
import { CLEAN } from './clean';
import { FEED } from './feed';
import { LIGHTS } from './lights';
import { MEDICINE } from './medicine';
import type { CareEffect, EffectFrame, SfxCue, Timeline } from './types';

/** Every effect ends within this (spec: no waiting on the next care). */
export const MAX_EFFECT_MS = 3000;
/** With prefers-reduced-motion, every effect ends within this. */
export const MAX_REDUCED_MS = 1000;

interface BoundTimeline {
  durationMs(reduced: boolean): number;
  frame(elapsedMs: number, reduced: boolean): EffectFrame;
  cues(reduced: boolean): readonly SfxCue[];
}

function bind<E extends CareEffect>(timeline: Timeline<E>, effect: E): BoundTimeline {
  return {
    durationMs: (reduced) => timeline.durationMs(effect, reduced),
    frame: (t, reduced) => timeline.frame(effect, t, reduced),
    cues: (reduced) => timeline.cues(effect, reduced),
  };
}

function timelineOf(effect: CareEffect): BoundTimeline {
  switch (effect.kind) {
    case 'feed':
      return bind(FEED, effect);
    case 'clean':
      return bind(CLEAN, effect);
    case 'medicine':
      return bind(MEDICINE, effect);
    case 'lights':
      return bind(LIGHTS, effect);
  }
}

export const effectDurationMs = (effect: CareEffect, reduced: boolean): number =>
  timelineOf(effect).durationMs(reduced);

export const effectFrame = (effect: CareEffect, elapsedMs: number, reduced: boolean): EffectFrame =>
  timelineOf(effect).frame(elapsedMs, reduced);

/** The sounds whose time falls in (fromMs, toMs], in order. */
export function cuesBetween(effect: CareEffect, reduced: boolean, fromMs: number, toMs: number): SfxName[] {
  return timelineOf(effect)
    .cues(reduced)
    .filter((c) => c.atMs > fromMs && c.atMs <= toMs)
    .map((c) => c.sfx);
}
