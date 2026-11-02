import { iconUrl, type IconId } from '@/ui/assets';

interface Props {
  id: IconId;
  label: string;
  disabled?: boolean;
  onClick(): void;
}

export function IconButton({ id, label, disabled = false, onClick }: Props) {
  const url = iconUrl(id);
  return (
    <button type="button" class="icon-button" aria-label={label} disabled={disabled} onClick={onClick}>
      {url ? <img src={url} width={32} height={32} alt="" /> : null}
      <span class="icon-button__label">{label}</span>
    </button>
  );
}
