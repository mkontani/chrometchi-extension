import { useState } from 'preact/hooks';
import type { DecorId } from '@/core/types';
import { DECOR, type DecorDef } from '@/data/decor';
import { t } from '@/i18n/t';
import { decorUrl } from '@/ui/assets';
import { CoinAmount } from './CoinAmount';
import { ConfirmDialog } from './ConfirmDialog';
import { ScrollList } from './ScrollList';

interface Props {
  owned: readonly DecorId[];
  coins: number;
  onBuy(decor: DecorId): void;
}

interface RowProps {
  item: DecorDef;
  owned: boolean;
  coins: number;
  onAsk(decor: DecorId): void;
}

function Row({ item, owned, coins, onAsk }: RowProps) {
  const url = decorUrl(item.id);
  const name = t(`decor_${item.id}`);
  return (
    <li class="shop__row">
      {url ? <img src={url} width={item.size} height={item.size} alt="" /> : null}
      <span class="shop__text">
        <span class="shop__name">{name}</span>
        <small class="shop__detail">
          <CoinAmount amount={item.price} />
        </small>
      </span>
      {owned ? (
        <span class="shop__owned">{t('shop_owned')}</span>
      ) : (
        <button
          type="button"
          class="shop__btn"
          aria-label={t('shop_buy_aria', name)}
          disabled={coins < item.price}
          onClick={() => onAsk(item.id)}
        >
          {t('shop_buy')}
        </button>
      )}
    </li>
  );
}

/** The furniture list: every item with its price. Buying asks first. */
export function DecorShop({ owned, coins, onBuy }: Props) {
  const [asking, setAsking] = useState<DecorId | null>(null);
  const item = DECOR.find((d) => d.id === asking);
  return (
    <>
      <ScrollList class="shop__list">
        {DECOR.map((d) => (
          <Row key={d.id} item={d} owned={owned.includes(d.id)} coins={coins} onAsk={setAsking} />
        ))}
      </ScrollList>
      {item && (
        <ConfirmDialog
          message={t('shop_buy_confirm', [t(`decor_${item.id}`), String(item.price)])}
          confirmLabel={t('shop_buy')}
          cancelLabel={t('confirm_no')}
          onConfirm={() => {
            setAsking(null);
            onBuy(item.id);
          }}
          onCancel={() => setAsking(null)}
        />
      )}
    </>
  );
}
