import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from 'vitest';
import config from '../wxt.config';
import roamScript from './entrypoints/roam.content';
import { ROAM_ORIGINS } from './roam/constants';

type ManifestFn = (env: { mode: string; command: 'build'; browser: string; manifestVersion: 3 }) => Record<string, unknown>;
const manifest = (mode: string) =>
  (config.manifest as ManifestFn)({ mode, command: 'build', browser: 'chrome', manifestVersion: 3 });

const LOCALES_DIR = resolve(__dirname, '../public/_locales');
const LOCALES = readdirSync(LOCALES_DIR);
const messages = (locale: string): Record<string, { message: string } | undefined> =>
  JSON.parse(readFileSync(resolve(LOCALES_DIR, locale, 'messages.json'), 'utf8'));
/** Chrome Web Store limits for the name and the summary (the manifest description). */
const MAX_NAME = 75;
const MAX_SUMMARY = 132;

test('the store name comes from extName; notifications and the toolbar keep the short appName', () => {
  expect(manifest('production')).toMatchObject({
    name: '__MSG_extName__',
    description: '__MSG_appDescription__',
    action: { default_title: '__MSG_appName__' },
  });
});

test.each(LOCALES)('the %s store name starts with the app name and fits the Web Store limits', (locale) => {
  const m = messages(locale);
  const name = m.extName?.message ?? '';
  const summary = m.appDescription?.message ?? '';
  expect(name.startsWith(`${m.appName?.message} - `)).toBe(true);
  expect([...name].length).toBeLessThanOrEqual(MAX_NAME);
  expect(summary).not.toBe('');
  expect([...summary].length).toBeLessThanOrEqual(MAX_SUMMARY);
});

test('manifest requires Chrome 110+ (Array.prototype.toSorted)', () => {
  expect(manifest('production')).toMatchObject({ minimum_chrome_version: '110' });
});

test('production manifest asks for no host access at install', () => {
  const m = manifest('production');
  expect(m.host_permissions).toBeUndefined();
  expect(m.content_scripts).toBeUndefined();
  expect(m.optional_host_permissions).toEqual([...ROAM_ORIGINS]);
  expect(m.permissions).toEqual(['storage', 'alarms', 'notifications', 'idle', 'scripting']);
});

test('only the e2e build declares host access', () => {
  expect(manifest('e2e').host_permissions).toEqual([...ROAM_ORIGINS]);
});

test('the roaming script is registered at runtime with no matches, so installing asks for no host access', () => {
  expect(roamScript.registration).toBe('runtime');
  expect(roamScript.matches).toEqual([]);
});

test('the roaming script does not post its "started" message (with the extension id) to the page', () => {
  expect(roamScript.noScriptStartedPostMessage).toBe(true);
});
