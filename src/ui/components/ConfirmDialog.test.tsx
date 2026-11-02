import { cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { afterEach, expect, test, vi } from 'vitest';
import { ConfirmDialog } from './ConfirmDialog';

vi.mock('@/i18n/t', () => ({ t: (k: string) => k }));
afterEach(cleanup);

test('is a labelled alertdialog; confirm and cancel call their handlers', () => {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(<ConfirmDialog message="msg" confirmLabel="yes" cancelLabel="no" onConfirm={onConfirm} onCancel={onCancel} />);
  expect(screen.getByRole('alertdialog', { name: 'msg' })).toBeTruthy();
  fireEvent.click(screen.getByText('no'));
  expect(onCancel).toHaveBeenCalled();
  expect(onConfirm).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText('yes'));
  expect(onConfirm).toHaveBeenCalled();
});
