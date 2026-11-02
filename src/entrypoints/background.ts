import { createBadge } from '@/background/badge';
import { createEngine } from '@/background/engine';
import { createMessageListener } from '@/background/listener';
import { createNotifier } from '@/background/notifier';
import { t } from '@/i18n/t';
import { createSaveRepository } from '@/storage/repository';

const TICK_ALARM = 'tick';

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

  const ensureAlarm = () => {
    void browser.alarms.create(TICK_ALARM, { periodInMinutes: 1 });
  };
  browser.runtime.onInstalled.addListener(ensureAlarm);
  browser.runtime.onStartup.addListener(ensureAlarm);

  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name !== TICK_ALARM) return;
    engine.tick().catch((err: unknown) => reportError(err, 'tick'));
  });

  browser.runtime.onMessage.addListener(createMessageListener(engine, browser.runtime.id));
});
