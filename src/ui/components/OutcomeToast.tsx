import { useEffect, useState } from 'preact/hooks';
import type { CareOutcome } from '@/core/types';
import { t } from '@/i18n/t';

const TOAST_MS = 2000;

export function OutcomeToast({ outcome }: { outcome: CareOutcome | null }) {
  const [visible, setVisible] = useState<CareOutcome | null>(null);

  useEffect(() => {
    if (outcome?.result !== 'refused') return;
    setVisible(outcome);
    const id = setTimeout(() => setVisible(null), TOAST_MS);
    return () => clearTimeout(id);
  }, [outcome]);

  if (!visible?.reason) return null;
  return (
    <div class="toast" role="status">
      {t(`refuse_${visible.reason}`)}
    </div>
  );
}
