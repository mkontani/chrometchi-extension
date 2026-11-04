import type { FoodId, Pantry } from '@/core/types';
import { stockOf } from '@/core/pantry';
import { FOODS } from '@/data/foods';
import { t } from '@/i18n/t';
import { iconUrl } from '@/ui/assets';
import { useScrollCue } from '@/ui/useScrollCue';
import { Panel } from './Panel';

interface Props {
  pantry: Pantry;
  onPick(food: FoodId): void;
  onClose(): void;
}

/** One food row (item plus gap), the step the cue scrolls by. */
const FOOD_ROW_PX = 50;

const countLabel = (n: number) => (n === Infinity ? '∞' : `×${n}`);

export function FoodPanel({ pantry, onPick, onClose }: Props) {
  const [listRef, more] = useScrollCue<HTMLDivElement>();
  return (
    <Panel title={t('panel_food_title')} onClose={onClose}>
      <div class="panel__list">
        <div class="panel__grid panel__grid--food" ref={listRef}>
          {FOODS.map((f) => {
            const url = iconUrl(`food_${f.id}`);
            const stock = stockOf(pantry, f.id);
            return (
              <button
                key={f.id}
                type="button"
                class="panel__item panel__item--row"
                disabled={stock === 0}
                onClick={() => onPick(f.id)}
              >
                {url ? <img src={url} width={32} height={32} alt="" /> : null}
                <span class="panel__text">
                  <span>{t(`food_${f.id}`)}</span>
                  <span class="panel__meta">
                    <small class={`panel__tag panel__tag--${f.kind}`}>{t(`food_kind_${f.kind}`)}</small>
                    <small class="panel__count">{countLabel(stock)}</small>
                  </span>
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
    </Panel>
  );
}
