import type { IngredientId, Pantry } from '@/core/types';
import { SELL_PRICE } from '@/data/economy';
import { INGREDIENT_IDS } from '@/data/foods';
import { t } from '@/i18n/t';
import { iconUrl } from '@/ui/assets';
import { countLabel } from '@/ui/components/foodGrid';

interface Props {
  pantry: Pantry;
  coins: number;
  onSell(food: IngredientId, amount: number): void;
}

function CoinAmount({ amount }: { amount: number }) {
  const url = iconUrl('coin');
  return (
    <span class="shop__coin" role="img" aria-label={t('coins_aria', String(amount))}>
      {url ? <img src={url} width={16} height={16} alt="" /> : null}
      <span aria-hidden="true">{amount}</span>
    </span>
  );
}

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

/** The sell list: every ingredient with its stock and price. A refused sell changes nothing. */
export function ShopView({ pantry, coins, onSell }: Props) {
  return (
    <div class="shop">
      <p class="shop__coins">{t('shop_coins', String(coins))}</p>
      <h3 class="shop__heading">{t('shop_sell')}</h3>
      <ul class="shop__list">
        {INGREDIENT_IDS.map((food) => (
          <Row key={food} food={food} stock={pantry[food] ?? 0} onSell={onSell} />
        ))}
      </ul>
    </div>
  );
}
