import type { BrowserContext, Page } from '@playwright/test';
import { makePet, type PetOverrides } from '../src/core/__fixtures__/pet';
import { createFreshSave } from '../src/storage/repository';
import type { SaveV1 } from '../src/storage/schema';
import { SAVE_KEY } from '../src/storage/schema';
import { expect, openPopup, readSave, seedSave, test } from './fixtures';

/** Sleep window is identical (never asleep) so tests do not depend on the local time of day. */
function seed(pet: PetOverrides | null, lastTickOffsetMs = 0): SaveV1 {
  const now = Date.now();
  const base = createFreshSave(now);
  return {
    ...base,
    settings: { ...base.settings, sleepStartMin: 0, sleepEndMin: 0 },
    game: {
      ...base.game,
      ...(pet ? { pet: makePet(pet) } : {}),
      lastTickAt: now + lastTickOffsetMs,
    },
  };
}

async function seedAndOpen(context: BrowserContext, extensionId: string, save: SaveV1) {
  await seedSave(context, save);
  return openPopup(context, extensionId);
}

/** The pet button's accessible name includes the current form, e.g. "Pet: Egg". */
const petButton = (page: Page, msg: (key: string) => string, formKey: string) =>
  page.getByRole('button', { name: `${msg('action_pet')}: ${msg(formKey)}`, exact: true });

const fullHearts = (page: Page, label: string) =>
  page.getByRole('img', { name: label, exact: true }).locator('.heart--full').count();

/** The stage is 352x272 content + 3px border and must never shrink under panels or banners. */
const STAGE_PX = { width: 358, height: 278 };
const stageBox = async (page: Page) => {
  const box = await page.locator('.stage').boundingBox();
  return box && { width: Math.round(box.width), height: Math.round(box.height) };
};

test('fresh install shows an egg', async ({ popup, msg }) => {
  await expect(petButton(popup, msg, 'form_egg')).toHaveAttribute('alt', msg('form_egg'));
});

test('egg hatches when its last minute elapses', async ({ context, extensionId, msg }) => {
  const save = seed({ formId: 'egg', stage: 'egg', stageMinutes: 29, path: ['egg'] }, -61_000);
  const page = await seedAndOpen(context, extensionId, save);
  await expect(petButton(page, msg, 'form_baby_puni')).toHaveAttribute('alt', msg('form_baby_puni'));
});

test('feeding rice increases hunger hearts', async ({ context, extensionId, msg }) => {
  const save = seed({ stats: { hunger: 20 } });
  const page = await seedAndOpen(context, extensionId, save);
  await expect(page.getByRole('button', { name: msg('action_feed'), exact: true })).toBeEnabled();
  const before = await fullHearts(page, msg('stat_hunger'));
  await page.getByRole('button', { name: msg('action_feed'), exact: true }).click();
  await expect(page.locator('.panel')).toBeVisible();
  expect(await stageBox(page)).toEqual(STAGE_PX);
  await page.locator('.panel__item').first().click(); // rice is the first food
  await expect.poll(() => fullHearts(page, msg('stat_hunger'))).toBeGreaterThan(before);
});

test('stop mini-game can be played to completion', async ({ context, extensionId, msg }) => {
  const page = await seedAndOpen(context, extensionId, seed({}));
  await page.getByRole('button', { name: msg('action_play'), exact: true }).click();
  await page.getByRole('button', { name: new RegExp(msg('game_stop')) }).click();
  await expect(page.getByRole('dialog', { name: msg('game_stop'), exact: true })).toBeVisible();
  await expect(page.locator('canvas.minigame__canvas')).toBeVisible();
  // Wait until the host has attached its input listeners and loop, then play exactly 5 tries.
  await expect(page.locator('.minigame__frame[data-ready="true"]')).toBeVisible();
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('Space');
    await page.waitForTimeout(800); // clears the 600 ms pause after each try
  }
  await expect(page.locator('.minigame__result')).toBeVisible();
  await expect(petButton(page, msg, 'form_baby_puni')).toBeVisible();
  await expect
    .poll(async () => (await readSave(context)).game.pet.history.gameCounts.stop)
    .toBe(1);
});

test('zukan opens and lists discovered forms', async ({ popup, msg }) => {
  await popup.getByRole('button', { name: msg('action_zukan'), exact: true }).click();
  await expect(popup.getByText(msg('zukan_title'), { exact: true })).toBeVisible();
  await expect(popup.locator('.zukan__cell').first()).toBeVisible();
  await expect(popup.locator('.zukan__name', { hasText: msg('form_egg') })).toBeVisible();
});

test('restart asks for confirmation', async ({ context, extensionId, msg }) => {
  const page = await seedAndOpen(context, extensionId, seed({}));
  await page.getByRole('button', { name: msg('action_settings'), exact: true }).click();
  await page.getByRole('button', { name: msg('settings_restart'), exact: true }).click();
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toBeVisible();

  await dialog.getByRole('button', { name: msg('confirm_no'), exact: true }).click();
  await expect(dialog).toBeHidden();
  expect((await readSave(context)).game.generation).toBe(1);

  await page.getByRole('button', { name: msg('settings_restart'), exact: true }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: msg('confirm_yes'), exact: true }).click();
  await expect.poll(async () => (await readSave(context)).game.generation).toBe(2);
});

test('critical state shows banner and stamps criticalSeenAt', async ({ context, extensionId, msg }) => {
  const page = await seedAndOpen(context, extensionId, seed({ stats: { vitality: 20 } }));
  await expect(page.getByRole('alert').filter({ hasText: msg('critical_banner') })).toBeVisible();
  await page.getByRole('button', { name: msg('action_feed'), exact: true }).click();
  await expect(page.locator('.panel')).toBeVisible();
  expect(await stageBox(page)).toEqual(STAGE_PX); // banner + panel together must not squeeze it
  await expect
    .poll(async () => (await readSave(context)).game.pet.criticalSeenAt)
    .not.toBeNull();
});

test('legacy save shows renewal notice', async ({ context, extensionId, msg }) => {
  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
  await worker.evaluate(
    async (key) => {
      await chrome.storage.local.set({ chrometchiState: { stage: 'egg' } });
      await chrome.storage.local.remove(key);
    },
    SAVE_KEY,
  );
  const page = await openPopup(context, extensionId);
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText(msg('notice_renewal'));
  await dialog.getByRole('button', { name: msg('ok'), exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect.poll(async () => (await readSave(context)).meta.showRenewal).toBe(false);
});

test('a failed request shows its error inside the popup without squashing the layout', async ({ context, extensionId, msg }) => {
  const page = await seedAndOpen(context, extensionId, seed({ formId: 'baby_puni', stage: 'baby' }));
  const popupSize = { width: 360, height: 462 };
  await page.setViewportSize(popupSize);
  await expect(petButton(page, msg, 'form_baby_puni')).toBeVisible();
  const statusBefore = await page.locator('.status-bar').boundingBox();
  await page.evaluate(() => {
    Object.defineProperty(chrome.runtime, 'sendMessage', {
      configurable: true,
      value: () => Promise.reject(new Error('worker unavailable')),
    });
  });
  await petButton(page, msg, 'form_baby_puni').click();
  const alert = page.getByRole('alert');
  await expect(alert).toBeVisible();
  const box = await alert.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(popupSize.height);
  expect((await page.locator('.status-bar').boundingBox())?.height).toBe(statusBefore?.height);
});
