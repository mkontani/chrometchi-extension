import { useAutoFocus } from '@/ui/useAutoFocus';

interface Props {
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm(): void;
  onCancel(): void;
}

export function ConfirmDialog({ message, confirmLabel, cancelLabel, onConfirm, onCancel }: Props) {
  // Focus the safe choice so a stray Enter/Space never confirms a destructive action.
  const cancel = useAutoFocus<HTMLButtonElement>();
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    e.stopPropagation();
    onCancel();
  };
  return (
    <div class="dialog-backdrop">
      <div class="dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-msg" onKeyDown={onKeyDown}>
        <p id="confirm-msg">{message}</p>
        <div class="dialog__buttons">
          <button ref={cancel} type="button" class="dialog__btn" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" class="dialog__btn dialog__btn--danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
