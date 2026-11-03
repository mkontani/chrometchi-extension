import { SWITCH_AT } from './layout';
import { BASE_FRAME, type EffectFrame, type EffectOf, type Prop, type SfxCue, type Timeline } from './types';

type Lights = EffectOf<'lights'>;

const OFF_MS = 1000;
const ON_MS = 800;
const REDUCED_MS = 300;
/** Lights off: the click, then the room darkens a quarter at a time. */
const OFF_CLICK_MS = 200;
const DIM_STEP_MS = 200;
const DIM_STEPS = 4;
/** Lights on: the click lights the room with one flash frame, then the pet wiggles. */
const ON_CLICK_MS = 100;
const FLASH_END_MS = 200;
const WIGGLE_STEP_MS = 100;
const SHAKE_PX = 4;
const PRESS_PX = 4;

const switchProp = (pressed: boolean): Prop => ({
  key: 'switch',
  art: { kind: 'icon', id: 'lights' },
  x: SWITCH_AT.x,
  y: SWITCH_AT.y + (pressed ? PRESS_PX : 0),
  scale: 3,
});

function turningOff(t: number): EffectFrame {
  const dim = t < OFF_CLICK_MS ? 0 : Math.min(DIM_STEPS, Math.floor((t - OFF_CLICK_MS) / DIM_STEP_MS) + 1) / DIM_STEPS;
  return { ...BASE_FRAME, dim, props: [switchProp(t >= OFF_CLICK_MS)] };
}

function turningOn(t: number): EffectFrame {
  const lit = t >= ON_CLICK_MS;
  const wiggling = t >= FLASH_END_MS;
  const petDx = wiggling ? (Math.floor((t - FLASH_END_MS) / WIGGLE_STEP_MS) % 2 === 0 ? SHAKE_PX : -SHAKE_PX) : 0;
  return { ...BASE_FRAME, dim: lit ? 0 : 1, flash: lit && !wiggling, petDx, props: [switchProp(lit)] };
}

export const LIGHTS: Timeline<Lights> = {
  durationMs: (effect, reduced) => (reduced ? REDUCED_MS : effect.on ? ON_MS : OFF_MS),
  frame(effect, t, reduced) {
    if (reduced) return { ...BASE_FRAME, dim: effect.on ? 0 : 1, props: [switchProp(true)] };
    return effect.on ? turningOn(t) : turningOff(t);
  },
  cues(effect, reduced): readonly SfxCue[] {
    return [{ atMs: reduced ? 0 : effect.on ? ON_CLICK_MS : OFF_CLICK_MS, sfx: 'click' }];
  },
};
