import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test as base, chromium, expect, type BrowserContext, type Page } from '@playwright/test';
import { SAVE_KEY, type SaveV1 } from '../src/storage/schema';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
/** E2E_EXTENSION_PATH lets `npm run screenshots` load a single-language copy of the build. */
const EXTENSION_PATH = process.env.E2E_EXTENSION_PATH ?? path.join(ROOT, '.output/chrome-mv3-e2e');

type Msg = (key: string) => string;

interface Fixtures {
  context: BrowserContext;
  extensionId: string;
  popup: Page;
  /** Localized UI string as the extension itself resolves it (en or ja), so tests are locale-proof. */
  msg: Msg;
}

async function getServiceWorker(context: BrowserContext) {
  return context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
}

export async function seedSave(context: BrowserContext, save: SaveV1): Promise<void> {
  const worker = await getServiceWorker(context);
  await worker.evaluate((s) => chrome.storage.local.set({ 'chrometchi:v1': s }), save);
}

export async function readSave(context: BrowserContext): Promise<SaveV1> {
  const worker = await getServiceWorker(context);
  const got = await worker.evaluate((key) => chrome.storage.local.get(key), SAVE_KEY);
  return got[SAVE_KEY] as SaveV1;
}

export async function openPopup(context: BrowserContext, extensionId: string): Promise<Page> {
  const page = await context.newPage();
  await page.setViewportSize({ width: 420, height: 640 });
  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  return page;
}

const ENGLISH_MESSAGES = path.join(ROOT, 'public/_locales/en/messages.json');

function messageKeys(): string[] {
  return Object.keys(JSON.parse(readFileSync(ENGLISH_MESSAGES, 'utf8')));
}

export const test = base.extend<Fixtures>({
  msg: async ({ context }, use) => {
    const worker = await getServiceWorker(context);
    const messages = await worker.evaluate(
      (keys) => Object.fromEntries(keys.map((k) => [k, chrome.i18n.getMessage(k)])),
      messageKeys(),
    );
    await use((key) => {
      const text = messages[key];
      if (!text) throw new Error(`Missing locale message: ${key}`);
      return text;
    });
  },
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      locale: 'en-US',
      args: [
        '--lang=en-US',
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
      ],
    });
    await use(context);
    await context.close();
  },
  extensionId: async ({ context }, use) => {
    const worker = await getServiceWorker(context);
    await use(new URL(worker.url()).host);
  },
  popup: async ({ context, extensionId }, use) => {
    await use(await openPopup(context, extensionId));
  },
});

export { expect };
