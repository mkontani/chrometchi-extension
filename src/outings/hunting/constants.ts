import { ART_HUD_TOP } from '@/games/hud';

/** Shared by logic and render so neither has to import runtime values from the other. */
export const TUFTS = 5;
export const BURST_MS = 300;
export const CANVAS = 180;
export const TUFT_SIZE = 28;
export const TUFT_Y = 112;
export const POP_Y = 92;
/** Taps between a little above the pop and the HUD strip pick a tuft. */
export const PICK_TOP = POP_Y - 4;
export const PICK_BOTTOM = ART_HUD_TOP;

const TUFT_W = CANVAS / TUFTS;
export const tuftX = (i: number): number => Math.round(i * TUFT_W + (TUFT_W - TUFT_SIZE) / 2);

export const POINTS_PER_CATCH = 10;
const MAX_SCORE = 100;

export const huntingScoreOf = (caught: number): number => Math.min(MAX_SCORE, caught * POINTS_PER_CATCH);
