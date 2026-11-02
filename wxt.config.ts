import { defineConfig } from 'wxt';
import preact from '@preact/preset-vite';

export default defineConfig({
  srcDir: 'src',
  vite: () => ({ plugins: [preact()] }),
  manifest: {
    name: '__MSG_appName__',
    description: '__MSG_appDescription__',
    default_locale: 'en',
    // Array.prototype.toSorted (src/core/evolution.ts) needs Chrome 110.
    minimum_chrome_version: '110',
    permissions: ['storage', 'alarms', 'notifications', 'idle'],
    action: { default_title: '__MSG_appName__' },
  },
});
