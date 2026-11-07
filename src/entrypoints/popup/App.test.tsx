import { act, cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { afterEach, expect, test, vi } from 'vitest';
import type { CareOutcome } from '@/core/types';
import { createEgg } from '@/core/factory';
import { EMPTY_KITCHEN } from '@/core/kitchen';
import { EMPTY_PROGRESS } from '@/core/progress';
import type { UseGame } from '@/ui/useGame';
import { App } from './App';

vi.mock('@/i18n/t', () => ({
  t: (k: string, subs?: string | string[]) => (k.endsWith('_aria') && subs !== undefined ? `${k}:${[subs].flat().join(',')}` : k),
}));
vi.mock('@/ui/assets', () => ({
  spriteUrl: (_f: string, pose: string) => `sprite-${pose}.png`,
  effectUrl: () => null,
  cookUrl: () => 'pot.png',
  backgroundUrl: (id: string) => backgroundUrl(id),
  iconUrl: () => null,
  decorUrl: () => null,
  assetUrl: () => null,
  gameArtUrl: () => null,
  foodUrl: (food: string, bites: number) => `food-${food}-${bites}.png`,
}));
const backgroundUrl = vi.hoisted(() => vi.fn<(id: string) => string | null>(() => null));
const useGame = vi.fn<() => UseGame>();
vi.mock('@/ui/useGame', () => ({ useGame: () => useGame() }));
const requestRoamAccess = vi.fn<() => Promise<boolean>>();
vi.mock('@/ui/roamPermission', () => ({ requestRoamAccess: () => requestRoamAccess() }));

const pet = { ...createEgg(), stage: 'child' as const, formId: 'child_kemu' as const, poops: 2, sick: true };
const fullSave = (petPatch: object = {}, extra: object = {}) =>
  ({
    game: { pet: { ...pet, ...petPatch }, generation: 1, lastTickAt: 0 },
    zukan: { discovered: ['egg', 'baby_puni'], memories: [] },
    kitchen: EMPTY_KITCHEN,
    progress: EMPTY_PROGRESS,
    home: { room: 'home', ownedDecor: [], decor: {} },
    settings: { notifications: true, sound: true, sleepStartMin: 1320, sleepEndMin: 420, roam: false, roamHiddenSites: [] },
    meta: { lastNotified: {}, showRenewal: false, showDataReset: false },
    ...extra,
  }) as unknown as NonNullable<UseGame['save']>;
const save = fullSave();
const PET_LABEL = 'action_pet: form_child_kemu';
/** What `send` resolves to when a test does not care about the engine's answer. */
const NOT_APPLIED = { ok: false, error: 'not applied in this test' } as const;

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


afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function setup(outcome: CareOutcome | null = null, petPatch: object = {}, extra: object = {}) {
  const send = vi.fn().mockResolvedValue(NOT_APPLIED);
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

/** Answers a care like the engine: ok with the given outcome and the save after it. */
const answered = (outcome: CareOutcome, petPatch: object = {}) =>
  ({ ok: true, save: fullSave(petPatch), outcome }) as const;
const flush = () => act(async () => void (await Promise.resolve()));
const advance = (ms: number) => act(() => void vi.advanceTimersByTime(ms));
const petSrc = (c: Element) => c.querySelector('img.pet')?.getAttribute('src') ?? '';

async function feedRice(send: ReturnType<typeof vi.fn>) {
  send.mockResolvedValueOnce(answered({ action: 'feed', result: 'ok' }));
  fireEvent.click(screen.getByLabelText('action_feed'));
  fireEvent.click(screen.getByText('food_rice'));
  await flush();
}

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

test('zukan opens as an overlay, closing the food panel, and closes again', () => {
  setup();
  fireEvent.click(screen.getByLabelText('action_feed'));
  fireEvent.click(screen.getByLabelText('action_zukan'));
  expect(screen.queryByText('panel_food_title')).toBeNull();
  expect(screen.getByText('zukan_title')).toBeTruthy();
  fireEvent.click(screen.getByLabelText('close'));
  expect(screen.queryByText('zukan_title')).toBeNull();
});

test('the zukan has Pets and Recipes tabs; Pets shows today\'s zukan first', () => {
  setup();
  fireEvent.click(screen.getByLabelText('action_zukan'));
  const tabs = screen.getAllByRole('tab');
  expect(tabs.map((b) => b.textContent)).toEqual(['zukan_tab_pets', 'zukan_tab_recipes', 'zukan_tab_missions']);
  expect(tabs[0]?.getAttribute('aria-selected')).toBe('true');
  expect(document.querySelector('.zukan__grid')).not.toBeNull();
  expect(document.querySelector('.recipes')).toBeNull();
  fireEvent.click(screen.getByRole('tab', { name: 'zukan_tab_recipes' }));
  expect(screen.getByRole('tab', { name: 'zukan_tab_recipes' }).getAttribute('aria-selected')).toBe('true');
  expect(document.querySelector('.recipes')).not.toBeNull();
  expect(document.querySelector('.zukan__grid')).toBeNull();
});

test('roam stays off when site access is refused', async () => {
  requestRoamAccess.mockResolvedValueOnce(false);
  const { send } = setup();
  fireEvent.click(screen.getByLabelText('action_settings'));
  fireEvent.click(screen.getByLabelText('settings_roam'));
  await vi.waitFor(() => expect(requestRoamAccess).toHaveBeenCalled());
  await Promise.resolve();
  expect(send).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'updateSettings' }));
});

test('roam turns on after site access is granted', async () => {
  requestRoamAccess.mockResolvedValueOnce(true);
  const { send } = setup();
  fireEvent.click(screen.getByLabelText('action_settings'));
  fireEvent.click(screen.getByLabelText('settings_roam'));
  await vi.waitFor(() => expect(send).toHaveBeenCalledWith({ type: 'updateSettings', patch: { roam: true } }));
});

test('turning roam off needs no permission prompt', async () => {
  const { send } = setup(null, {}, { settings: { ...save.settings, roam: true } });
  requestRoamAccess.mockClear();
  fireEvent.click(screen.getByLabelText('action_settings'));
  fireEvent.click(screen.getByLabelText('settings_roam'));
  await vi.waitFor(() => expect(send).toHaveBeenCalledWith({ type: 'updateSettings', patch: { roam: false } }));
  expect(requestRoamAccess).not.toHaveBeenCalled();
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
  expect(screen.queryByLabelText(PET_LABEL)).toBeNull();
});

test('main screen is not mounted while zukan or settings is open', () => {
  setup();
  fireEvent.click(screen.getByLabelText('action_zukan'));
  expect(screen.getByText('zukan_title')).toBeTruthy();
  expect(screen.queryByLabelText('action_feed')).toBeNull();
  expect(screen.queryByLabelText(PET_LABEL)).toBeNull();
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
  const send = vi.fn().mockResolvedValue(NOT_APPLIED);
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
  const send = vi.fn().mockResolvedValue(NOT_APPLIED);
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
    resume = vi.fn().mockResolvedValue(NOT_APPLIED);
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

test('the status bar shows the coins and the clicking the shop sends no request', () => {
  const send = vi.fn(() => Promise.resolve(NOT_APPLIED));
  useGame.mockReturnValue({
    save: fullSave({}, { progress: { ...EMPTY_PROGRESS, coins: 321, unseen: true } }),
    outcome: null, error: null, send,
  });
  render(<App />);
  expect(screen.getByRole('img', { name: 'coins_aria:321' }).textContent).toContain('321');
  expect(screen.getByLabelText('action_zukan new_rewards')).toBeTruthy();
  fireEvent.click(screen.getByLabelText('action_shop'));
  expect(send).not.toHaveBeenCalled();
});

test('the shop button opens the shop overlay and selling sends a sell request', () => {
  const kitchen = { ...EMPTY_KITCHEN, pantry: { ...EMPTY_KITCHEN.pantry, fish: 3 } };
  const { send } = setup(null, {}, { kitchen });
  fireEvent.click(screen.getByLabelText('action_shop'));
  expect(screen.getByText('shop_title')).toBeTruthy();
  fireEvent.click(screen.getByRole('tab', { name: 'shop_tab_sell' }));
  fireEvent.click(screen.getByRole('button', { name: 'shop_sell_all_aria:food_fish' }));
  expect(send).toHaveBeenCalledWith({ type: 'sell', food: 'fish', amount: 3 });
});

test('opening the missions tab sends seenRewards when there is a dot', () => {
  const send = vi.fn(() => Promise.resolve(NOT_APPLIED));
  useGame.mockReturnValue({
    save: fullSave({}, { progress: { ...EMPTY_PROGRESS, unseen: true } }),
    outcome: null, error: null, send,
  });
  render(<App />);
  fireEvent.click(screen.getByLabelText('action_zukan new_rewards'));
  expect(send).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('tab', { name: 'zukan_tab_missions new_rewards' }));
  expect(send).toHaveBeenCalledWith({ type: 'seenRewards' });
  expect(document.querySelector('.missions')).not.toBeNull();
});

test('opening the missions tab sends nothing when there is no dot', () => {
  const { send } = setup(null, {}, {});
  fireEvent.click(screen.getByLabelText('action_zukan'));
  fireEvent.click(screen.getByRole('tab', { name: 'zukan_tab_missions' }));
  expect(send).not.toHaveBeenCalled();
});

test('clicking the missions tab again does not send seenRewards twice', () => {
  const send = vi.fn(() => Promise.resolve(NOT_APPLIED));
  useGame.mockReturnValue({
    save: fullSave({}, { progress: { ...EMPTY_PROGRESS, unseen: true } }),
    outcome: null, error: null, send,
  });
  render(<App />);
  fireEvent.click(screen.getByLabelText('action_zukan new_rewards'));
  fireEvent.click(screen.getByRole('tab', { name: 'zukan_tab_missions new_rewards' }));
  fireEvent.click(screen.getByRole('tab', { name: 'zukan_tab_missions new_rewards' }));
  expect(send).toHaveBeenCalledTimes(1);
});

test('a reward that arrives while the missions tab is open is marked seen', () => {
  const send = vi.fn(() => Promise.resolve(NOT_APPLIED));
  const game = (unseen: boolean): UseGame => ({
    save: fullSave({}, { progress: { ...EMPTY_PROGRESS, unseen } }),
    outcome: null, error: null, send,
  });
  useGame.mockReturnValue(game(false));
  const { rerender } = render(<App />);
  fireEvent.click(screen.getByLabelText('action_zukan'));
  fireEvent.click(screen.getByRole('tab', { name: 'zukan_tab_missions' }));
  expect(send).not.toHaveBeenCalled();
  useGame.mockReturnValue(game(true));
  rerender(<App />);
  expect(send).toHaveBeenCalledTimes(1);
  expect(send).toHaveBeenCalledWith({ type: 'seenRewards' });
});

test('a refused sell plays no sound and shows no toast after the shop closes', () => {
  const freqs = stubAudio();
  const send = vi.fn().mockResolvedValue(NOT_APPLIED);
  useGame.mockReturnValue({ save, outcome: null, error: null, send });
  const ui = render(<App />);
  fireEvent.click(screen.getByLabelText('action_shop'));
  const refused: CareOutcome = { action: 'sell', result: 'refused', reason: 'noStock' };
  useGame.mockReturnValue({ save, outcome: refused, error: null, send });
  ui.rerender(<App />);
  expect(freqs).toEqual([]);
  fireEvent.click(screen.getByLabelText('close'));
  expect(screen.queryByText('refuse_noStock')).toBeNull();
  vi.unstubAllGlobals();
});

test('the missions tab shows a dot while there are new rewards', () => {
  const send = vi.fn(() => Promise.resolve(NOT_APPLIED));
  useGame.mockReturnValue({
    save: fullSave({}, { progress: { ...EMPTY_PROGRESS, unseen: true } }),
    outcome: null, error: null, send,
  });
  render(<App />);
  fireEvent.click(screen.getByLabelText('action_zukan new_rewards'));
  const missions = screen.getByRole('tab', { name: 'zukan_tab_missions new_rewards' });
  expect(missions.querySelector('.panel__tab-dot')).not.toBeNull();
  expect(screen.getByRole('tab', { name: 'zukan_tab_pets' }).querySelector('.panel__tab-dot')).toBeNull();
});

test('the decorate button opens the room list and choosing a room sends setRoom', () => {
  const claimed = ['zukan:10' as const];
  const { send } = setup(null, {}, { progress: { ...EMPTY_PROGRESS, claimed } });
  fireEvent.click(screen.getByLabelText('action_decorate'));
  expect(screen.getByText('decorate_title')).toBeTruthy();
  expect(document.querySelector('.stage')).not.toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'room_beach' }));
  expect(send).toHaveBeenCalledWith({ type: 'setRoom', room: 'beach' });
  expect(screen.getByRole('button', { name: /room_castle/ }).getAttribute('aria-disabled')).toBe('true');
});

test('the decorate overlay closes when the pet falls asleep', () => {
  const send = vi.fn().mockResolvedValue(NOT_APPLIED);
  useGame.mockReturnValue({ save, outcome: null, error: null, send });
  const ui = render(<App />);
  fireEvent.click(screen.getByLabelText('action_decorate'));
  expect(screen.getByText('decorate_title')).toBeTruthy();
  useGame.mockReturnValue({ save: fullSave({ asleep: true }), outcome: null, error: null, send });
  ui.rerender(<App />);
  expect(screen.queryByText('decorate_title')).toBeNull();
  expect(screen.getByLabelText('action_decorate')).toBeTruthy();
});

test('a refused room switch shows its reason inside the decorate overlay and not on the home screen afterwards', () => {
  const send = vi.fn().mockResolvedValue(NOT_APPLIED);
  useGame.mockReturnValue({ save, outcome: null, error: null, send });
  const ui = render(<App />);
  fireEvent.click(screen.getByLabelText('action_decorate'));
  const refused: CareOutcome = { action: 'setRoom', result: 'refused', reason: 'locked' };
  useGame.mockReturnValue({ save, outcome: refused, error: null, send });
  ui.rerender(<App />);
  expect(screen.getByText('refuse_locked')).toBeTruthy();
  fireEvent.click(screen.getByLabelText('close'));
  expect(screen.queryByText('decorate_title')).toBeNull();
  expect(screen.queryByText('refuse_locked')).toBeNull();
});

test('the shop opens on the furniture tab and the sell list is one tab away', () => {
  const progress = { ...EMPTY_PROGRESS, coins: 500 };
  const { send } = setup(null, {}, { progress });
  fireEvent.click(screen.getByLabelText('action_shop'));
  expect(screen.getByRole('tab', { name: 'shop_tab_decor' }).getAttribute('aria-selected')).toBe('true');
  expect(screen.queryByRole('button', { name: 'shop_sell_all_aria:food_fish' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'shop_buy_aria:decor_candle' }));
  fireEvent.click(screen.getByRole('button', { name: 'shop_buy' }));
  expect(send).toHaveBeenCalledWith({ type: 'buyDecor', decor: 'candle' });
  fireEvent.click(screen.getByRole('tab', { name: 'shop_tab_sell' }));
  expect(screen.getByRole('button', { name: 'shop_sell_all_aria:food_fish' })).toBeTruthy();
});

const BOUGHT = { ok: true, save, outcome: { action: 'buy', result: 'ok' } } as const;

test('a bought item shows its hint even if a sync clears the outcome, and hides it on its own', async () => {
  vi.useFakeTimers();
  const send = vi.fn().mockResolvedValue(BOUGHT);
  const progress = { ...EMPTY_PROGRESS, coins: 500 };
  const rich = fullSave({}, { progress });
  useGame.mockReturnValue({ save: rich, outcome: null, error: null, send });
  const ui = render(<App />);
  fireEvent.click(screen.getByLabelText('action_shop'));
  fireEvent.click(screen.getByRole('button', { name: 'shop_buy_aria:decor_candle' }));
  fireEvent.click(screen.getByRole('button', { name: 'shop_buy' }));
  await act(async () => undefined);
  await act(async () => undefined);
  expect(send).toHaveBeenCalled();
  expect(screen.getByText('shop_bought')).toBeTruthy();
  ui.rerender(<App />);
  act(() => void vi.advanceTimersByTime(2500));
  expect(screen.queryByText('shop_bought')).toBeNull();
  vi.useRealTimers();
});

test('a refused buy shows its reason inside the shop only', () => {
  const send = vi.fn().mockResolvedValue(NOT_APPLIED);
  useGame.mockReturnValue({ save, outcome: null, error: null, send });
  const ui = render(<App />);
  fireEvent.click(screen.getByLabelText('action_shop'));
  useGame.mockReturnValue({ save, outcome: { action: 'buy', result: 'refused', reason: 'noCoins' }, error: null, send });
  ui.rerender(<App />);
  expect(screen.getByText('refuse_noCoins')).toBeTruthy();
  expect(screen.queryByText('shop_bought')).toBeNull();
  fireEvent.click(screen.getByLabelText('close'));
  expect(screen.queryByText('refuse_noCoins')).toBeNull();
});

const withDecor = (room: string) =>
  fullSave(
    {},
    {
      progress: { ...EMPTY_PROGRESS, claimed: ['ending:first'] },
      home: { room, ownedDecor: ['candle', 'clock'], decor: { [room]: { floorL: 'candle' } } },
    },
  );

test('choosing a slot and an item sends placeDecor for the shown room', () => {
  const send = vi.fn().mockResolvedValue(NOT_APPLIED);
  useGame.mockReturnValue({ save: withDecor('home'), outcome: null, error: null, send });
  render(<App />);
  fireEvent.click(screen.getByLabelText('action_decorate'));
  expect(screen.getByRole('tab', { name: 'decorate_tab_room' }).getAttribute('aria-selected')).toBe('true');
  fireEvent.click(screen.getByRole('tab', { name: 'decorate_tab_decor' }));
  expect(screen.getByRole('button', { name: 'slot_wallL' }).getAttribute('aria-pressed')).toBe('true');
  expect(screen.getByRole('button', { name: 'slot_floorL: decor_candle' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'decor_clock' }));
  expect(send).toHaveBeenCalledWith({ type: 'placeDecor', room: 'home', slot: 'wallL', decor: 'clock' });
  fireEvent.click(screen.getByRole('button', { name: 'slot_floorL: decor_candle' }));
  fireEvent.click(screen.getByRole('button', { name: 'decor_remove' }));
  expect(send).toHaveBeenCalledWith({ type: 'placeDecor', room: 'home', slot: 'floorL', decor: null });
});

test('an outdoor room offers only floor and rug slots', () => {
  useGame.mockReturnValue({ save: withDecor('garden'), outcome: null, error: null, send: vi.fn() });
  render(<App />);
  fireEvent.click(screen.getByLabelText('action_decorate'));
  fireEvent.click(screen.getByRole('tab', { name: 'decorate_tab_decor' }));
  const slots = screen.getAllByRole('button', { name: /^slot_/ }).map((b) => b.getAttribute('aria-label'));
  expect(slots).toEqual(['slot_rug', 'slot_floorL: decor_candle', 'slot_floorR']);
});

test('a refused placement shows its reason inside the decorate overlay', () => {
  const refused: CareOutcome = { action: 'place', result: 'refused', reason: 'wrongSlot' };
  useGame.mockReturnValue({ save: withDecor('home'), outcome: refused, error: null, send: vi.fn() });
  render(<App />);
  fireEvent.click(screen.getByLabelText('action_decorate'));
  expect(screen.getByText('refuse_wrongSlot')).toBeTruthy();
});
