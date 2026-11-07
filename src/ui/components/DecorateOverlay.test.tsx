import { cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { afterEach, expect, test, vi } from 'vitest';
import type { CareOutcome, RewardId } from '@/core/types';
import { createFreshSave } from '@/storage/repository';
import type { SaveV1 } from '@/storage/schema';
import { makePet } from './__fixtures__/pet';
import { DecorateOverlay } from './DecorateOverlay';

vi.mock('@/i18n/t', () => ({
  t: (k: string, subs?: string | string[]) => ((k.endsWith('_aria') || k === 'slot_filled') && subs !== undefined ? `${k}:${[subs].flat().join(',')}` : k),
}));
vi.mock('@/ui/assets', () => ({
  spriteUrl: (_f: string, pose: string) => `sprite-${pose}.png`,
  effectUrl: () => null,
  cookUrl: () => 'pot.png',
  backgroundUrl: () => null,
  iconUrl: () => null,
  decorUrl: () => null,
  accUrl: () => null,
  foodUrl: (food: string, bites: number) => `food-${food}-${bites}.png`,
}));

afterEach(cleanup);

/** What `send` resolves to when a test does not care about the engine's answer. */
const NOT_APPLIED = { ok: false, error: 'not applied in this test' } as const;

/** A fresh save with an awake child, the given rewards claimed, and the given home. */
function saveWith(home: Partial<SaveV1['home']>, claimed: RewardId[] = []): SaveV1 {
  const base = createFreshSave(0);
  return {
    ...base,
    game: { ...base.game, pet: makePet() },
    progress: { ...base.progress, claimed },
    home: { ...base.home, ...home },
  };
}

function overlay(save: SaveV1, outcome: CareOutcome | null = null) {
  const send = vi.fn().mockResolvedValue(NOT_APPLIED);
  const view = (next: SaveV1) => <DecorateOverlay save={next} outcome={outcome} send={send} onClose={vi.fn()} />;
  const ui = render(view(save));
  return { send, rerender: (next: SaveV1) => ui.rerender(view(next)) };
}

const withDecor = (room: SaveV1['home']['room']) =>
  saveWith({ room, ownedDecor: ['candle', 'clock'], decor: { [room]: { floorL: 'candle' } } }, ['ending:first']);

test('choosing a slot and an item sends placeDecor for the shown room', () => {
  const { send } = overlay(withDecor('home'));
  expect(screen.getByRole('tab', { name: 'decorate_tab_room' }).getAttribute('aria-selected')).toBe('true');
  fireEvent.click(screen.getByRole('tab', { name: 'decorate_tab_decor' }));
  expect(screen.getByRole('button', { name: 'slot_wallL' }).getAttribute('aria-pressed')).toBe('true');
  expect(screen.getByRole('button', { name: 'slot_filled:slot_floorL,decor_candle' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'decor_clock' }));
  expect(send).toHaveBeenCalledWith({ type: 'placeDecor', room: 'home', slot: 'wallL', decor: 'clock' });
  fireEvent.click(screen.getByRole('button', { name: 'slot_filled:slot_floorL,decor_candle' }));
  fireEvent.click(screen.getByRole('button', { name: 'decor_remove' }));
  expect(send).toHaveBeenCalledWith({ type: 'placeDecor', room: 'home', slot: 'floorL', decor: null });
});

test('an outdoor room offers only floor and rug slots', () => {
  overlay(withDecor('garden'));
  fireEvent.click(screen.getByRole('tab', { name: 'decorate_tab_decor' }));
  const slots = screen.getAllByRole('button', { name: /^slot_/ }).map((b) => b.getAttribute('aria-label'));
  expect(slots).toEqual(['slot_rug', 'slot_filled:slot_floorL,decor_candle', 'slot_floorR']);
});

test('a refused placement shows its reason inside the decorate overlay', () => {
  overlay(withDecor('home'), { action: 'place', result: 'refused', reason: 'wrongSlot' });
  expect(screen.getByText('refuse_wrongSlot')).toBeTruthy();
});

test("a slot chosen in one room falls back to that room's first slot after switching to the beach", () => {
  const withBeach = (room: SaveV1['home']['room']) => saveWith({ room, ownedDecor: ['candle'], decor: {} }, ['zukan:10']);
  const { rerender } = overlay(withBeach('home'));
  fireEvent.click(screen.getByRole('tab', { name: 'decorate_tab_decor' }));
  fireEvent.click(screen.getByRole('button', { name: 'slot_wallL' }));
  expect(screen.getByRole('button', { name: 'slot_wallL' }).getAttribute('aria-pressed')).toBe('true');
  rerender(withBeach('beach'));
  expect(screen.queryByRole('button', { name: 'slot_wallL' })).toBeNull();
  expect(screen.getByRole('button', { name: 'slot_rug' }).getAttribute('aria-pressed')).toBe('true');
});

const withAcc = (worn: SaveV1['home']['worn'] = {}) => saveWith({ ownedAcc: ['ribbon', 'crown', 'glasses'], worn });
const dressTab = () => fireEvent.click(screen.getByRole('tab', { name: 'decorate_tab_dress' }));

test('the decorate header has room, furniture and dress-up tabs', () => {
  overlay(withAcc());
  const names = screen.getAllByRole('tab').map((b) => b.textContent);
  expect(names).toEqual(['decorate_tab_room', 'decorate_tab_decor', 'decorate_tab_dress']);
  expect(screen.getByRole('tablist', { name: 'decorate_title' })).toBeTruthy();
});

test('the dress-up tab lists owned items for the chosen place', () => {
  overlay(withAcc({ face: 'glasses' }));
  dressTab();
  expect(screen.getByRole('button', { name: 'wear_head' }).getAttribute('aria-pressed')).toBe('true');
  expect(screen.getByRole('button', { name: 'acc_ribbon' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'acc_glasses' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'wear_face, acc_glasses' }));
  expect(screen.getByRole('button', { name: 'acc_glasses' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'acc_ribbon' })).toBeNull();
});

test('choosing an item sends wear, and take off sends null', () => {
  const { send } = overlay(withAcc({ head: 'ribbon' }));
  dressTab();
  fireEvent.click(screen.getByRole('button', { name: 'acc_crown' }));
  expect(send).toHaveBeenCalledWith({ type: 'wear', place: 'head', acc: 'crown' });
  fireEvent.click(screen.getByRole('button', { name: 'dress_remove' }));
  expect(send).toHaveBeenCalledWith({ type: 'wear', place: 'head', acc: null });
});

test('with nothing owned for a place it says where to buy', () => {
  overlay(withAcc());
  dressTab();
  fireEvent.click(screen.getByRole('button', { name: 'wear_neck' }));
  expect(screen.getByText('dress_empty')).toBeTruthy();
});

test('a refused wear shows its reason inside the decorate overlay', () => {
  overlay(withAcc(), { action: 'wear', result: 'refused', reason: 'asleep' });
  expect(screen.getByText('refuse_asleep')).toBeTruthy();
});
