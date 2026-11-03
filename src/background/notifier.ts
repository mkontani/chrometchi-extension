import { NOTIFY_THROTTLE_MS } from '@/core/constants';
import type { GameEvent } from '@/core/types';
import type { t } from '@/i18n/t';
import type { NotifyKind } from '@/storage/schema';
import type { Notifier } from './engine';

export interface NotificationsApi {
  create(
    id: string,
    opts: { type: 'basic'; iconUrl: string; title: string; message: string },
  ): Promise<unknown>;
}

function kindOf(event: GameEvent): NotifyKind | null {
  switch (event.type) {
    case 'hungry':
    case 'unhappy':
    case 'pooped':
    case 'sick':
    case 'hatched':
    case 'evolved':
    case 'died':
    case 'departed':
    case 'fellAsleep':
      return event.type;
    case 'warning':
      return event.level === 'danger' || event.level === 'critical' ? event.level : null;
    default:
      return null;
  }
}

/** Asleep pets stay quiet, except for the one bedtime nudge to turn the lights off. */
function allowed(kind: NotifyKind, asleep: boolean, lightsReminder: boolean): boolean {
  if (kind === 'fellAsleep') return lightsReminder;
  return !asleep;
}

export function createNotifier(
  api: NotificationsApi,
  translate: typeof t,
  iconUrl: string,
): Notifier {
  return {
    async notify(events, { settings, asleep, lightsReminder, now, lastNotified }) {
      if (!settings.notifications) return lastNotified;
      const kinds = new Set<NotifyKind>();
      for (const e of events) {
        const k = kindOf(e);
        if (k && allowed(k, asleep, lightsReminder)) kinds.add(k);
      }
      let updated = lastNotified;
      for (const kind of kinds) {
        if (now - (lastNotified[kind] ?? -Infinity) < NOTIFY_THROTTLE_MS) continue;
        await api.create(`chrometchi-${kind}-${now}`, {
          type: 'basic',
          iconUrl,
          title: translate('appName'),
          message: translate(`notify_${kind}`),
        });
        updated = { ...updated, [kind]: now };
      }
      return updated;
    },
  };
}
