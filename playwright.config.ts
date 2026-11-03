import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  // Store screenshots only run via `npm run screenshots`.
  grepInvert: process.env.SCREENSHOTS ? undefined : /@screenshots/,
  globalSetup: './e2e/global-setup.ts',
  workers: 1,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
});
