import { createTickAlarm, ensureTickAlarm, TICK_ALARM } from '@/background/alarms';
import { createBadge } from '@/background/badge';
import { createEngine } from '@/background/engine';
import { createMessageListener } from '@/background/listener';
import { createNotifier } from '@/background/notifier';
import { t } from '@/i18n/t';
import { createSaveRepository } from '@/storage/repository';

export default defineBackground(() => {
  const reportError = (err: unknown, context: string): void =>
    console.error(`[chrometchi] ${context}`, err);

  const engine = createEngine({
    repo: createSaveRepository(browser.storage.local, Date.now),
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

  browser.runtime.onMessage.addListener(createMessageListener(engine, browser.runtime.id));
});
