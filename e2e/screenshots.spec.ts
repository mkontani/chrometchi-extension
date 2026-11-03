import { copyFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { BrowserContext, Page, Route } from '@playwright/test';
import { makePet, type PetOverrides } from '../src/core/__fixtures__/pet';
import type { FormId } from '../src/core/types';
import { createFreshSave } from '../src/storage/repository';
import type { SaveV1 } from '../src/storage/schema';
import { expect, seedSave, test } from './fixtures';
import { POPUP, STORE, composeHtml } from './store/compose';
import { SLIDES, type Lang } from './store/copy';

/**
 * Store screenshots: run `npm run screenshots` (excluded from `npm run e2e`). Each scene is the
 * real popup, captured at 3× and placed on a 1280×800 slide with copy from ./store/copy.ts.
 * SHOT_LANG picks the copy language; scripts/screenshots.ts sets it together with a build that
 * ships only that locale, so the popup and the copy always match.
 */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'screenshots');
const ORIGIN = 'https://store.local';
/**
 * Catch slide, found by simulating the game logic: with this seed and these moves (ms after the
 * game opens) the pet has caught two treats, a third is right above it and no rock is on screen.
 */
const CATCH_SEED = 3;
const CATCH_MOVES: ReadonlyArray<{ at: number; key: string }> = [
  { at: 1800, key: 'ArrowRight' },
  { at: 2600, key: 'ArrowLeft' },
  { at: 3400, key: 'ArrowRight' },
];
const CATCH_PLAY_MS = 3600;
const NEVER_ASLEEP: [number, number] = [0, 0];
const ALWAYS_ASLEEP: [number, number] = [0, 1439];
const DISCOVERED: FormId[] = [
  'egg', 'baby_puni', 'child_hoshi', 'child_kemu', 'child_dango', 'young_hinoko',
  'young_shizuku', 'young_poyo', 'adult_dragon', 'adult_beast', 'adult_turtle', 'adult_owl',
];
/** Where /<prefix>/... is served from on the slide page. */
const STATIC: Record<string, string> = {
  font: 'node_modules/@fontsource/dotgothic16',
  art: 'src/assets',
  icon: 'public/icon',
};

function scene(pet: PetOverrides, sleep = NEVER_ASLEEP, discovered: FormId[] = ['egg']): SaveV1 {
  const now = Date.now();
  const base = createFreshSave(now);
  return {
    ...base,
    meta: { ...base.meta, showRenewal: false, showDataReset: false },
    settings: { ...base.settings, sleepStartMin: sleep[0], sleepEndMin: sleep[1] },
    zukan: { ...base.zukan, discovered },
    game: { ...base.game, pet: makePet(pet), lastTickAt: now },
  };
}

/** `fakeClock` installs Playwright's (context-wide) clock before load, so a scene can step time exactly. */
async function open(context: BrowserContext, extensionId: string, save: SaveV1, fakeClock = false): Promise<Page> {
  await seedSave(context, save);
  const page = await context.newPage();
  if (fakeClock) await page.clock.install();
  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  await page.setViewportSize({ width: POPUP.width, height: POPUP.height });
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: POPUP.width, height: POPUP.height, deviceScaleFactor: POPUP.captureScale, mobile: false,
  });
  await expect(page.locator('.stage, .zukan').first()).toBeVisible();
  return page;
}

/** Replaces Math.random with a seeded generator (mulberry32) so a mini-game plays the same every run. */
async function seedRandom(page: Page, seed: number): Promise<void> {
  await page.evaluate((initial) => {
    let state = initial;
    Math.random = () => {
      state = (state + 0x6d2b79f5) | 0;
      let t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }, seed);
}

/** Plays Catch for exactly CATCH_PLAY_MS of clock time: seeded items, paused clock, fixed moves. */
async function playCatch(page: Page, msg: (key: string) => string): Promise<void> {
  await seedRandom(page, CATCH_SEED);
  await page.getByRole('button', { name: msg('action_play'), exact: true }).click();
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 1000);
  await page.getByRole('button', { name: new RegExp(msg('game_catch')) }).click();
  let played = 100;
  await page.clock.runFor(played); // mount effects: the loop and the key listeners start
  await expect(page.locator('.minigame__frame[data-ready="true"]')).toBeVisible();
  for (const move of CATCH_MOVES) {
    await page.clock.runFor(move.at - played);
    played = move.at;
    await page.keyboard.press(move.key);
  }
  await page.clock.runFor(CATCH_PLAY_MS - played);
}

async function capture(page: Page): Promise<Buffer> {
  await page.waitForTimeout(250); // let the idle frame and any reaction settle
  const shot = await page.screenshot();
  await page.close();
  return shot;
}

function serve(route: Route, html: string, shot: Buffer): Promise<void> {
  const { pathname } = new URL(route.request().url());
  if (pathname === '/') return route.fulfill({ body: html, contentType: 'text/html' });
  if (pathname === '/shot.png') return route.fulfill({ body: shot, contentType: 'image/png' });
  const [, prefix = '', ...rest] = pathname.split('/');
  const dir = STATIC[prefix];
  if (!dir) return route.fulfill({ status: 404 });
  return route.fulfill({ path: path.join(ROOT, dir, ...rest) });
}

async function compose(context: BrowserContext, shot: Buffer, n: number, lang: Lang): Promise<void> {
  const slide = SLIDES[n - 1];
  if (!slide) throw new Error(`No copy for slide ${n}`);
  const file = path.join(OUT, lang, `store_${n}.png`);
  mkdirSync(path.dirname(file), { recursive: true });
  const page = await context.newPage();
  await page.setViewportSize(STORE);
  const html = composeHtml(slide, lang);
  await page.route(`${ORIGIN}/**`, (route) => serve(route, html, shot));
  await page.goto(`${ORIGIN}/`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(150);
  await page.screenshot({ path: file });
  await page.close();
}

function shotLang(msg: (key: string) => string): Lang {
  const env = process.env.SHOT_LANG;
  if (env === 'en' || env === 'ja') return env;
  return /^[\x20-\x7e]+$/.test(msg('action_feed')) ? 'en' : 'ja';
}

test('store screenshots @screenshots', async ({ context, extensionId, msg }) => {
  const lang = shotLang(msg);

  let page = await open(context, extensionId, scene({ formId: 'adult_dragon', stage: 'adult' }));
  await page.getByRole('button', { name: `${msg('action_pet')}: ${msg('form_adult_dragon')}` }).click();
  await compose(context, await capture(page), 1, lang);

  page = await open(context, extensionId, scene({ formId: 'child_dango', stage: 'child', stats: { hunger: 40 } }));
  await page.getByRole('button', { name: msg('action_feed'), exact: true }).click();
  await page.locator('.panel__item').first().click();
  await compose(context, await capture(page), 2, lang);

  page = await open(context, extensionId, scene({ formId: 'young_hinoko', stage: 'young' }), true);
  await playCatch(page, msg);
  const catchShot = await capture(page);
  await context.clock.resume(); // the clock is context-wide: let later pages run normally
  await compose(context, catchShot, 3, lang);

  page = await open(context, extensionId, scene({}, NEVER_ASLEEP, DISCOVERED));
  await page.getByRole('button', { name: msg('action_zukan'), exact: true }).click();
  await expect(page.locator('.zukan__cell').first()).toBeVisible();
  await compose(context, await capture(page), 4, lang);

  page = await open(context, extensionId, scene({ asleep: true, lightsOn: false }, ALWAYS_ASLEEP));
  await compose(context, await capture(page), 5, lang);

  copyFileSync(path.join(ROOT, 'public/icon/128.png'), path.join(OUT, 'store_icon_128.png'));
});
