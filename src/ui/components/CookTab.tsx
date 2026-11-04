import type { Pantry } from '@/core/types';
import { POT_MAX } from '@/core/cooking';
import { stockOf } from '@/core/pantry';
import { FOODS } from '@/data/foods';
import { POT_ITEMS, type PotItem } from '@/data/recipes';
import { t } from '@/i18n/t';
import { iconUrl } from '@/ui/assets';
import { useScrollCue } from '@/ui/useScrollCue';

interface Props {
  pantry: Pantry;
  pot: readonly PotItem[];
  onPot(next: readonly PotItem[]): void;
  onCook(items: readonly PotItem[]): void;
}

/** One food row (item plus gap), the step the cue scrolls by. */
const FOOD_ROW_PX = 50;

const countLabel = (n: number) => (n === Infinity ? '∞' : `×${n}`);
const POT_FOODS = POT_ITEMS.map((id) => FOODS.find((f) => f.id === id)!);
const SLOT_INDEXES = Array.from({ length: POT_MAX }, (_, i) => i);

/** The pot (4 slots and the cook button) above the ingredients that can go in it. */
export function CookTab({ pantry, pot, onPot, onCook }: Props) {
  const [listRef, more] = useScrollCue<HTMLDivElement>();
  const inPot = (item: PotItem) => pot.filter((p) => p === item).length;
  const left = (item: PotItem) => stockOf(pantry, item) - inPot(item);
  const add = (item: PotItem) => onPot([...pot, item]);
  const removeAt = (index: number) => onPot(pot.filter((_, i) => i !== index));
  return (
    <>
      <div class="cook__pot" role="group" aria-label={t('cook_pot')}>
        {SLOT_INDEXES.map((i) => {
          const item = pot[i];
          const url = item ? iconUrl(`food_${item}`) : null;
          return item ? (
            <button
              key={i}
              type="button"
              class="cook__slot cook__slot--filled"
              aria-label={t(`food_${item}`)}
              onClick={() => removeAt(i)}
            >
              {url ? <img src={url} width={24} height={24} alt="" /> : null}
            </button>
          ) : (
            <span key={i} class="cook__slot" aria-hidden="true" />
          );
        })}
        {pot.length === 0 && <small class="cook__hint">{t('cook_pot_empty')}</small>}
        <button type="button" class="cook__make" disabled={pot.length === 0} onClick={() => onCook(pot)}>
          {t('cook_make')}
        </button>
      </div>
      <div class="panel__list">
        <div class="panel__grid panel__grid--food panel__grid--cook" ref={listRef}>
          {POT_FOODS.map((f) => {
            const url = iconUrl(`food_${f.id}`);
            const id = f.id as PotItem;
            return (
              <button
                key={f.id}
                type="button"
                class="panel__item panel__item--row"
                disabled={left(id) <= 0 || pot.length >= POT_MAX}
                onClick={() => add(id)}
              >
                {url ? <img src={url} width={32} height={32} alt="" /> : null}
                <span class="panel__text">
                  <span>{t(`food_${f.id}`)}</span>
                  <small class="panel__count">{countLabel(left(id))}</small>
                </span>
              </button>
            );
          })}
        </div>
        {more && (
          <button
            type="button"
            class="panel__more"
            aria-hidden="true"
            tabIndex={-1}
            onClick={() => listRef.current?.scrollBy({ top: FOOD_ROW_PX })}
          >
            ▼
          </button>
        )}
      </div>
    </>
  );
}
