import type { ComponentChildren } from 'preact';
import { t } from '@/i18n/t';
import { useAutoFocus } from '@/ui/useAutoFocus';

interface Props {
  title: string;
  onClose(): void;
  /** Shown between the title and the close button, e.g. tabs. */
  headerExtra?: ComponentChildren;
  children: ComponentChildren;
}

export function Overlay({ title, onClose, headerExtra, children }: Props) {
  const ref = useAutoFocus<HTMLElement>();
  return (
    <section
      ref={ref}
      class="overlay"
      tabIndex={-1}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <header class="panel__header">
        <strong>{title}</strong>
        {headerExtra}
        <button type="button" class="panel__close" aria-label={t('close')} onClick={onClose}>
          ×
        </button>
      </header>
      <div class="overlay__body">{children}</div>
    </section>
  );
}
