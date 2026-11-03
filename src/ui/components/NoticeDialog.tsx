import { t } from '@/i18n/t';
import { useAutoFocus } from '@/ui/useAutoFocus';
import type { SaveMeta } from '@/storage/schema';

type Notice = 'renewal' | 'dataReset';

interface Props {
  meta: Pick<SaveMeta, 'showRenewal' | 'showDataReset'>;
  onDismiss(notice: Notice): void;
}

export function NoticeDialog({ meta, onDismiss }: Props) {
  const okRef = useAutoFocus<HTMLButtonElement>();
  const notice: Notice | null = meta.showRenewal ? 'renewal' : meta.showDataReset ? 'dataReset' : null;
  if (!notice) return null;
  return (
    <div class="dialog-backdrop">
      <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="notice-msg">
        <p id="notice-msg">{t(notice === 'renewal' ? 'notice_renewal' : 'notice_data_reset')}</p>
        <div class="dialog__buttons">
          <button ref={okRef} type="button" class="dialog__btn" onClick={() => onDismiss(notice)}>
            {t('ok')}
          </button>
        </div>
      </div>
    </div>
  );
}
