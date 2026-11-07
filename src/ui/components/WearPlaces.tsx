import type { AccessoryId, WearPlace } from '@/core/types';
import { WEAR_PLACES } from '@/data/accessories';
import { t } from '@/i18n/t';

interface Props {
  worn: Partial<Record<WearPlace, AccessoryId>>;
  selected: WearPlace;
  onSelect(place: WearPlace): void;
}

/** One button per place; its name also says what is worn there. */
export function WearPlaces({ worn, selected, onSelect }: Props) {
  return (
    <div class="places">
      {WEAR_PLACES.map((place) => {
        const name = t(`wear_${place}`);
        const item = worn[place];
        return (
          <button
            key={place}
            type="button"
            class="places__btn"
            aria-label={item ? `${name}, ${t(`acc_${item}`)}` : name}
            aria-pressed={place === selected}
            onClick={() => onSelect(place)}
          >
            {name}
          </button>
        );
      })}
    </div>
  );
}
