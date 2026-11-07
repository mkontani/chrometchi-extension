import type { AccessoryId, WearPlace } from '@/core/types';
import { accessoryDef } from '@/data/accessories';
import { t } from '@/i18n/t';
import { accUrl } from '@/ui/assets';
import { ScrollList } from './ScrollList';

interface Props {
  owned: readonly AccessoryId[];
  /** the place being dressed */
  place: WearPlace;
  worn: Partial<Record<WearPlace, AccessoryId>>;
  /** an item to put on, or null to take the current one off */
  onWear(acc: AccessoryId | null): void;
}

function Item({ id, pressed, onWear }: { id: AccessoryId; pressed: boolean; onWear(acc: AccessoryId): void }) {
  const url = accUrl(id);
  const size = accessoryDef(id).size;
  const name = t(`acc_${id}`);
  return (
    <li class="picker__cell">
      <button type="button" class="picker__btn" aria-label={name} aria-pressed={pressed} onClick={() => (pressed ? undefined : onWear(id))}>
        {url ? <img src={url} width={size} height={size} alt="" /> : null}
        <span class="picker__name">{name}</span>
      </button>
    </li>
  );
}

/** The owned accessories that fit the chosen place, and a way to take the current one off. */
export function DressPicker({ owned, place, worn, onWear }: Props) {
  const fitting = owned.filter((id) => accessoryDef(id).place === place);
  const current = worn[place] ?? null;
  return (
    <div class="picker">
      {fitting.length === 0 && <p class="picker__empty">{t('dress_empty')}</p>}
      <ScrollList class="picker__list">
        {fitting.map((id) => (
          <Item key={id} id={id} pressed={id === current} onWear={onWear} />
        ))}
      </ScrollList>
      {current !== null && (
        <button type="button" class="picker__remove" onClick={() => onWear(null)}>
          {t('dress_remove')}
        </button>
      )}
    </div>
  );
}
