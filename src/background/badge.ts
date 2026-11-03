import type { Badge } from './engine';

export interface BadgeApi {
  setBadgeText(details: { text: string }): Promise<void>;
  setBadgeBackgroundColor(details: { color: string }): Promise<void>;
}

const CRITICAL_COLOR = '#e53935';

export function createBadge(api: BadgeApi): Badge {
  return {
    async update(level) {
      if (level === 'critical') {
        await api.setBadgeBackgroundColor({ color: CRITICAL_COLOR });
        await api.setBadgeText({ text: '!' });
      } else {
        await api.setBadgeText({ text: '' });
      }
    },
  };
}
