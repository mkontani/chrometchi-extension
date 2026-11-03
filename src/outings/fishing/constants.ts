/** Shared by logic and render so neither has to import runtime values from the other. */
export const POINTS_PER_CATCH = 20;
const MAX_SCORE = 100;

export const fishingScoreOf = (catches: number): number => Math.min(MAX_SCORE, catches * POINTS_PER_CATCH);
