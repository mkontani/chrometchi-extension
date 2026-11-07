import type { PetState } from '@/core/types';
import { t } from '@/i18n/t';
import { CoinAmount } from './CoinAmount';
import { Hearts } from './Hearts';

export function StatusBar({ pet, coins }: { pet: PetState; coins: number }) {
  const { hunger, mood, vitality, weight } = pet.stats;
  return (
    <header class="status-bar">
      <div class="status-rows">
        <Hearts label={t('stat_hunger')} value={hunger} />
        <Hearts label={t('stat_mood')} value={mood} />
        <Hearts label={t('stat_vitality')} value={vitality} />
      </div>
      <div class="status-side">
        <div class="status-weight" aria-label={t('stat_weight')}>
          {`${Math.round(weight)}g`}
        </div>
        <div class="status-coins">
          <CoinAmount amount={coins} />
        </div>
      </div>
    </header>
  );
}
