/**
 * Store screenshots and promo tiles in every shipped language: `npm run screenshots`.
 *
 * Chrome picks the extension's language from its own UI language, which Playwright cannot set on
 * macOS. So each run loads a copy of the build that ships only one locale (made the default), and
 * the spec writes screenshots/<lang>/.
 */
import { spawnSync } from 'node:child_process';
import { cpSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BUILD = path.join(ROOT, '.output/chrome-mv3');
const LANGS = ['ja', 'en'] as const;

function run(cmd: string, args: string[], env: NodeJS.ProcessEnv = {}): void {
  const result = spawnSync(cmd, args, {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, ...env },
    shell: process.platform === 'win32', // npm/npx are .cmd shims on Windows
  });
  if (result.error) throw new Error(`Could not start ${cmd}: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`${cmd} ${args.join(' ')} failed (exit ${result.status})`);
}

/** Copies the build with `lang` as its only locale, so Chrome must use it. */
function singleLocaleBuild(lang: string): string {
  const dir = path.join(ROOT, `.output/store-${lang}`);
  rmSync(dir, { recursive: true, force: true });
  cpSync(BUILD, dir, { recursive: true });
  const manifestPath = path.join(dir, 'manifest.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Record<string, unknown>;
  writeFileSync(manifestPath, JSON.stringify({ ...manifest, default_locale: lang }));
  const locales = path.join(dir, '_locales');
  for (const other of readdirSync(locales).filter((l) => l !== lang)) {
    rmSync(path.join(locales, other), { recursive: true });
  }
  return dir;
}

run('npm', ['run', 'build']);
for (const lang of LANGS) {
  const extension = singleLocaleBuild(lang);
  run('npx', ['playwright', 'test', '--grep', '@screenshots'], {
    SCREENSHOTS: '1',
    SHOT_LANG: lang,
    E2E_EXTENSION_PATH: extension,
  });
}
