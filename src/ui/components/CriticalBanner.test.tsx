import { cleanup, render, screen } from '@testing-library/preact';
import { afterEach, expect, test, vi } from 'vitest';
import { makePet } from './__fixtures__/pet';
import { CriticalBanner } from './CriticalBanner';

vi.mock('@/i18n/t', () => ({ t: (k: string) => k }));
afterEach(cleanup);

const critical = (patch = {}) => makePet({ stats: { ...makePet().stats, hunger: 0, mood: 0, vitality: 0 }, ...patch });

test('acknowledges once even across re-renders', () => {
  const onAck = vi.fn();
  const { rerender } = render(<CriticalBanner pet={critical()} onAck={onAck} />);
  expect(screen.getByText('critical_banner')).toBeTruthy();
  rerender(<CriticalBanner pet={critical()} onAck={onAck} />);
  expect(onAck).toHaveBeenCalledTimes(1);
});

test('does not acknowledge when already seen', () => {
  const onAck = vi.fn();
  render(<CriticalBanner pet={critical({ criticalSeenAt: 5 })} onAck={onAck} />);
  expect(screen.getByText('critical_banner')).toBeTruthy();
  expect(onAck).not.toHaveBeenCalled();
});

test('renders nothing when not critical or not alive', () => {
  const onAck = vi.fn();
  const { container, rerender } = render(<CriticalBanner pet={makePet()} onAck={onAck} />);
  expect(container.textContent).toBe('');
  rerender(<CriticalBanner pet={critical({ lifecycle: 'dead' })} onAck={onAck} />);
  expect(container.textContent).toBe('');
  expect(onAck).not.toHaveBeenCalled();
});
