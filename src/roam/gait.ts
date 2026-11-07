import type { FormId } from '@/core/types';
import { FRAME_MS, WALK_PX_PER_S } from './constants';

/**
 * How a form gets around on the page. Each form's walk0–7 art is drawn in its gait:
 * - walk: on two feet;
 * - trot: on all fours (forms whose hands touch the ground);
 * - hop: round bodies bouncing along;
 * - crawl: legless forms that touch the ground (slithering, oozing, dragging);
 * - float: legless or winged forms, which hover above the ground.
 */
export type Gait = 'walk' | 'trot' | 'hop' | 'crawl' | 'float';

export interface GaitStyle {
  readonly pxPerS: number;
  /** How long each frame of the 8-frame cycle shows. */
  readonly frameMs: number;
  /** Height above the bottom of the page (floaters hover over a shadow). */
  readonly liftPx: number;
}

export const GAIT_STYLES: Readonly<Record<Gait, GaitStyle>> = {
  walk: { pxPerS: WALK_PX_PER_S, frameMs: FRAME_MS.walk, liftPx: 0 },
  trot: { pxPerS: 48, frameMs: 100, liftPx: 0 },
  hop: { pxPerS: 36, frameMs: 110, liftPx: 0 },
  crawl: { pxPerS: 22, frameMs: 150, liftPx: 0 },
  float: { pxPerS: 30, frameMs: 130, liftPx: 12 },
};

/** Every form but the egg (which never walks), so adding a form forces a choice here. */
export const FORM_GAITS: Readonly<Record<FormId, Gait>> = {
  baby_puni: 'hop',
  child_kemu: 'float',
  child_dango: 'hop',
  child_hoshi: 'float',
  child_mochi: 'hop',
  child_pico: 'hop',
  child_awa: 'float',
  child_tane: 'hop',
  child_ame: 'hop',
  child_yuki: 'hop',
  young_kirari: 'float',
  young_kage: 'float',
  young_poyo: 'hop',
  young_hinoko: 'trot',
  young_shizuku: 'hop',
  young_mebuki: 'walk',
  young_fuwari: 'float',
  young_gear: 'walk',
  young_tomoshi: 'hop',
  young_kingyo: 'float',
  young_kogane: 'walk',
  young_kumo: 'float',
  young_kaminari: 'float',
  young_obake: 'float',
  young_tsurara: 'float',
  young_koishi: 'hop',
  adult_dragon: 'float',
  adult_beast: 'trot',
  adult_salamander: 'trot',
  adult_phoenix: 'float',
  adult_hedgehog: 'trot',
  adult_ferret: 'trot',
  adult_rooster: 'walk',
  adult_serpent: 'crawl',
  adult_turtle: 'trot',
  adult_kraken: 'crawl',
  adult_seal: 'crawl',
  adult_otter: 'walk',
  adult_dolphin: 'float',
  adult_whale: 'float',
  adult_golem: 'walk',
  adult_mole: 'crawl',
  adult_tree: 'walk',
  adult_mushroom: 'walk',
  adult_bunny: 'hop',
  adult_sunflower: 'walk',
  adult_stag: 'trot',
  adult_griffin: 'trot',
  adult_owl: 'float',
  adult_pegasus: 'float',
  adult_butterfly: 'float',
  adult_dandelion: 'float',
  adult_swallow: 'float',
  adult_stormbird: 'float',
  adult_robot: 'walk',
  adult_ufo: 'float',
  adult_cyborg: 'walk',
  adult_clock: 'walk',
  adult_drone: 'float',
  adult_toaster: 'walk',
  adult_mecha: 'walk',
  adult_ghost: 'float',
  adult_alien: 'walk',
  adult_bat: 'float',
  adult_vampire: 'float',
  adult_pumpkin: 'hop',
  adult_blackcat: 'trot',
  adult_koala: 'walk',
  adult_unicorn: 'trot',
  adult_comet: 'trot',
  adult_nexus: 'float',
  adult_astra: 'float',
  adult_jellyfish: 'float',
  adult_fairy: 'float',
  adult_rainbow: 'float',
  adult_bear: 'walk',
  adult_hippo: 'walk',
  adult_pudding: 'crawl',
  adult_grandpudding: 'crawl',
  adult_elephant: 'trot',
  adult_balloon: 'float',
  adult_pancake: 'hop',
};

export function gaitOf(formId: FormId): Gait {
  return FORM_GAITS[formId] ?? 'walk';
}

/** How high a hop reaches, and how far and how slowly a floater drifts. */
export const HOP_PX = 8;
export const BOB_PX = 4;
export const BOB_MS = 1600;

/** Whole art pixels: the 32px art is drawn at 2×. */
const toArtPx = (px: number): number => Math.round(px / 2) * 2;

/**
 * Extra height above the pet's usual spot. Hoppers arc twice per walk cycle while moving
 * (`walkMs` is time since the walk began, null at rest); floaters bob on page time, so the
 * bob never jumps when the pet starts or stops.
 */
export function bounceOffset(gait: Gait, t: { walkMs: number | null; nowMs: number }): number {
  if (gait === 'hop' && t.walkMs !== null) {
    return toArtPx(HOP_PX * Math.abs(Math.sin((Math.PI * t.walkMs) / (4 * GAIT_STYLES.hop.frameMs))));
  }
  if (gait === 'float') return toArtPx((BOB_PX * (1 - Math.cos((2 * Math.PI * t.nowMs) / BOB_MS))) / 2);
  return 0;
}
