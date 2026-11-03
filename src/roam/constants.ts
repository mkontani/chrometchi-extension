/** Pages the roaming pet may walk on: the optional host permission and the script's matches. */
export const ROAM_ORIGINS = ['http://*/*', 'https://*/*'] as const;
export const ROAM_SCRIPT_ID = 'chrometchi-roam';
/** WXT's output path for src/entrypoints/roam.content.ts. */
export const ROAM_SCRIPT_FILE = 'content-scripts/roam.js';
