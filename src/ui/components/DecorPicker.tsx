import type { DecorId, SlotKind } from '@/core/types';
import { decorDef } from '@/data/decor';
import { t } from '@/i18n/t';
import { decorUrl } from '@/ui/assets';
import { ScrollList } from './ScrollList';

interface Props {
  owned: readonly DecorId[];
  /** the kind of the selected slot */
  slotKind: SlotKind;
  /** the item in the selected slot */
  placed: DecorId | null;
  /** an item to put there, or null to take the current one off */
  onPlace(decor: DecorId | null): void;
}

function Item({ id, pressed, onPlace }: { id: DecorId; pressed: boolean; onPlace(decor: DecorId): void }) {
  const url = decorUrl(id);
  const size = decorDef(id).size;
  const name = t(`decor_${id}`);
  return (
    <li class="picker__cell">
      <button type="button" class="picker__btn" aria-label={name} aria-pressed={pressed} onClick={() => (pressed ? undefined : onPlace(id))}>
        {url ? <img src={url} width={size} height={size} alt="" /> : null}
        <span class="picker__name">{name}</span>
      </button>
    </li>
  );
}

/** The owned furniture that fits the selected slot, and a way to take the current piece off. */
export function DecorPicker({ owned, slotKind, placed, onPlace }: Props) {
  const fitting = owned.filter((id) => decorDef(id).slot === slotKind);
  return (
    <div class="picker">
      {fitting.length === 0 && <p class="picker__empty">{t('decor_empty')}</p>}
      <ScrollList class="picker__list">
        {fitting.map((id) => (
          <Item key={id} id={id} pressed={id === placed} onPlace={onPlace} />
        ))}
      </ScrollList>
      {placed !== null && (
        <button type="button" class="picker__remove" onClick={() => onPlace(null)}>
          {t('decor_remove')}
        </button>
      )}
    </div>
  );
}
