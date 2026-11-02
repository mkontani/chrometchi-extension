import { cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { afterEach, expect, test, vi } from 'vitest';
import { NoticeDialog } from './NoticeDialog';

vi.mock('@/i18n/t', () => ({ t: (k: string) => k }));
afterEach(cleanup);

test('renewal notice dismisses', () => {
  const onDismiss = vi.fn();
  render(<NoticeDialog meta={{ showRenewal: true, showDataReset: true }} onDismiss={onDismiss} />);
  expect(screen.getByText('notice_renewal')).toBeTruthy();
  fireEvent.click(screen.getByText('ok'));
  expect(onDismiss).toHaveBeenCalledWith('renewal');
});

test('data reset notice shows when renewal is not pending', () => {
  const onDismiss = vi.fn();
  render(<NoticeDialog meta={{ showRenewal: false, showDataReset: true }} onDismiss={onDismiss} />);
  fireEvent.click(screen.getByText('ok'));
  expect(onDismiss).toHaveBeenCalledWith('dataReset');
});

test('renders nothing without notices', () => {
  const { container } = render(<NoticeDialog meta={{ showRenewal: false, showDataReset: false }} onDismiss={vi.fn()} />);
  expect(container.textContent).toBe('');
});
