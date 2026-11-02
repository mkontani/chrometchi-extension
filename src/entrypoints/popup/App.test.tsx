import { cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { afterEach, expect, test, vi } from 'vitest';
import { createEgg } from '@/core/factory';
import type { UseGame } from '@/ui/useGame';
import { App } from './App';

vi.mock('@/i18n/t', () => ({ t: (k: string) => k }));
const useGame = vi.fn<() => UseGame>();
vi.mock('@/ui/useGame', () => ({ useGame: () => useGame() }));

const pet = { ...createEgg(), stage: 'child' as const, formId: 'child_kemu' as const, poops: 2, sick: true };
const save = { game: { pet } } as unknown as NonNullable<UseGame['save']>;

test('shows loading while save is null', () => {
  useGame.mockReturnValue({ save: null, outcome: null, error: null, send: vi.fn() });
  render(<App />);
  expect(screen.getByText('loading')).toBeTruthy();
});

test('shows error text', () => {
  useGame.mockReturnValue({ save: null, outcome: null, error: 'boom', send: vi.fn() });
  render(<App />);
  expect(screen.getByText('error_generic')).toBeTruthy();
  expect(screen.getByText('boom')).toBeTruthy();
});

test('clicking clean sends the care request', () => {
  const send = vi.fn().mockResolvedValue(undefined);
  useGame.mockReturnValue({ save, outcome: null, error: null, send });
  render(<App />);
  fireEvent.click(screen.getByLabelText('action_clean'));
  expect(send).toHaveBeenCalledWith({ type: 'care', action: { kind: 'clean' } });
});

test('clicking medicine sends the care request', () => {
  const send = vi.fn().mockResolvedValue(undefined);
  useGame.mockReturnValue({ save, outcome: null, error: null, send });
  render(<App />);
  fireEvent.click(screen.getByLabelText('action_medicine'));
  expect(send).toHaveBeenCalledWith({ type: 'care', action: { kind: 'medicine' } });
});

afterEach(cleanup);
