import { expect, test } from 'vitest';
import config from '../wxt.config';
import roamScript from './entrypoints/roam.content';
import { ROAM_ORIGINS } from './roam/constants';

type ManifestFn = (env: { mode: string; command: 'build'; browser: string; manifestVersion: 3 }) => Record<string, unknown>;
const manifest = (mode: string) =>
  (config.manifest as ManifestFn)({ mode, command: 'build', browser: 'chrome', manifestVersion: 3 });

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
