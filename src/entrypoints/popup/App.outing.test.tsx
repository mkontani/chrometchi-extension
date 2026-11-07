import { act, cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { afterEach, expect, test, vi } from 'vitest';
import { EMPTY_KITCHEN } from '@/core/kitchen';
import { App } from './App';
import { useGame, fullSave, save, NOT_APPLIED, setup, flush, advance, feedRice, stubAudio } from './appTestUtils';

vi.mock('@/i18n/t', async () => (await import('./appTestUtils')).i18nMock);
vi.mock('@/ui/assets', async () => (await import('./appTestUtils')).assetsMock);
vi.mock('@/ui/useGame', async () => (await import('./appTestUtils')).useGameMock);
vi.mock('@/ui/roamPermission', async () => (await import('./appTestUtils')).roamPermissionMock);

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

test('the feeding effect plays a bite sound as each bite lands', async () => {
  vi.useFakeTimers();
  const freqs = stubAudio();
  const { send } = setup();
  await feedRice(send);
  advance(550);
  expect(freqs).toEqual([]);
  advance(50);
  expect(freqs).toEqual([523, 659]);
  vi.unstubAllGlobals();
});

test('an ok care with an effect makes no sound of its own; a refusal still alerts', () => {
  const freqs = stubAudio();
  const send = vi.fn().mockResolvedValue(NOT_APPLIED);
  useGame.mockReturnValue({ save, outcome: null, error: null, send });
  const ui = render(<App />);
  useGame.mockReturnValue({ save, outcome: { action: 'clean', result: 'ok' }, error: null, send });
  ui.rerender(<App />);
  expect(freqs).toEqual([]);
  useGame.mockReturnValue({ save, outcome: { action: 'clean', result: 'refused', reason: 'noPoop' }, error: null, send });
  ui.rerender(<App />);
  expect(freqs).toEqual([988, 988]);
  vi.unstubAllGlobals();
});

test('no sound plays when the sound setting is off', () => {
  const freqs = stubAudio();
  const quiet = fullSave({}, { settings: { notifications: true, sound: false, sleepStartMin: 0, sleepEndMin: 0 } });
  const send = vi.fn().mockResolvedValue(NOT_APPLIED);
  useGame.mockReturnValue({ save: quiet, outcome: null, error: null, send });
  const ui = render(<App />);
  useGame.mockReturnValue({ save: quiet, outcome: { action: 'feed', result: 'ok' }, error: null, send });
  ui.rerender(<App />);
  expect(freqs).toEqual([]);
  vi.unstubAllGlobals();
});

test('the outing button opens the outing panel', () => {
  setup();
  fireEvent.click(screen.getByLabelText('action_outing'));
  expect(screen.getByText('panel_outing_title')).toBeTruthy();
});

test('choosing fishing closes the panel and starts the fishing outing', () => {
  const { send } = setup();
  fireEvent.click(screen.getByLabelText('action_outing'));
  fireEvent.click(screen.getByText('outing_fishing'));
  expect(screen.queryByText('panel_outing_title')).toBeNull();
  expect(send).not.toHaveBeenCalled();
});

test('the food panel shows the pantry counts', () => {
  setup(null, {}, { kitchen: { ...EMPTY_KITCHEN, pantry: { fish: 5 } } });
  fireEvent.click(screen.getByLabelText('action_feed'));
  expect(screen.getByText('×5')).toBeTruthy();
});

function startFishing(send: ReturnType<typeof vi.fn>) {
  vi.useFakeTimers({
    toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
      'requestAnimationFrame', 'cancelAnimationFrame', 'performance'],
  });
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({ fillRect: vi.fn(), fillText: vi.fn() })) as never;
  fireEvent.click(screen.getByLabelText('action_outing'));
  fireEvent.click(screen.getByText('outing_fishing'));
  expect(send).not.toHaveBeenCalled();
}

test('an active outing shows the outing game', () => {
  const { send } = setup();
  startFishing(send);
  expect(screen.getByRole('dialog', { name: 'outing_fishing' })).toBeTruthy();
  expect(screen.getByText('outing_hint_fishing')).toBeTruthy();
});

test('finishing an outing shows what was gained and plays the get sound', async () => {
  const freqs = stubAudio();
  const { send } = setup();
  send.mockResolvedValue({ ok: true, gained: { fish: 2 } });
  startFishing(send);
  await act(async () => void vi.advanceTimersByTime(15_000 + 1500 + 200));
  expect(send).toHaveBeenCalledWith({ type: 'forage', kind: 'fishing', score: 0 });
  expect(screen.getByText('gained_title')).toBeTruthy();
  expect(screen.getByText('×2')).toBeTruthy();
  expect(freqs.slice(-2)).toEqual([784, 1047]);
  await act(async () => void vi.advanceTimersByTime(2500));
  expect(screen.queryByText('gained_title')).toBeNull();
  vi.unstubAllGlobals();
});

test('an empty haul shows nothing and plays no sound', async () => {
  const freqs = stubAudio();
  const { send } = setup();
  send.mockResolvedValue({ ok: true, gained: {} });
  startFishing(send);
  await act(async () => void vi.advanceTimersByTime(15_000 + 1500 + 200));
  expect(send).toHaveBeenCalled();
  expect(screen.queryByText('gained_title')).toBeNull();
  expect(freqs).toEqual([]);
  vi.unstubAllGlobals();
});

test('closing the game mid-way sends nothing', async () => {
  const { send } = setup();
  startFishing(send);
  fireEvent.click(screen.getByText('game_quit'));
  expect(screen.queryByRole('dialog')).toBeNull();
  await act(async () => void vi.advanceTimersByTime(20_000));
  expect(send).not.toHaveBeenCalled();
});

test('an ok cook plays the pot effect, then the ready note', async () => {
  vi.useFakeTimers();
  const freqs = stubAudio();
  const { send, ui } = setup(null, {}, { kitchen: { ...EMPTY_KITCHEN, pantry: { egg: 2 } } });
  send.mockResolvedValueOnce({ ok: true, save: fullSave(), outcome: { action: 'cook', result: 'ok' }, cooked: { dish: 'omurice', first: true } });
  fireEvent.click(screen.getByLabelText('action_feed'));
  fireEvent.click(screen.getByRole('tab', { name: 'tab_cook' }));
  fireEvent.click(screen.getByText('food_rice'));
  fireEvent.click(screen.getByText('food_egg'));
  fireEvent.click(screen.getByText('cook_make'));
  await flush();
  expect(ui.container.querySelector('img.fx-prop--cook')).not.toBeNull();
  expect(freqs.slice(0, 4)).toEqual([262, 294, 262, 294]);
  expect(screen.queryByText('cooked_title')).toBeNull();
  advance(1599);
  expect(screen.queryByText('cooked_title')).toBeNull();
  advance(1);
  expect(ui.container.querySelector('.fx-prop')).toBeNull();
  expect(screen.getByText('cooked_title')).toBeTruthy();
  expect(screen.getByText('cooked_first')).toBeTruthy();
  expect(freqs.slice(-4)).toEqual([659, 784, 988, 1319]);
  advance(2500);
  expect(screen.queryByText('cooked_title')).toBeNull();
  vi.unstubAllGlobals();
});
