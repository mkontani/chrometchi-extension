import { useState } from 'preact/hooks';
import type { AccessoryId, DecorId, IngredientId, Pantry } from '@/core/types';
import { SELL_PRICE } from '@/data/economy';
import { INGREDIENT_IDS } from '@/data/foods';
import { t } from '@/i18n/t';
import { iconUrl } from '@/ui/assets';
import { AccessoryShop } from '@/ui/components/AccessoryShop';
import { BoughtNote, useBoughtNote } from '@/ui/components/BoughtNote';
import { CoinAmount } from '@/ui/components/CoinAmount';
import { DecorShop } from '@/ui/components/DecorShop';
import { countLabel } from '@/ui/components/foodGrid';
import { ScrollList } from '@/ui/components/ScrollList';
import { TabBar, type TabDef } from '@/ui/components/TabBar';

interface Props {
  pantry: Pantry;
  coins: number;
  ownedDecor: readonly DecorId[];
  ownedAcc: readonly AccessoryId[];
  onSell(food: IngredientId, amount: number): void;
  /** Resolves to true when the buy went through. */
  onBuy(decor: DecorId): Promise<boolean>;
  /** Resolves to true when the accessory buy went through. */
  onBuyAcc(acc: AccessoryId): Promise<boolean>;
}

type Tab = 'decor' | 'acc' | 'sell';

interface RowProps {
  food: IngredientId;
  stock: number;
  onSell(food: IngredientId, amount: number): void;
}

function Row({ food, stock, onSell }: RowProps) {
  const url = iconUrl(`food_${food}`);
  return (
    <li class="shop__row">
      {url ? <img src={url} width={32} height={32} alt="" /> : null}
      <span class="shop__text">
        <span class="shop__name">{t(`food_${food}`)}</span>
        <small class="shop__detail">
          {countLabel(stock)} <CoinAmount amount={SELL_PRICE[food]} />
        </small>
      </span>
      <button
        type="button"
        class="shop__btn"
        aria-label={t('shop_sell_one_aria', t(`food_${food}`))}
        disabled={stock < 1}
        onClick={() => onSell(food, 1)}
      >
        {t('shop_sell_one')}
      </button>
      <button
        type="button"
        class="shop__btn"
        aria-label={t('shop_sell_all_aria', t(`food_${food}`))}
        disabled={stock < 1}
        onClick={() => onSell(food, stock)}
      >
        {t('shop_sell_all')}
      </button>
    </li>
  );
}

/** The shop: furniture and accessories to buy, and the ingredients to sell. A refused sell changes nothing. */
export function ShopView({ pantry, coins, ownedDecor, ownedAcc, onSell, onBuy, onBuyAcc }: Props) {
  const [tab, setTab] = useState<Tab>('decor');
  const [bought, flashBought, clearBought] = useBoughtNote();
  const buy = async (decor: DecorId) => {
    if (await onBuy(decor)) flashBought('shop_bought');
    else clearBought();
  };
  const buyAcc = async (acc: AccessoryId) => {
    if (await onBuyAcc(acc)) flashBought('shop_bought_acc');
    else clearBought();
  };
  const tabs: readonly TabDef<Tab>[] = [
    { id: 'decor', label: t('shop_tab_decor') },
    { id: 'acc', label: t('shop_tab_acc') },
    { id: 'sell', label: t('shop_tab_sell') },
  ];
  return (
    <div class="shop">
      <p class="shop__coins">{t('shop_coins', String(coins))}</p>
      <TabBar<Tab> tabs={tabs} active={tab} onTab={setTab} label={t('shop_title')} />
      <BoughtNote shown={bought} />
      {tab === 'decor' ? <DecorShop owned={ownedDecor} coins={coins} onBuy={(decor) => void buy(decor)} /> : null}
      {tab === 'acc' ? <AccessoryShop owned={ownedAcc} coins={coins} onBuy={(acc) => void buyAcc(acc)} /> : null}
      {tab === 'sell' ? (
        <ScrollList class="shop__list">
          {INGREDIENT_IDS.map((food) => (
            <Row key={food} food={food} stock={pantry[food] ?? 0} onSell={onSell} />
          ))}
        </ScrollList>
      ) : null}
    </div>
  );
}
