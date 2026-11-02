import type { ComponentChildren } from 'preact';
import { t } from '@/i18n/t';

interface Props {
  title: string;
  onClose(): void;
  children: ComponentChildren;
}

export function Panel({ title, onClose, children }: Props) {
  return (
    <section class="panel">
      <header class="panel__header">
        <strong>{title}</strong>
        <button type="button" class="panel__close" aria-label={t('close')} onClick={onClose}>
          ×
        </button>
      </header>
      {children}
    </section>
  );
}
