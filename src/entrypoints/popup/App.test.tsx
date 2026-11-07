import { act, cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { afterEach, expect, test, vi } from 'vitest';
import { EMPTY_KITCHEN } from '@/core/kitchen';
import { App } from './App';
import { backgroundUrl, useGame, pet, fullSave, save, PET_LABEL, NOT_APPLIED, setup, answered, flush, advance, petSrc, feedRice } from './appTestUtils';

vi.mock('@/i18n/t', async () => (await import('./appTestUtils')).i18nMock);
vi.mock('@/ui/assets', async () => (await import('./appTestUtils')).assetsMock);
vi.mock('@/ui/useGame', async () => (await import('./appTestUtils')).useGameMock);
vi.mock('@/ui/roamPermission', async () => (await import('./appTestUtils')).roamPermissionMock);

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

test('shows loading while save is null', () => {
  useGame.mockReturnValue({ save: null, outcome: null, error: null, send: vi.fn() });
  render(<App />);
  expect(screen.getByText('loading')).toBeTruthy();
});

test('shows only the localized generic error; the raw detail goes to the console', () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  useGame.mockReturnValue({ save: null, outcome: null, error: 'boom', send: vi.fn() });
  render(<App />);
  expect(screen.getByText('error_generic')).toBeTruthy();
  expect(screen.queryByText('boom')).toBeNull();
  expect(warn).toHaveBeenCalledWith(expect.any(String), 'boom');
  warn.mockRestore();
});

test('a current room that is not owned shows home', () => {
  backgroundUrl.mockClear();
  useGame.mockReturnValue({ save: fullSave({}, { home: { room: 'castle', ownedDecor: [], decor: {} } }), outcome: null, error: null, send: vi.fn() });
  render(<App />);
  expect(backgroundUrl).toHaveBeenCalledWith('home_day');
  expect(backgroundUrl).not.toHaveBeenCalledWith('castle_day');
});

test('clicking clean sends the care request', () => {
  const send = vi.fn().mockResolvedValue(NOT_APPLIED);
  useGame.mockReturnValue({ save, outcome: null, error: null, send });
  render(<App />);
  fireEvent.click(screen.getByLabelText('action_clean'));
  expect(send).toHaveBeenCalledWith({ type: 'care', action: { kind: 'clean' } });
});

test('clicking medicine sends the care request', () => {
  const send = vi.fn().mockResolvedValue(NOT_APPLIED);
  useGame.mockReturnValue({ save, outcome: null, error: null, send });
  render(<App />);
  fireEvent.click(screen.getByLabelText('action_medicine'));
  expect(send).toHaveBeenCalledWith({ type: 'care', action: { kind: 'medicine' } });
});

test('choosing a food sends care feed with that food and closes the panel', () => {
  const { send } = setup();
  fireEvent.click(screen.getByLabelText('action_feed'));
  fireEvent.click(screen.getByText('food_meat'));
  expect(send).toHaveBeenCalledWith({ type: 'care', action: { kind: 'feed', food: 'meat' } });
  expect(screen.queryByText('panel_food_title')).toBeNull();
});

test('cooking from the food panel sends the pot and closes the panel', () => {
  const { send } = setup(null, {}, { kitchen: { ...EMPTY_KITCHEN, pantry: { egg: 2 } } });
  fireEvent.click(screen.getByLabelText('action_feed'));
  fireEvent.click(screen.getByRole('tab', { name: 'tab_cook' }));
  fireEvent.click(screen.getByText('food_rice'));
  fireEvent.click(screen.getByText('food_egg'));
  fireEvent.click(screen.getByText('cook_make'));
  expect(send).toHaveBeenCalledWith({ type: 'cook', items: ['rice', 'egg'] });
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
  fireEvent.click(screen.getByRole('button', { name: PET_LABEL }));
  expect(send).toHaveBeenCalledWith({ type: 'care', action: { kind: 'pet' } });
});

test('Enter on the pet sends the pet action', () => {
  const { send } = setup();
  fireEvent.keyDown(screen.getByRole('button', { name: PET_LABEL }), { key: 'Enter' });
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

test('an ok feed plays the eating effect, then the stage returns to normal', async () => {
  vi.useFakeTimers();
  const { send, ui } = setup();
  await feedRice(send);
  expect(ui.container.querySelector('img.fx-prop--food')?.getAttribute('src')).toBe('food-rice-0.png');
  advance(300);
  expect(petSrc(ui.container)).toBe('sprite-eat.png');
  advance(2300);
  expect(ui.container.querySelector('.fx-prop')).toBeNull();
  expect(petSrc(ui.container)).toBe('sprite-sick.png'); // the saved pet is sick
});

test('an ok clean sweeps the poops that were there', async () => {
  vi.useFakeTimers();
  const { send, ui } = setup(null, { poops: 2, sick: false });
  send.mockResolvedValueOnce(answered({ action: 'clean', result: 'ok' }, { poops: 0, sick: false }));
  useGame.mockReturnValue({ save: fullSave({ poops: 0, sick: false }), outcome: null, error: null, send });
  fireEvent.click(screen.getByLabelText('action_clean'));
  ui.rerender(<App />);
  await flush();
  expect(ui.container.querySelectorAll('.poops > *')).toHaveLength(2);
  advance(1800);
  expect(ui.container.querySelectorAll('.poop--gone')).toHaveLength(2);
  advance(400);
  expect(ui.container.querySelectorAll('.poops > *')).toHaveLength(0);
});

/** A `send` answer the test releases by hand, to deliver the new save before the reply. */
function later() {
  let release: (r: unknown) => void = () => {};
  const reply = new Promise((resolve) => (release = resolve));
  return { reply, release };
}

// The background saves (storage.onChanged reaches the popup) before it replies.
test('the stage keeps the poops until the clean reply, even when the new save comes first', async () => {
  vi.useFakeTimers();
  const { send, ui } = setup(null, { poops: 2, sick: false });
  const clean = later();
  send.mockReturnValueOnce(clean.reply);
  fireEvent.click(screen.getByLabelText('action_clean'));
  useGame.mockReturnValue({ save: fullSave({ poops: 0, sick: false }), outcome: null, error: null, send });
  ui.rerender(<App />);
  await flush();
  expect(ui.container.querySelectorAll('.poops > *')).toHaveLength(2);
  clean.release(answered({ action: 'clean', result: 'ok' }, { poops: 0, sick: false }));
  await flush();
  expect(ui.container.querySelectorAll('.poops > *')).toHaveLength(2);
  advance(2200);
  expect(ui.container.querySelectorAll('.poops > *')).toHaveLength(0);
});

test('two cares in flight hold the stage until both have replied', async () => {
  vi.useFakeTimers();
  const night = { poops: 2, sick: false, asleep: true, lightsOn: true };
  const { send, ui } = setup(null, night);
  const clean = later();
  const lights = later();
  send.mockReturnValueOnce(clean.reply).mockReturnValueOnce(lights.reply);
  fireEvent.click(screen.getByLabelText('action_clean'));
  fireEvent.click(screen.getByLabelText('action_lights'));
  const dark = { ...night, poops: 0, lightsOn: false };
  useGame.mockReturnValue({ save: fullSave(dark), outcome: null, error: null, send });
  ui.rerender(<App />);
  clean.release(answered({ action: 'clean', result: 'ok' }, { ...night, poops: 0 }));
  await flush();
  expect(ui.container.querySelector('.stage--dark')).toBeNull();
  lights.release(answered({ action: 'lights', result: 'ok' }, dark));
  await flush();
  advance(1000);
  expect(ui.container.querySelector('.stage--dark')).not.toBeNull();
});

test('a refused care keeps the running effect and only shows the toast', async () => {
  vi.useFakeTimers();
  const { send, ui } = setup();
  await feedRice(send);
  advance(500);
  send.mockResolvedValueOnce(answered({ action: 'clean', result: 'refused', reason: 'noPoop' }));
  fireEvent.click(screen.getByLabelText('action_clean'));
  await flush();
  useGame.mockReturnValue({ save, outcome: { action: 'clean', result: 'refused', reason: 'noPoop' }, error: null, send });
  ui.rerender(<App />);
  expect(screen.getByText('refuse_noPoop')).toBeTruthy();
  expect(ui.container.querySelector('img.fx-prop--food')).not.toBeNull();
});

test('a sync during the feed effect keeps the food on stage', async () => {
  vi.useFakeTimers();
  const { send, ui } = setup();
  await feedRice(send);
  advance(500);
  useGame.mockReturnValue({ save: fullSave({ stats: { ...pet.stats, hunger: 90 } }), outcome: null, error: null, send });
  ui.rerender(<App />);
  expect(ui.container.querySelector('img.fx-prop--food')).not.toBeNull();
});

test('another ok care replaces the running effect', async () => {
  vi.useFakeTimers();
  const { send, ui } = setup();
  await feedRice(send);
  expect(ui.container.querySelector('img.fx-prop--food')).not.toBeNull();
  send.mockResolvedValueOnce(answered({ action: 'pet', result: 'ok' }));
  fireEvent.click(screen.getByRole('button', { name: PET_LABEL }));
  await flush();
  expect(ui.container.querySelector('.fx-prop')).toBeNull();
});
