import { useEffect, useRef, useState } from 'preact/hooks';
import type { CareOutcome } from '@/core/types';
import { t } from '@/i18n/t';

const NOTE_MS = 2500;

/** A brief hint after a successful buy: where to place the new furniture. */
export function BoughtNote({ outcome }: { outcome: CareOutcome | null }) {
  const [shown, setShown] = useState(false);
  // The outcome already there when the shop opens is an old buy, not a new one.
  const stale = useRef(outcome);
  useEffect(() => {
    if (outcome === stale.current) return undefined;
    if (outcome?.action !== 'buy' || outcome.result !== 'ok') {
      setShown(false);
      return undefined;
    }
    setShown(true);
    const id = setTimeout(() => setShown(false), NOTE_MS);
    return () => clearTimeout(id);
  }, [outcome]);
  return shown ? (
    <div class="toast" role="status">
      {t('shop_bought')}
    </div>
  ) : null;
}
