import { outingsLeft } from '@/core/outings';
import type { FarmOp } from '@/core/farm';
import type { Farm, Kitchen, OutingKind } from '@/core/types';
import { OUTING_KINDS } from '@/data/outings';
import { t } from '@/i18n/t';
import { Panel } from './Panel';

interface Props {
  kitchen: Kitchen;
  now: number;
  onGo(kind: OutingKind): void;
  onFarm(action: FarmOp): void;
  onClose(): void;
}

const MIN_PER_HOUR = 60;

/** Whole hours, rounded up, from an hour on; minutes below that. */
function growingText(minLeft: number): string {
  return minLeft >= MIN_PER_HOUR
    ? t('farm_growing_hours', String(Math.ceil(minLeft / MIN_PER_HOUR)))
    : t('farm_growing_minutes', String(minLeft));
}

function FarmControls({ farm, onFarm }: { farm: Farm; onFarm(action: FarmOp): void }) {
  if (farm.crop === null) {
    return (
      <>
        <button type="button" class="panel__item" onClick={() => onFarm({ op: 'plant', crop: 'veggie' })}>
          {t('farm_plant_veggie')}
        </button>
        <button type="button" class="panel__item" onClick={() => onFarm({ op: 'plant', crop: 'fruit' })}>
          {t('farm_plant_fruit')}
        </button>
      </>
    );
  }
  if (farm.growMinLeft > 0) {
    return (
      <>
        <span class="panel__note">{growingText(farm.growMinLeft)}</span>
        {!farm.watered && (
          <button type="button" class="panel__item" onClick={() => onFarm({ op: 'water' })}>
            {t('farm_water')}
          </button>
        )}
      </>
    );
  }
  return (
    <button type="button" class="panel__item" onClick={() => onFarm({ op: 'harvest' })}>
      {t('farm_harvest')}
    </button>
  );
}

export function OutingPanel({ kitchen, now, onGo, onFarm, onClose }: Props) {
  return (
    <Panel title={t('panel_outing_title')} onClose={onClose}>
      <div class="panel__grid panel__grid--outing">
        {OUTING_KINDS.map((kind) => {
          const left = outingsLeft(kitchen.outings, kind, now);
          return (
            <button key={kind} type="button" class="panel__item" disabled={left === 0} onClick={() => onGo(kind)}>
              <span>{t(`outing_${kind}`)}</span>
              <small>{t('outing_left', String(left))}</small>
            </button>
          );
        })}
      </div>
      <div class="panel__farm">
        <strong>{t('outing_farm')}</strong>
        <FarmControls farm={kitchen.farm} onFarm={onFarm} />
      </div>
    </Panel>
  );
}
