import type { AccessoryId } from '@/core/types';
import { ACCESSORIES } from '@/data/accessories';
import { t } from '@/i18n/t';
import { accUrl } from '@/ui/assets';
import { CatalogList } from './CatalogList';

interface Props {
  owned: readonly AccessoryId[];
  coins: number;
  onBuy(acc: AccessoryId): void;
}

/** The accessory list, shown at twice the art size (16 px art is 32 px). Buying asks first. */
export function AccessoryShop({ owned, coins, onBuy }: Props) {
  const items = ACCESSORIES.map((a) => ({
    id: a.id,
    name: t(`acc_${a.id}`),
    price: a.price,
    url: accUrl(a.id),
    imgSize: a.size * 2,
  }));
  return <CatalogList items={items} owned={owned} coins={coins} onBuy={onBuy} />;
}
