import type { FoodId } from '@/core/types';
import { FOODS } from '@/data/foods';
import { t } from '@/i18n/t';
import { iconUrl } from '@/ui/assets';
import { Panel } from './Panel';

interface Props {
  onPick(food: FoodId): void;
  onClose(): void;
}

export function FoodPanel({ onPick, onClose }: Props) {
  return (
    <Panel title={t('panel_food_title')} onClose={onClose}>
      <div class="panel__grid panel__grid--food">
        {FOODS.map((f) => {
          const url = iconUrl(`food_${f.id}`);
          return (
            <button key={f.id} type="button" class="panel__item" onClick={() => onPick(f.id)}>
              {url ? <img src={url} width={32} height={32} alt="" /> : null}
              <span>{t(`food_${f.id}`)}</span>
              <small class={`panel__tag panel__tag--${f.kind}`}>{t(`food_kind_${f.kind}`)}</small>
            </button>
          );
        })}
      </div>
    </Panel>
  );
}
