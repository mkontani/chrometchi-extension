import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { t } from '@/i18n/t';

const NOTE_MS = 2500;

/** The message that says where a bought thing goes. */
export type BoughtKey = 'shop_bought' | 'shop_bought_acc';

/** The hint that is up (null when none), and a way to raise one for a moment. A new call restarts the time. */
export function useBoughtNote(): [BoughtKey | null, (key: BoughtKey) => void] {
  const [shown, setShown] = useState<BoughtKey | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearTimeout(timer.current);
    };
  }, []);
  const flash = useCallback((key: BoughtKey) => {
    if (!mounted.current) return;
    clearTimeout(timer.current);
    setShown(key);
    timer.current = setTimeout(() => setShown(null), NOTE_MS);
  }, []);
  return [shown, flash];
}

/** A brief hint after a successful buy: where to place or put on what was bought. */
export function BoughtNote({ shown }: { shown: BoughtKey | null }) {
  return shown ? (
    <div class="toast" role="status">
      {t(shown)}
    </div>
  ) : null;
}
