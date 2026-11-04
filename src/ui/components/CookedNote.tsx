import { useEffect, useState } from 'preact/hooks';
import type { Cooked } from '@/core/cooking';
import { t } from '@/i18n/t';
import { iconUrl, type IconId } from '@/ui/assets';
import { useLatest } from '@/ui/gameLoop';

export const COOKED_MS = 2500;

interface Props {
  cooked: Cooked | null;
  /** How long the pot effect still has to play before the note shows. */
  delayMs: number;
  onDone(): void;
}

/** 「〇〇 ができた！」 after the pot effect; a new recipe also says 「はじめて！」. */
export function CookedNote({ cooked, delayMs, onDone }: Props) {
  const doneRef = useLatest(onDone);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    setShown(false);
    if (!cooked) return;
    let hide: ReturnType<typeof setTimeout> | undefined;
    const show = setTimeout(() => {
      setShown(true);
      hide = setTimeout(() => doneRef.current(), COOKED_MS);
    }, delayMs);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, [cooked, delayMs]);
  if (!cooked || !shown) return null;
  return (
    <div class="gained-note cooked-note" role="status" onClick={onDone}>
      <div class="cooked-note__row">
        <img src={iconUrl(`food_${cooked.dish}` as IconId) ?? undefined} width={32} height={32} alt="" />
        <p class="gained-note__title">{t('cooked_title', [t(`food_${cooked.dish}`)])}</p>
      </div>
      {cooked.first && <p class="gained-note__title cooked-note__first">{t('cooked_first')}</p>}
    </div>
  );
}
