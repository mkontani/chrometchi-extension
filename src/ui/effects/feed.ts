import type { Pose } from '@/core/types';
import { FOOD_AT, SPARKLE_AT } from './layout';
import { BASE_FRAME, type EffectFrame, type EffectOf, type Prop, type SfxCue, type Timeline } from './types';

type Feed = EffectOf<'feed'>;

const APPEAR_MS = 300;
const BITE_MS = 600;
/** The first half of each bite has the mouth open; it closes (and the food shrinks) halfway. */
const MOUTH_OPEN_MS = 300;
const BITES = 3;
const HAPPY_FROM_MS = APPEAR_MS + BITES * BITE_MS;
const DURATION_MS = 2600;
const CRUMB_MS = 300;
const CRUMB_STEP_MS = 100;
const CRUMB_STEP_PX = 4;
const REDUCED_MS = 800;
const REDUCED_SWAP_MS = 400;

/** When bite k (0-based) closes the mouth and takes its piece. */
const closesAt = (k: number) => APPEAR_MS + k * BITE_MS + MOUTH_OPEN_MS;

function bitesTaken(t: number): number {
  return Array.from({ length: BITES }, (_, k) => closesAt(k)).filter((at) => t >= at).length;
}

function chewingPose(t: number): Pose {
  if (t < APPEAR_MS || t >= HAPPY_FROM_MS) return 'idle0';
  return (t - APPEAR_MS) % BITE_MS < MOUTH_OPEN_MS ? 'eat' : 'idle0';
}

const sparkle: Prop = { key: 'sparkle', art: { kind: 'effect', id: 'sparkle' }, ...SPARKLE_AT, scale: 2 };

function foodProp(effect: Feed, bites: number): Prop[] {
  if (bites >= BITES) return [];
  const art = { kind: 'food', food: effect.food, bites: bites as 0 | 1 | 2 } as const;
  return [{ key: 'food', art, ...FOOD_AT, scale: 2 }];
}

/** Crumbs fall down-left from the food's left edge just after each bite. */
function crumbProps(t: number, bites: number): Prop[] {
  if (bites === 0) return [];
  const since = t - closesAt(bites - 1);
  if (since >= CRUMB_MS) return [];
  const step = Math.floor(since / CRUMB_STEP_MS) * CRUMB_STEP_PX;
  return [{ key: 'crumb', art: { kind: 'effect', id: 'crumb' }, x: FOOD_AT.x - step, y: FOOD_AT.y + 24 + step, scale: 2 }];
}

function reducedFrame(effect: Feed, t: number): EffectFrame {
  if (t < REDUCED_SWAP_MS) return { ...BASE_FRAME, pose: 'eat', props: foodProp(effect, 0) };
  return { ...BASE_FRAME, pose: 'happy', props: [sparkle] };
}

export const FEED: Timeline<Feed> = {
  durationMs: (_effect, reduced) => (reduced ? REDUCED_MS : DURATION_MS),
  frame(effect, t, reduced) {
    if (reduced) return reducedFrame(effect, t);
    if (t >= HAPPY_FROM_MS) return { ...BASE_FRAME, pose: 'happy', props: [sparkle] };
    const bites = bitesTaken(t);
    return { ...BASE_FRAME, pose: chewingPose(t), props: [...foodProp(effect, bites), ...crumbProps(t, bites)] };
  },
  cues(_effect, reduced): readonly SfxCue[] {
    if (reduced) return [{ atMs: REDUCED_SWAP_MS, sfx: 'eat' }];
    return Array.from({ length: BITES }, (_, k) => ({ atMs: closesAt(k), sfx: 'eat' as const }));
  },
};
