import { POT_AT } from './layout';
import { BASE_FRAME, type EffectFrame, type EffectOf, type Prop, type SfxCue, type Timeline } from './types';

type Cook = EffectOf<'cook'>;

const SIMMER_MS = 1200;
const DURATION_MS = 1600;
const REDUCED_MS = 800;
const REDUCED_READY_MS = 500;
const HOP_MS = 150;
const HOP_PX = 2;
const PUFF_EVERY_MS = 400;
const PUFF_STEP_MS = 100;
const PUFF_STEP_PX = 4;
const PUFF_LOOKS = ['dust0', 'dust1', 'dust2'] as const;
/** The steam starts at the pot's top centre (a 32 px puff on a 64 px pot). */
const STEAM_AT = { x: POT_AT.x + 16, y: POT_AT.y - 16 } as const;
const SPARKLE_OVER_POT = { x: POT_AT.x + 16, y: POT_AT.y - 24 } as const;

const pot = (hopped: boolean): Prop => ({
  key: 'pot',
  art: { kind: 'cook', id: 'pot' },
  x: POT_AT.x,
  y: POT_AT.y - (hopped ? HOP_PX : 0),
  scale: 2,
});

const sparkle: Prop = { key: 'sparkle', art: { kind: 'effect', id: 'sparkle' }, ...SPARKLE_OVER_POT, scale: 2 };

/** Hops during every other 150 ms, starting with a rest. */
const isHopping = (t: number) => Math.floor(t / HOP_MS) % 2 === 1;

/** One puff at a time: dust0, dust1, dust2, then a pause until the next one. */
function steam(t: number): Prop[] {
  const step = Math.floor((t % PUFF_EVERY_MS) / PUFF_STEP_MS);
  const look = PUFF_LOOKS[step];
  if (!look) return [];
  return [{ key: 'steam', art: { kind: 'effect', id: look }, x: STEAM_AT.x, y: STEAM_AT.y - step * PUFF_STEP_PX, scale: 2 }];
}

function readyFrame(): EffectFrame {
  return { ...BASE_FRAME, pose: 'happy', props: [pot(false), sparkle] };
}

export const COOK: Timeline<Cook> = {
  durationMs: (_effect, reduced) => (reduced ? REDUCED_MS : DURATION_MS),
  frame(_effect, t, reduced) {
    if (reduced) return t < REDUCED_READY_MS ? { ...BASE_FRAME, props: [pot(false)] } : readyFrame();
    if (t >= SIMMER_MS) return readyFrame();
    return { ...BASE_FRAME, props: [pot(isHopping(t)), ...steam(t)] };
  },
  cues(_effect, reduced): readonly SfxCue[] {
    if (reduced) return [{ atMs: 0, sfx: 'simmer' }, { atMs: REDUCED_READY_MS, sfx: 'cooked' }];
    return [{ atMs: 0, sfx: 'simmer' }, { atMs: 600, sfx: 'simmer' }, { atMs: SIMMER_MS, sfx: 'cooked' }];
  },
};
