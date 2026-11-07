import { cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { afterEach, expect, test, vi } from 'vitest';
import { App } from './App';
import { useGame, requestRoamAccess, pet, fullSave, save, PET_LABEL, NOT_APPLIED, setup } from './appTestUtils';

vi.mock('@/i18n/t', async () => (await import('./appTestUtils')).i18nMock);
vi.mock('@/ui/assets', async () => (await import('./appTestUtils')).assetsMock);
vi.mock('@/ui/useGame', async () => (await import('./appTestUtils')).useGameMock);
vi.mock('@/ui/roamPermission', async () => (await import('./appTestUtils')).roamPermissionMock);

afterEach(() => {
  cleanup();
  vi.useRealTimers();
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
  expect(screen.getByRole('tablist', { name: 'zukan_title' })).toBeTruthy();
  expect(tabs[0]?.getAttribute('aria-selected')).toBe('true');
  expect(document.querySelector('.zukan__section')).not.toBeNull();
  expect(document.querySelector('.recipes')).toBeNull();
  fireEvent.click(screen.getByRole('tab', { name: 'zukan_tab_recipes' }));
  expect(screen.getByRole('tab', { name: 'zukan_tab_recipes' }).getAttribute('aria-selected')).toBe('true');
  expect(document.querySelector('.recipes')).not.toBeNull();
  expect(document.querySelector('.zukan__section')).toBeNull();
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
