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

test.each(['action_feed', 'action_play'])(
  'the %s panel and the critical banner overlay the stage instead of pushing it',
  (button) => {
    const { ui } = setup(null, { stats: { ...pet.stats, vitality: 10 }, criticalSeenAt: 3 });
    fireEvent.click(screen.getByLabelText(button));
    const inArea = (selector: string) => ui.container.querySelector(`.stage-area ${selector}`);
    expect(inArea('.stage')).toBeInstanceOf(HTMLElement);
    expect(inArea('.stage-area__overlay--bottom .panel')).toBeInstanceOf(HTMLElement);
    expect(inArea('.stage-area__overlay--top .critical-banner')).toBeInstanceOf(HTMLElement);
  },
);

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

const critStats = { ...pet.stats, hunger: 0, mood: 0, vitality: 0 };
const notice = { meta: { lastNotified: {}, showRenewal: true, showDataReset: false } };
const acks = (send: ReturnType<typeof vi.fn>) =>
  send.mock.calls.filter(([r]) => r.type === 'ackCritical').length;

test('notice replaces the ending layer; ending replaces the main screen', () => {
  setup(null, { lifecycle: 'dead' }, notice);
  expect(screen.getByText('notice_renewal')).toBeTruthy();
  expect(screen.queryByText('ending_dead_title')).toBeNull();
  expect(screen.queryByLabelText('action_feed')).toBeNull();
  cleanup();
  setup(null, { lifecycle: 'dead' });
  expect(screen.getByText('ending_dead_title')).toBeTruthy();
  expect(screen.queryByLabelText('action_feed')).toBeNull();
  expect(screen.queryByLabelText('action_pet')).toBeNull();
});

test('main screen is not mounted while zukan or settings is open', () => {
  setup();
  fireEvent.click(screen.getByLabelText('action_zukan'));
  expect(screen.getByText('zukan_title')).toBeTruthy();
  expect(screen.queryByLabelText('action_feed')).toBeNull();
  expect(screen.queryByLabelText('action_pet')).toBeNull();
});

test('mini-game replaces zukan layer and main screen', () => {
  setup();
  fireEvent.click(screen.getByLabelText('action_play'));
  fireEvent.click(screen.getByText('game_catch'));
  expect(screen.getByText('game_hint_catch')).toBeTruthy();
  expect(screen.queryByLabelText('action_feed')).toBeNull();
  expect(screen.queryByText('zukan_title')).toBeNull();
});

test('a running mini-game disappears when the pet dies and never sends play', () => {
  const send = vi.fn().mockResolvedValue(undefined);
  useGame.mockReturnValue({ save: fullSave(), outcome: null, error: null, send });
  const ui = render(<App />);
  fireEvent.click(screen.getByLabelText('action_play'));
  fireEvent.click(screen.getByText('game_catch'));
  expect(screen.getByText('game_hint_catch')).toBeTruthy();
  useGame.mockReturnValue({ save: fullSave({ lifecycle: 'dead' }), outcome: null, error: null, send });
  ui.rerender(<App />);
  expect(screen.queryByText('game_hint_catch')).toBeNull();
  expect(screen.getByText('ending_dead_title')).toBeTruthy();
  // pet "revived" by a new egg must not resurrect the old game
  useGame.mockReturnValue({ save: fullSave(), outcome: null, error: null, send });
  ui.rerender(<App />);
  expect(screen.queryByText('game_hint_catch')).toBeNull();
  expect(send).not.toHaveBeenCalled();
});

test('no ackCritical while zukan is open; sent once after returning', () => {
  const { send } = setup(null, { stats: critStats, criticalSeenAt: null }, { _x: 1 });
  // main screen shows first, so ack was already sent once
  expect(acks(send)).toBe(1);
  cleanup();
  const s2 = setup(null, { stats: critStats, criticalSeenAt: null, lifecycle: 'dead' });
  expect(acks(s2.send)).toBe(0);
});

test('ack is deferred while a notice hides the main screen', () => {
  const send = vi.fn().mockResolvedValue(undefined);
  const crit = { stats: critStats, criticalSeenAt: null };
  useGame.mockReturnValue({ save: fullSave(crit, notice), outcome: null, error: null, send });
  const ui = render(<App />);
  expect(acks(send)).toBe(0);
  useGame.mockReturnValue({ save: fullSave(crit), outcome: null, error: null, send });
  ui.rerender(<App />);
  expect(acks(send)).toBe(1);
});

test('Escape closes the zukan overlay', () => {
  setup();
  fireEvent.click(screen.getByLabelText('action_zukan'));
  fireEvent.keyDown(screen.getByText('zukan_title'), { key: 'Escape' });
  expect(screen.queryByText('zukan_title')).toBeNull();
});

test('Escape in the restart dialog cancels only the dialog', () => {
  setup();
  fireEvent.click(screen.getByLabelText('action_settings'));
  fireEvent.click(screen.getByText('settings_restart'));
  fireEvent.keyDown(screen.getByText('confirm_yes'), { key: 'Escape' });
  expect(screen.queryByRole('alertdialog')).toBeNull();
  expect(screen.getByText('settings_title')).toBeTruthy();
});

function stubAudio() {
  const freqs: number[] = [];
  class FakeAudioContext {
    currentTime = 0;
    state = 'running';
    destination = {};
    resume = vi.fn().mockResolvedValue(undefined);
    createGain() {
      return { gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn() };
    }
    createOscillator() {
      const osc = {
        type: '',
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        frequency: {
          set value(v: number) {
            freqs.push(v);
          },
        },
      };
      return osc;
    }
  }
  vi.stubGlobal('AudioContext', FakeAudioContext);
  return freqs;
}

test('an ok feed outcome plays the eat sound when sound is on', () => {
  const freqs = stubAudio();
  const send = vi.fn().mockResolvedValue(undefined);
  useGame.mockReturnValue({ save, outcome: null, error: null, send });
  const ui = render(<App />);
  useGame.mockReturnValue({ save, outcome: { action: 'feed', result: 'ok' }, error: null, send });
  ui.rerender(<App />);
  expect(freqs).toEqual([523, 659]);
  vi.unstubAllGlobals();
});

test('no sound plays when the sound setting is off', () => {
  const freqs = stubAudio();
  const quiet = fullSave({}, { settings: { notifications: true, sound: false, sleepStartMin: 0, sleepEndMin: 0 } });
  const send = vi.fn().mockResolvedValue(undefined);
  useGame.mockReturnValue({ save: quiet, outcome: null, error: null, send });
  const ui = render(<App />);
  useGame.mockReturnValue({ save: quiet, outcome: { action: 'feed', result: 'ok' }, error: null, send });
  ui.rerender(<App />);
  expect(freqs).toEqual([]);
  vi.unstubAllGlobals();
});
