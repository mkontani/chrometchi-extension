import { defineConfig } from 'wxt';
import preact from '@preact/preset-vite';
import { ROAM_ORIGINS } from './src/roam/constants';

export default defineConfig({
  srcDir: 'src',
  vite: () => ({
    plugins: [preact()],
    // Sprites ship as files, never inlined, so the roaming content script stays small:
    // the background reads only the current pet's frames from disk (src/background/roamFrames.ts).
    build: { assetsInlineLimit: (file: string) => (file.includes('/src/assets/sprites/') ? false : undefined) },
  }),
  manifest: ({ mode }) => ({
    name: '__MSG_appName__',
    description: '__MSG_appDescription__',
    default_locale: 'en',
    // Array.prototype.toSorted (src/core/evolution.ts) needs Chrome 110.
    minimum_chrome_version: '110',
    // `scripting` shows no install warning; site access is optional and asked for only when
    // the owner turns roaming on.
    permissions: ['storage', 'alarms', 'notifications', 'idle', 'scripting'],
    optional_host_permissions: [...ROAM_ORIGINS],
    // The e2e build is granted site access up front: Playwright cannot answer Chrome's dialog.
    ...(mode === 'e2e' ? { host_permissions: [...ROAM_ORIGINS] } : {}),
    action: { default_title: '__MSG_appName__' },
  }),
});
