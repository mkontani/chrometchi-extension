import { createTickAlarm, ensureTickAlarm, TICK_ALARM } from '@/background/alarms';
import { createBadge } from '@/background/badge';
import { createEngine } from '@/background/engine';
import { createMessageListener } from '@/background/listener';
import { createNotifier } from '@/background/notifier';
import { createRoamManager, roamHandlers } from '@/background/roam';
import { createDataUrlReader, createFrameLoader } from '@/background/roamFrames';
import { t } from '@/i18n/t';
import { createSaveRepository } from '@/storage/repository';
import { SAVE_KEY } from '@/storage/schema';

export default defineBackground(() => {
  const reportError = (err: unknown, context: string): void =>
    console.error(`[chrometchi] ${context}`, err);

  const repo = createSaveRepository(browser.storage.local, Date.now);
  const engine = createEngine({
    repo,
    now: Date.now,
    rng: Math.random,
    queryIdle: () => browser.idle.queryState(60),
    notifier: createNotifier(browser.notifications, t, browser.runtime.getURL('/icon/128.png')),
    badge: createBadge(browser.action),
    reportError,
  });

  ensureTickAlarm(browser.alarms).catch((err: unknown) => reportError(err, 'ensure tick alarm'));
  const createAlarm = () => {
    createTickAlarm(browser.alarms).catch((err: unknown) => reportError(err, 'create tick alarm'));
  };
  browser.runtime.onInstalled.addListener(createAlarm);
  browser.runtime.onStartup.addListener(createAlarm);

  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name !== TICK_ALARM) return;
    engine.tick().catch((err: unknown) => reportError(err, 'tick'));
  });

  const roam = roamHandlers(
    createRoamManager({
      scripting: {
        getRegisteredContentScripts: (filter) => browser.scripting.getRegisteredContentScripts(filter),
        registerContentScripts: (scripts) => browser.scripting.registerContentScripts(scripts),
        unregisterContentScripts: (filter) => browser.scripting.unregisterContentScripts(filter),
        // WXT types `files` as its generated PublicPath union; ROAM_SCRIPT_FILE is one of them at runtime.
        executeScript: (injection) =>
          browser.scripting.executeScript(injection as Parameters<typeof browser.scripting.executeScript>[0]),
      },
      permissions: browser.permissions,
      tabs: browser.tabs,
      reportError,
    }),
    engine,
    reportError,
  );
  browser.permissions.onAdded.addListener(roam.onPermissionAdded);
  browser.permissions.onRemoved.addListener(roam.onPermissionRemoved);
  // Re-check the registration whenever the worker starts, reading (never writing) the save.
  browser.storage.local
    .get(SAVE_KEY)
    .then((got) => roam.startup(got[SAVE_KEY]))
    .catch((err: unknown) => reportError(err, 'startup roam sync'));

  const frames = createFrameLoader({
    load: () => repo.load(),
    toDataUrl: createDataUrlReader(
      (url) => fetch(url),
      (path) => browser.runtime.getURL(path as Parameters<typeof browser.runtime.getURL>[0]),
    ),
  });
  browser.runtime.onMessage.addListener(createMessageListener(engine, browser.runtime.id, roam.afterHandle, frames));
});
