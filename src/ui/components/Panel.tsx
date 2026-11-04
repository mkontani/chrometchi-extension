import type { ComponentChildren } from 'preact';
import { t } from '@/i18n/t';

interface Props {
  title: string;
  onClose(): void;
  /** Shown between the title and the close button, e.g. tabs. */
  headerExtra?: ComponentChildren;
  children: ComponentChildren;
}

export function Panel({ title, onClose, headerExtra, children }: Props) {
  return (
    <section class="panel">
      <header class="panel__header">
        <strong>{title}</strong>
        {headerExtra}
        <button type="button" class="panel__close" aria-label={t('close')} onClick={onClose}>
          ×
        </button>
      </header>
      {children}
    </section>
  );
}
