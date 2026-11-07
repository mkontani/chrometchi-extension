import type { DecorId } from '@/core/types';
import { DECOR } from '@/data/decor';
import { t } from '@/i18n/t';
import { decorUrl } from '@/ui/assets';
import { CatalogList } from './CatalogList';

interface Props {
  owned: readonly DecorId[];
  coins: number;
  onBuy(decor: DecorId): void;
}

/** The furniture list: every item with its price. Buying asks first. */
export function DecorShop({ owned, coins, onBuy }: Props) {
  const items = DECOR.map((d) => ({
    id: d.id,
    name: t(`decor_${d.id}`),
    price: d.price,
    url: decorUrl(d.id),
    imgSize: d.size,
  }));
  return <CatalogList items={items} owned={owned} coins={coins} onBuy={onBuy} />;
}
