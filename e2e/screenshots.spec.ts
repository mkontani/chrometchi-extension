import { copyFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { BrowserContext, Page, Route } from '@playwright/test';
import { makePet, type PetOverrides } from '../src/core/__fixtures__/pet';
import type { FormId } from '../src/core/types';
import { createFreshSave } from '../src/storage/repository';
import type { SaveV1 } from '../src/storage/schema';
import { expect, openPopup, seedSave, test } from './fixtures';
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

async function open(context: BrowserContext, extensionId: string, save: SaveV1): Promise<Page> {
  await seedSave(context, save);
  const page = await openPopup(context, extensionId);
  await page.setViewportSize({ width: POPUP.width, height: POPUP.height });
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: POPUP.width, height: POPUP.height, deviceScaleFactor: POPUP.captureScale, mobile: false,
  });
  await expect(page.locator('.stage, .zukan').first()).toBeVisible();
  return page;
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

  page = await open(context, extensionId, scene({ formId: 'young_hinoko', stage: 'young' }));
  await page.getByRole('button', { name: msg('action_play'), exact: true }).click();
  await page.getByRole('button', { name: new RegExp(msg('game_catch')) }).click();
  await expect(page.locator('.minigame__frame[data-ready="true"]')).toBeVisible();
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(2500);
  await compose(context, await capture(page), 3, lang);

  page = await open(context, extensionId, scene({}, NEVER_ASLEEP, DISCOVERED));
  await page.getByRole('button', { name: msg('action_zukan'), exact: true }).click();
  await expect(page.locator('.zukan__cell').first()).toBeVisible();
  await compose(context, await capture(page), 4, lang);

  page = await open(context, extensionId, scene({ asleep: true, lightsOn: false }, ALWAYS_ASLEEP));
  await compose(context, await capture(page), 5, lang);

  copyFileSync(path.join(ROOT, 'public/icon/128.png'), path.join(OUT, 'store_icon_128.png'));
});
