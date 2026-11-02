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
const fullSave = (petPatch: object = {}, extra: object = {}) =>
  ({
    game: { pet: { ...pet, ...petPatch }, generation: 1, lastTickAt: 0 },
    zukan: { discovered: ['egg', 'baby_puni'], memories: [] },
    settings: { notifications: true, sound: true, sleepStartMin: 1320, sleepEndMin: 420 },
    meta: { lastNotified: {}, showRenewal: false, showDataReset: false },
    ...extra,
  }) as unknown as NonNullable<UseGame['save']>;
const save = fullSave();

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

function setup(outcome: CareOutcome | null = null, petPatch: object = {}, extra: object = {}) {
  const send = vi.fn().mockResolvedValue(undefined);
  const s = fullSave(petPatch, extra);
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

test('picking a game closes the panel and shows the mini-game host', () => {
  const { send } = setup();
  fireEvent.click(screen.getByLabelText('action_play'));
  fireEvent.click(screen.getByText('game_catch'));
  expect(screen.queryByText('panel_play_title')).toBeNull();
  expect(screen.getByText('game_hint_catch')).toBeTruthy();
  expect(send).not.toHaveBeenCalled();
});

test('quitting the host sends nothing', () => {
  const { send } = setup();
  fireEvent.click(screen.getByLabelText('action_play'));
  fireEvent.click(screen.getByText('game_catch'));
  fireEvent.click(screen.getByText('game_quit'));
  expect(screen.queryByText('game_hint_catch')).toBeNull();
  expect(send).not.toHaveBeenCalled();
});

test('finishing a game sends the play care request', () => {
  vi.useFakeTimers({
    toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance'],
  });
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({ fillRect: vi.fn(), fillText: vi.fn() })) as never;
  const { send } = setup();
  fireEvent.click(screen.getByLabelText('action_play'));
  fireEvent.click(screen.getByText('game_catch'));
  // dt is clamped to 100ms per frame, so 30s of game needs >300 frames (~16ms each).
  act(() => void vi.advanceTimersByTime(60_000));
  act(() => void vi.advanceTimersByTime(1500));
  expect(send).toHaveBeenCalledTimes(1);
  expect(send.mock.calls[0]?.[0]).toMatchObject({ type: 'care', action: { kind: 'play', game: 'catch' } });
  expect(screen.queryByText('game_hint_catch')).toBeNull();
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

test('zukan opens as an overlay, closing the food panel, and closes again', () => {
  setup();
  fireEvent.click(screen.getByLabelText('action_feed'));
  fireEvent.click(screen.getByLabelText('action_zukan'));
  expect(screen.queryByText('panel_food_title')).toBeNull();
  expect(screen.getByText('zukan_title')).toBeTruthy();
  fireEvent.click(screen.getByLabelText('close'));
  expect(screen.queryByText('zukan_title')).toBeNull();
});

test('settings update sends a patch and restart sends restart then closes', () => {
  const { send } = setup();
  fireEvent.click(screen.getByLabelText('action_settings'));
  fireEvent.click(screen.getByLabelText('settings_sound'));
  expect(send).toHaveBeenCalledWith({ type: 'updateSettings', patch: { sound: false } });
  fireEvent.click(screen.getByText('settings_restart'));
  fireEvent.click(screen.getByText('confirm_yes'));
  expect(send).toHaveBeenCalledWith({ type: 'restart' });
  expect(screen.queryByText('settings_title')).toBeNull();
});

test('critical pet shows the banner and acknowledges once', () => {
  const { send } = setup(null, { stats: { ...pet.stats, hunger: 0, mood: 0, vitality: 0 }, criticalSeenAt: null });
  expect(screen.getByText('critical_banner')).toBeTruthy();
  expect(send.mock.calls.filter(([r]) => r.type === 'ackCritical')).toHaveLength(1);
});

test('a dead pet shows the ending view and new egg sends startNewEgg', () => {
  const { send } = setup(null, { lifecycle: 'dead' });
  expect(screen.getByText('ending_dead_title')).toBeTruthy();
  fireEvent.click(screen.getByText('new_egg'));
  expect(send).toHaveBeenCalledWith({ type: 'startNewEgg' });
});

test('renewal notice shows and dismisses', () => {
  const { send } = setup(null, {}, { meta: { lastNotified: {}, showRenewal: true, showDataReset: false } });
  expect(screen.getByText('notice_renewal')).toBeTruthy();
  fireEvent.click(screen.getByText('ok'));
  expect(send).toHaveBeenCalledWith({ type: 'dismissNotice', notice: 'renewal' });
});
