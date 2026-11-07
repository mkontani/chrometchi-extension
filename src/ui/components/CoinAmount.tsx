import { t } from '@/i18n/t';
import { iconUrl } from '@/ui/assets';

/** A coin icon and a number, read as one "Coins: n" image by screen readers. */
export function CoinAmount({ amount }: { amount: number }) {
  const url = iconUrl('coin');
  return (
    <span class="shop__coin" role="img" aria-label={t('coins_aria', String(amount))}>
      {url ? <img src={url} width={16} height={16} alt="" /> : null}
      <span aria-hidden="true">{amount}</span>
    </span>
  );
}
