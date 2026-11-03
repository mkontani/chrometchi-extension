import { execSync } from 'node:child_process';

export default function globalSetup(): void {
  // scripts/screenshots.ts builds once and points every run at its own copy of that build.
  if (process.env.E2E_EXTENSION_PATH) return;
  execSync('npm run build', { stdio: 'inherit' });
}
