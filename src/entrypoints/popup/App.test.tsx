import { act, cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { afterEach, expect, test, vi } from 'vitest';
import type { CareOutcome } from '@/core/types';
import { createEgg } from '@/core/factory';
import type { UseGame } from '@/ui/useGame';
import { App } from './App';

vi.mock('@/i18n/t', () => ({ t: (k: string) => k }));
vi.mock('@/ui/assets', () => ({
  spriteUrl: (_f: string, pose: string) => `sprite-${pose}.png`,
  effectUrl: () => null,
  backgroundUrl: () => null,
  iconUrl: () => null,
}));
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


afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function setup(outcome: CareOutcome | null = null, petPatch: object = {}) {
  const send = vi.fn().mockResolvedValue(undefined);
  const s = { game: { pet: { ...pet, ...petPatch } } } as unknown as NonNullable<UseGame['save']>;
  useGame.mockReturnValue({ save: s, outcome, error: null, send });
  return { send, ui: render(<App />) };
}

test('choosing a food sends care feed with that food and closes the panel', () => {
  const { send } = setup();
  fireEvent.click(screen.getByLabelText('action_feed'));
  fireEvent.click(screen.getByText('food_meat'));
  expect(send).toHaveBeenCalledWith({ type: 'care', action: { kind: 'feed', food: 'meat' } });
  expect(screen.queryByText('panel_food_title')).toBeNull();
});

test('selecting feed twice toggles the panel closed', () => {
  setup();
  fireEvent.click(screen.getByLabelText('action_feed'));
  expect(screen.getByText('panel_food_title')).toBeTruthy();
  fireEvent.click(screen.getByLabelText('action_feed'));
  expect(screen.queryByText('panel_food_title')).toBeNull();
});

test('only one panel is open at a time', () => {
  setup();
  fireEvent.click(screen.getByLabelText('action_feed'));
  fireEvent.click(screen.getByLabelText('action_play'));
  expect(screen.queryByText('panel_food_title')).toBeNull();
  expect(screen.getByText('panel_play_title')).toBeTruthy();
});

test('picking a game closes the panel, stores it and sends nothing', () => {
  const { send, ui } = setup();
  fireEvent.click(screen.getByLabelText('action_play'));
  fireEvent.click(screen.getByText('game_cups'));
  expect(screen.queryByText('panel_play_title')).toBeNull();
  expect(send).not.toHaveBeenCalled();
  expect(ui.container.querySelector('main')?.getAttribute('data-active-game')).toBe('cups');
});

test('refused outcome shows localized reason', () => {
  setup({ action: 'feed', result: 'refused', reason: 'full' });
  expect(screen.getByText('refuse_full')).toBeTruthy();
});

test('clicking the pet sends pet action', () => {
  const { send } = setup();
  fireEvent.click(screen.getByRole('button', { name: 'action_pet' }));
  expect(send).toHaveBeenCalledWith({ type: 'care', action: { kind: 'pet' } });
});

test('Enter on the pet sends the pet action', () => {
  const { send } = setup();
  fireEvent.keyDown(screen.getByRole('button', { name: 'action_pet' }), { key: 'Enter' });
  expect(send).toHaveBeenCalledWith({ type: 'care', action: { kind: 'pet' } });
});

test('lights button sends the opposite state', () => {
  const { send } = setup(null, { lightsOn: true });
  fireEvent.click(screen.getByLabelText('action_lights'));
  expect(send).toHaveBeenCalledWith({ type: 'care', action: { kind: 'lights', on: false } });
});

test('stage is dimmed when asleep with the lights off', () => {
  const { ui } = setup(null, { asleep: true, lightsOn: false });
  expect(ui.container.querySelector('.stage--dark')).not.toBeNull();
});

test('stage is not dimmed when lights are on', () => {
  const { ui } = setup(null, { asleep: true, lightsOn: true });
  expect(ui.container.querySelector('.stage--dark')).toBeNull();
});

test('ok feed outcome shows the eat pose for 1s', () => {
  vi.useFakeTimers();
  const { ui } = setup({ action: 'feed', result: 'ok' });
  const img = () => ui.container.querySelector('img.pet')?.getAttribute('src') ?? '';
  expect(img()).toBe('sprite-eat.png');
  act(() => void vi.advanceTimersByTime(1000));
  expect(img()).not.toBe('sprite-eat.png');
});
