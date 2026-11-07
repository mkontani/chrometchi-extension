import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { t } from '@/i18n/t';

const NOTE_MS = 2500;

/** Whether the bought hint is up, and a way to raise it for a moment. A new call restarts the time. */
export function useBoughtNote(): [boolean, () => void] {
  const [shown, setShown] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const flash = useCallback(() => {
    clearTimeout(timer.current);
    setShown(true);
    timer.current = setTimeout(() => setShown(false), NOTE_MS);
  }, []);
  return [shown, flash];
}

/** A brief hint after a successful buy: where to place the new furniture. */
export function BoughtNote({ shown }: { shown: boolean }) {
  return shown ? (
    <div class="toast" role="status">
      {t('shop_bought')}
    </div>
  ) : null;
}
