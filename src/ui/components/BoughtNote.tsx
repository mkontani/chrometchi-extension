import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { t } from '@/i18n/t';

const NOTE_MS = 2500;

/** The message that says where a bought thing goes. */
export type BoughtKey = 'shop_bought' | 'shop_bought_acc';

/** The hint that is up (null when none), a way to raise one for a moment (a new call restarts the time), and a way to drop it at once. */
export function useBoughtNote(): [BoughtKey | null, (key: BoughtKey) => void, () => void] {
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
  const clear = useCallback(() => {
    if (!mounted.current) return;
    clearTimeout(timer.current);
    setShown(null);
  }, []);
  return [shown, flash, clear];
}

/** A line under the shop tabs for the hint after a buy. It is always there (empty when idle), so it is a live region before its text changes and the list never jumps. */
export function BoughtNote({ shown }: { shown: BoughtKey | null }) {
  return (
    <p class="shop__note" role="status">
      {shown ? t(shown) : ''}
    </p>
  );
}
