import { useEffect, useRef } from 'preact/hooks';
import type { PetState } from '@/core/types';
import { deriveWarning } from '@/core/warnings';
import { t } from '@/i18n/t';

interface Props {
  pet: PetState;
  onAck(): void;
}

export function CriticalBanner({ pet, onAck }: Props) {
  const visible = pet.lifecycle === 'alive' && deriveWarning(pet) === 'critical';
  const needsAck = visible && pet.criticalSeenAt === null;
  const sent = useRef(false);
  useEffect(() => {
    if (!needsAck || sent.current) return;
    sent.current = true;
    onAck();
  }, [needsAck, onAck]);
  if (!visible) return null;
  return (
    <div class="critical-banner" role="alert">
      {t('critical_banner')}
    </div>
  );
}
