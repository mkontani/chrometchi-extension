import { useState } from 'preact/hooks';
import type { FoodId, Pantry } from '@/core/types';
import { stockOf } from '@/core/pantry';
import { FOODS, isDish } from '@/data/foods';
import type { PotItem } from '@/data/recipes';
import { t } from '@/i18n/t';
import { iconUrl } from '@/ui/assets';
import { useScrollCue } from '@/ui/useScrollCue';
import { CookTab } from './CookTab';
import { Panel } from './Panel';
import { TabBar } from './TabBar';

interface Props {
  pantry: Pantry;
  onPick(food: FoodId): void;
  onCook(items: readonly PotItem[]): void;
  onClose(): void;
}

/** One food row (item plus gap), the step the cue scrolls by. */
const FOOD_ROW_PX = 50;

type Tab = 'eat' | 'cook';
const tabDefs = (): readonly { id: Tab; label: string }[] =>
  (['eat', 'cook'] as const).map((id) => ({ id, label: t(`tab_${id}`) }));

const countLabel = (n: number) => (n === Infinity ? '∞' : `×${n}`);

function EatTab({ pantry, onPick }: Pick<Props, 'pantry' | 'onPick'>) {
  const [listRef, more] = useScrollCue<HTMLDivElement>();
  // Dishes you have none of stay hidden; ingredients stay, disabled at ×0.
  const shown = FOODS.filter((f) => !isDish(f.id) || stockOf(pantry, f.id) > 0);
  return (
    <div class="panel__list">
      <div class="panel__grid panel__grid--food" ref={listRef}>
        {shown.map((f) => {
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
  );
}

export function FoodPanel({ pantry, onPick, onCook, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('eat');
  // The pot lives here so it survives a switch of tab and is emptied when the panel closes.
  const [pot, setPot] = useState<readonly PotItem[]>([]);
  return (
    <Panel
      title={t('panel_food_title')}
      onClose={onClose}
      headerExtra={<TabBar<Tab> tabs={tabDefs()} active={tab} onTab={setTab} />}
    >
      {tab === 'eat' ? (
        <EatTab pantry={pantry} onPick={onPick} />
      ) : (
        <CookTab pantry={pantry} pot={pot} onPot={setPot} onCook={onCook} />
      )}
    </Panel>
  );
}
