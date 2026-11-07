import { act, cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { afterEach, expect, test, vi } from 'vitest';
import type { CareOutcome } from '@/core/types';
import { EMPTY_KITCHEN } from '@/core/kitchen';
import { EMPTY_PROGRESS } from '@/core/progress';
import type { UseGame } from '@/ui/useGame';
import { App } from './App';
import { useGame, fullSave, save, NOT_APPLIED, setup, stubAudio } from './appTestUtils';

vi.mock('@/i18n/t', async () => (await import('./appTestUtils')).i18nMock);
vi.mock('@/ui/assets', async () => (await import('./appTestUtils')).assetsMock);
vi.mock('@/ui/useGame', async () => (await import('./appTestUtils')).useGameMock);
vi.mock('@/ui/roamPermission', async () => (await import('./appTestUtils')).roamPermissionMock);

afterEach(() => {
  cleanup();
  vi.useRealTimers();
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

/**
 * A stand-in for useGame that, like the real one, sets the last outcome from every response.
 * A sync response carries none, so it sets the outcome back to null.
 */
function liveGame(buyAnswer: typeof BOUGHT) {
  const rich = fullSave({}, { progress: { ...EMPTY_PROGRESS, coins: 500 } });
  let state: UseGame;
  const send = vi.fn(async (req: { type: string }) => {
    const r = req.type === 'sync' ? ({ ok: true, save: rich } as const) : buyAnswer;
    state = { ...state, outcome: 'outcome' in r ? (r.outcome as CareOutcome) : null };
    return r;
  });
  state = { save: rich, outcome: null, error: null, send } as unknown as UseGame;
  useGame.mockImplementation(() => state);
  return send;
}

const buyIn = async (label: string) => {
  fireEvent.click(screen.getByRole('button', { name: label }));
  fireEvent.click(screen.getByRole('button', { name: 'shop_buy' }));
  await act(async () => undefined);
  await act(async () => undefined);
};

test('the bought hint hides on time even when a sync clears the outcome', async () => {
  vi.useFakeTimers();
  const send = liveGame(BOUGHT);
  const ui = render(<App />);
  fireEvent.click(screen.getByLabelText('action_shop'));
  await buyIn('shop_buy_aria:decor_candle');
  ui.rerender(<App />);
  expect(screen.getByText('shop_bought')).toBeTruthy();
  act(() => void vi.advanceTimersByTime(1000));
  await act(async () => void (await send({ type: 'sync' })));
  ui.rerender(<App />);
  act(() => void vi.advanceTimersByTime(1500));
  expect(screen.queryByText('shop_bought')).toBeNull();
  act(() => void vi.advanceTimersByTime(60_000));
  expect(screen.queryByText('shop_bought')).toBeNull();
  vi.useRealTimers();
});

test('buying an accessory sends buyAccessory and says where to put it on', async () => {
  vi.useFakeTimers();
  const send = liveGame(BOUGHT);
  const ui = render(<App />);
  fireEvent.click(screen.getByLabelText('action_shop'));
  fireEvent.click(screen.getByRole('tab', { name: 'shop_tab_acc' }));
  await buyIn('shop_buy_aria:acc_ribbon');
  ui.rerender(<App />);
  expect(send).toHaveBeenCalledWith({ type: 'buyAccessory', acc: 'ribbon' });
  expect(screen.getByText('shop_bought_acc')).toBeTruthy();
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
