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

const fullHearts = (page: Page, label: string) =>
  page.getByRole('img', { name: label, exact: true }).locator('.heart--full').count();

test('fresh install shows an egg', async ({ popup, msg }) => {
  await expect(popup.getByRole('button', { name: msg('action_pet'), exact: true })).toHaveAttribute('alt', msg('form_egg'));
});

test('egg hatches when its last minute elapses', async ({ context, extensionId, msg }) => {
  const save = seed({ formId: 'egg', stage: 'egg', stageMinutes: 29, path: ['egg'] }, -61_000);
  const page = await seedAndOpen(context, extensionId, save);
  await expect(page.getByRole('button', { name: msg('action_pet'), exact: true })).toHaveAttribute('alt', msg('form_baby_puni'));
});

test('feeding rice increases hunger hearts', async ({ context, extensionId, msg }) => {
  const save = seed({ stats: { hunger: 20 } });
  const page = await seedAndOpen(context, extensionId, save);
  await expect(page.getByRole('button', { name: msg('action_feed'), exact: true })).toBeEnabled();
  const before = await fullHearts(page, msg('stat_hunger'));
  await page.getByRole('button', { name: msg('action_feed'), exact: true }).click();
  await page.locator('.panel__item').first().click(); // rice is the first food
  await expect.poll(() => fullHearts(page, msg('stat_hunger'))).toBeGreaterThan(before);
});

test('stop mini-game can be played to completion', async ({ context, extensionId, msg }) => {
  const page = await seedAndOpen(context, extensionId, seed({}));
  await page.getByRole('button', { name: msg('action_play'), exact: true }).click();
  await page.getByRole('button', { name: new RegExp(msg('game_stop')) }).click();
  await expect(page.locator('canvas.minigame__canvas')).toBeVisible();
  // 5 tries; each hit/miss pauses 600 ms. Press until the result shows (tolerates a lost first key).
  const result = page.locator('.minigame__result');
  for (let i = 0; i < 8 && !(await result.isVisible()); i++) {
    await page.keyboard.press('Space');
    await page.waitForTimeout(800);
  }
  await expect(result).toBeVisible();
  await page.waitForTimeout(1_500);
  await expect(page.getByRole('button', { name: msg('action_pet'), exact: true })).toBeVisible();
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
