import { useEffect } from 'preact/hooks';
import type { FoodId, Gained } from '@/core/types';
import { t } from '@/i18n/t';
import { iconUrl, type IconId } from '@/ui/assets';
import { useLatest } from '@/ui/gameLoop';

export const GAINED_MS = 2500;

interface Props {
  gained: Gained | null;
  onDone(): void;
}

/** The foods with a positive count, in the order the engine reported them. */
const itemsOf = (gained: Gained | null): [FoodId, number][] =>
  Object.entries(gained ?? {}).filter((e): e is [FoodId, number] => (e[1] ?? 0) > 0);

export function GainedNote({ gained, onDone }: Props) {
  const items = itemsOf(gained);
  const doneRef = useLatest(onDone);
  const shown = items.length > 0;
  useEffect(() => {
    if (!shown) return;
    const timer = setTimeout(() => doneRef.current(), GAINED_MS);
    return () => clearTimeout(timer);
  }, [gained, shown]);
  if (!shown) return null;
  return (
    <div class="gained-note" role="status" onClick={onDone}>
      <p class="gained-note__title">{t('gained_title')}</p>
      <ul class="gained-note__list">
        {items.map(([food, count]) => (
          <li key={food} class="gained-note__row">
            <img src={iconUrl(`food_${food}` as IconId) ?? undefined} width={32} height={32} alt="" />
            <span>{t(`food_${food}`)}</span>
            <span>{`×${count}`}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
