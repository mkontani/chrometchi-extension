import type { CookedDish, FoodId, Pose } from '@/core/types';
import type { EffectId } from '@/ui/assets';
import type { SfxName } from '@/ui/sound';

/** A successful care, as the stage replays it. */
export type CareEffect =
  | { readonly kind: 'feed'; readonly food: FoodId }
  | { readonly kind: 'clean'; readonly poops: number }
  | { readonly kind: 'medicine'; readonly cured: boolean }
  | { readonly kind: 'lights'; readonly on: boolean }
  | { readonly kind: 'cook'; readonly dish: CookedDish };
export type EffectOf<K extends CareEffect['kind']> = Extract<CareEffect, { kind: K }>;

export type PropArt =
  | { readonly kind: 'food'; readonly food: FoodId; readonly bites: 0 | 1 | 2 }
  | { readonly kind: 'effect'; readonly id: EffectId }
  | { readonly kind: 'icon'; readonly id: 'clean' | 'lights' }
  | { readonly kind: 'cook'; readonly id: 'pot' };

/** One picture on the stage: top-left in stage px, drawn at `scale` × the art's own size. */
export interface Prop {
  readonly key: string;
  readonly art: PropArt;
  readonly x: number;
  readonly y: number;
  readonly scale: number;
}

export type PoopLook = 'poop' | 'dust0' | 'dust1' | 'dust2' | 'gone';
export interface PoopView {
  readonly look: PoopLook;
  readonly dx: number;
}

/** What the stage shows at one moment of an effect, on top of its usual picture. */
export interface EffectFrame {
  /** Overrides the pet's pose; null keeps the usual pose. */
  readonly pose: Pose | null;
  /** Sideways shake of the pet in stage px: -4, 0 or 4. */
  readonly petDx: number;
  /** Replaces the saved poops while the broom works; null shows the saved poops. */
  readonly poops: readonly PoopView[] | null;
  /** How dark the room is, 0..1; null follows the saved lights. */
  readonly dim: number | null;
  readonly flash: boolean;
  readonly props: readonly Prop[];
}

export const BASE_FRAME: EffectFrame = { pose: null, petDx: 0, poops: null, dim: null, flash: false, props: [] };

export interface SfxCue {
  readonly atMs: number;
  readonly sfx: SfxName;
}

export interface Timeline<E extends CareEffect> {
  durationMs(effect: E, reduced: boolean): number;
  frame(effect: E, elapsedMs: number, reduced: boolean): EffectFrame;
  cues(effect: E, reduced: boolean): readonly SfxCue[];
}
