/** Pages the roaming pet may walk on: the optional host permission and the script's matches. */
export const ROAM_ORIGINS = ['http://*/*', 'https://*/*'] as const;
export const ROAM_SCRIPT_ID = 'chrometchi-roam';
/** WXT's output path for src/entrypoints/roam.content.ts. */
export const ROAM_SCRIPT_FILE = 'content-scripts/roam.js';

/** The pet is 32px art drawn at 2×. */
export const PET_PX = 64;
export const WALK_PX_PER_S = 40;
/** Inclusive ranges for how long one stretch of walking or resting lasts. */
export const WALK_MS = [3000, 8000] as const;
export const REST_MS = [1500, 5000] as const;
/** How long each animation frame shows: the 8-frame walk cycle, and the 2-frame idle while resting. */
export const FRAME_MS = { walk: 110, rest: 500 } as const;
/** A background tab can sleep for minutes; one step never covers more than this. */
export const MAX_DT_MS = 100;
/** Below this (out of 100) the pet says it is hungry or bored. */
export const LOW_STAT = 25;
