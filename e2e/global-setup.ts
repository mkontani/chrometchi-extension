import { execSync } from 'node:child_process';

export default function globalSetup(): void {
  // scripts/screenshots.ts builds once and points every run at its own copy of that build.
  if (process.env.E2E_EXTENSION_PATH) return;
  // The e2e build (.output/chrome-mv3-e2e) is granted site access at install (see wxt.config.ts).
  execSync('npx wxt build --mode e2e', { stdio: 'inherit' });
}
