import type { ComponentChildren } from 'preact';
import { t } from '@/i18n/t';

interface Props {
  title: string;
  onClose(): void;
  children: ComponentChildren;
}

export function Overlay({ title, onClose, children }: Props) {
  return (
    <section class="overlay">
      <header class="panel__header">
        <strong>{title}</strong>
        <button type="button" class="panel__close" aria-label={t('close')} onClick={onClose}>
          ×
        </button>
      </header>
      <div class="overlay__body">{children}</div>
    </section>
  );
}
