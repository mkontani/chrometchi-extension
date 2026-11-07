import { useState } from 'preact/hooks';
import { t } from '@/i18n/t';
import { CoinAmount } from './CoinAmount';
import { ConfirmDialog } from './ConfirmDialog';
import { ScrollList } from './ScrollList';

/** One thing the shop sells: its picture (null while there is none), name, price and shown size. */
export interface CatalogItem<Id extends string> {
  id: Id;
  name: string;
  price: number;
  url: string | null;
  /** Side of the picture on screen, in px. */
  imgSize: number;
}

interface Props<Id extends string> {
  items: readonly CatalogItem<Id>[];
  owned: readonly Id[];
  coins: number;
  onBuy(id: Id): void;
}

interface RowProps<Id extends string> {
  item: CatalogItem<Id>;
  owned: boolean;
  coins: number;
  onAsk(id: Id): void;
}

function Row<Id extends string>({ item, owned, coins, onAsk }: RowProps<Id>) {
  return (
    <li class="shop__row">
      {item.url ? <img src={item.url} width={item.imgSize} height={item.imgSize} alt="" /> : null}
      <span class="shop__text">
        <span class="shop__name">{item.name}</span>
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
          aria-label={t('shop_buy_aria', item.name)}
          disabled={coins < item.price}
          onClick={() => onAsk(item.id)}
        >
          {t('shop_buy')}
        </button>
      )}
    </li>
  );
}

/** A list of things to buy, each with its price or "owned". Buying asks first. */
export function CatalogList<Id extends string>({ items, owned, coins, onBuy }: Props<Id>) {
  const [asking, setAsking] = useState<Id | null>(null);
  const item = items.find((i) => i.id === asking);
  return (
    <>
      <ScrollList class="shop__list">
        {items.map((i) => (
          <Row key={i.id} item={i} owned={owned.includes(i.id)} coins={coins} onAsk={(id) => setAsking(id)} />
        ))}
      </ScrollList>
      {item && (
        <ConfirmDialog
          message={t('shop_buy_confirm', [item.name, String(item.price)])}
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
