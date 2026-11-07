import { t } from '@/i18n/t';
import { iconUrl, type IconId } from '@/ui/assets';

interface Props {
  id: IconId;
  label: string;
  disabled?: boolean;
  badge?: boolean;
  onClick(): void;
}

export function IconButton({ id, label, disabled = false, badge = false, onClick }: Props) {
  const url = iconUrl(id);
  return (
    <button type="button" class="icon-button" aria-label={badge ? `${label} ${t('new_rewards')}` : label} disabled={disabled} onClick={onClick}>
      {url ? <img src={url} width={32} height={32} alt="" /> : null}
      <span class="icon-button__label">{label}</span>
      {badge ? <span class="icon-button__dot" aria-hidden="true" /> : null}
    </button>
  );
}
