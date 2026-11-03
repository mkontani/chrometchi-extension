import type { BrowserContext, Page } from '@playwright/test';
import { makePet } from '../src/core/__fixtures__/pet';
import { createFreshSave } from '../src/storage/repository';
import type { SaveV1 } from '../src/storage/schema';
import { expect, openPopup, readSave, seedSave, test } from './fixtures';

/**
 * Roaming end to end. Runs on the e2e build, which is granted site access at install
 * (Playwright cannot answer Chrome's permission dialog); the production manifest is pinned by
 * src/manifest.test.ts.
 */
const SITE = 'https://roam.test/';
const PAGE_HTML = `<!doctype html><html><head><title>roam test</title></head>
<body style="margin:0;height:100vh;font:16px sans-serif">
<button id="page-button" style="position:fixed;left:0;bottom:0;width:100%;height:40px"
  onclick="document.title='clicked'">page button</button></body></html>`;

function roamingSave(roam = true): SaveV1 {
  const now = Date.now();
  const base = createFreshSave(now);
  return {
    ...base,
    settings: { ...base.settings, sleepStartMin: 0, sleepEndMin: 0, roam },
    game: { ...base.game, pet: makePet(), lastTickAt: now },
  };
}

/** Seeds the save, then lets the popup's first request make the background register the script. */
async function enableRoaming(context: BrowserContext, extensionId: string): Promise<Page> {
  await seedSave(context, roamingSave());
  const popup = await openPopup(context, extensionId);
  const worker = context.serviceWorkers()[0];
  await expect.poll(async () => (await worker?.evaluate(() => chrome.scripting.getRegisteredContentScripts()))?.length)
    .toBe(1);
  return popup;
}

async function openSite(context: BrowserContext, reducedMotion: 'reduce' | 'no-preference' = 'reduce'): Promise<Page> {
  await context.route(`${SITE}**`, (route) => route.fulfill({ contentType: 'text/html', body: PAGE_HTML }));
  const page = await context.newPage();
  await page.emulateMedia({ reducedMotion });
  await page.goto(SITE);
  return page;
}

const roamPet = (page: Page) => page.locator('chrometchi-roam .pet');

test('the pet walks on web pages once roaming is on', async ({ context, extensionId }) => {
  await enableRoaming(context, extensionId);
  const page = await openSite(context, 'no-preference');
  await expect(roamPet(page)).toBeVisible();
  await expect.poll(() => roamPet(page).locator('img').getAttribute('src')).toMatch(/^data:image\/png;base64,/);

  // The page's own button still works away from the 64px pet.
  const pet = await roamPet(page).boundingBox();
  const viewport = page.viewportSize();
  expect(pet && viewport).toBeTruthy();
  const x = pet!.x > viewport!.width / 2 ? 20 : viewport!.width - 20;
  await page.mouse.click(x, viewport!.height - 10);
  await expect(page).toHaveTitle('clicked');
});

test('clicking the pet shows its mood and can hide it on this site', async ({ context, extensionId, msg }) => {
  await enableRoaming(context, extensionId);
  const page = await openSite(context);
  await roamPet(page).click();
  await expect(page.locator('chrometchi-roam .say')).toHaveText(msg('roam_say_happy'));
  await page.locator('chrometchi-roam .hide').click();
  await expect(roamPet(page)).toHaveCount(0);
  await expect.poll(async () => (await readSave(context)).settings.roamHiddenSites).toEqual(['roam.test']);
});

test('turning roaming off in the popup removes the pet from open pages', async ({ context, extensionId, msg }) => {
  const popup = await enableRoaming(context, extensionId);
  const page = await openSite(context);
  await expect(roamPet(page)).toBeVisible();
  await popup.getByRole('button', { name: msg('action_settings'), exact: true }).click();
  await popup.getByLabel(msg('settings_roam')).click();
  await expect(roamPet(page)).toHaveCount(0);
  expect((await readSave(context)).settings.roam).toBe(false);
});
