import { t } from '@/i18n/t';
import { startRoam } from '@/roam/controller';

/**
 * The roaming pet. Registered at runtime by the background only while roaming is on and site
 * access is granted (src/background/roam.ts); `matches` stays empty so WXT adds no host permission.
 */
export default defineContentScript({
  registration: 'runtime',
  matches: [],
  main(ctx) {
    const stop = startRoam({
      doc: document,
      href: location.href,
      storage: { get: (key) => browser.storage.local.get(key), onChanged: browser.storage.onChanged },
      sendMessage: (message) => browser.runtime.sendMessage(message),
      reducedMotion: matchMedia('(prefers-reduced-motion: reduce)'),
      t,
      rng: Math.random,
    });
    ctx.onInvalidated(stop);
  },
});
