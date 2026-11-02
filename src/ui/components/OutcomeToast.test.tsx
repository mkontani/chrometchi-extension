import { act, cleanup, render, screen } from '@testing-library/preact';
import { afterEach, expect, test, vi } from 'vitest';
import type { CareOutcome } from '@/core/types';
import { OutcomeToast } from './OutcomeToast';

vi.mock('@/i18n/t', () => ({ t: (k: string) => k }));
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const refused: CareOutcome = { action: 'feed', result: 'refused', reason: 'full' };

test('refused outcome shows localized reason then hides after 2s', () => {
  vi.useFakeTimers();
  render(<OutcomeToast outcome={refused} />);
  expect(screen.getByText('refuse_full')).toBeTruthy();
  act(() => void vi.advanceTimersByTime(2000));
  expect(screen.queryByText('refuse_full')).toBeNull();
});

test('ok outcome and null show nothing', () => {
  const { rerender } = render(<OutcomeToast outcome={null} />);
  expect(screen.queryByRole('status')).toBeNull();
  rerender(<OutcomeToast outcome={{ action: 'feed', result: 'ok' }} />);
  expect(screen.queryByRole('status')).toBeNull();
});

test('a new refused outcome shows again after hiding', () => {
  vi.useFakeTimers();
  const { rerender } = render(<OutcomeToast outcome={refused} />);
  act(() => void vi.advanceTimersByTime(2000));
  rerender(<OutcomeToast outcome={{ ...refused, reason: 'asleep' }} />);
  expect(screen.getByText('refuse_asleep')).toBeTruthy();
});

test('refused then ok within 2s hides the toast', () => {
  vi.useFakeTimers();
  const { rerender } = render(<OutcomeToast outcome={refused} />);
  act(() => void vi.advanceTimersByTime(500));
  rerender(<OutcomeToast outcome={{ action: 'clean', result: 'ok' }} />);
  expect(screen.queryByText('refuse_full')).toBeNull();
  rerender(<OutcomeToast outcome={refused} />);
  rerender(<OutcomeToast outcome={null} />);
  expect(screen.queryByText('refuse_full')).toBeNull();
});

test('unmount leaves no timers', () => {
  vi.useFakeTimers();
  const { unmount } = render(<OutcomeToast outcome={refused} />);
  unmount();
  expect(vi.getTimerCount()).toBe(0);
});
