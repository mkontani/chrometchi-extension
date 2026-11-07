import { cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { afterEach, expect, test, vi } from 'vitest';
import { ROOM_IDS } from '@/data/rooms';
import { RoomPicker } from './RoomPicker';

vi.mock('@/i18n/t', () => ({
  t: (k: string, subs?: string | string[]) => (subs === undefined ? k : `${k}:${[subs].flat().join(',')}`),
}));
vi.mock('@/ui/assets', () => ({ backgroundUrl: (id: string) => `${id}.png` }));

afterEach(cleanup);

test('owned rooms can be chosen and the current one is pressed', () => {
  const onPick = vi.fn();
  render(<RoomPicker owned={['home', 'beach']} current="beach" onPick={onPick} />);
  expect(screen.getAllByRole('button')).toHaveLength(ROOM_IDS.length);
  const beach = screen.getByRole('button', { name: /room_beach/ });
  expect(beach.getAttribute('aria-pressed')).toBe('true');
  const home = screen.getByRole('button', { name: /room_home/ });
  expect(home.getAttribute('aria-pressed')).toBe('false');
  fireEvent.click(home);
  expect(onPick).toHaveBeenCalledWith('home');
});

test('locked rooms show how to earn them and cannot be chosen', () => {
  const onPick = vi.fn();
  render(<RoomPicker owned={['home']} current="home" onPick={onPick} />);
  const disabled = screen.getAllByRole('button').filter((b) => (b as HTMLButtonElement).disabled);
  expect(disabled).toHaveLength(10);
  expect(screen.getByRole('button', { name: /room_beach.*room_locked.*reward_zukan:10/ })).toBeTruthy();
  expect(screen.getByRole('button', { name: /room_washitsu.*reward_mission:mission_clean,30/ })).toBeTruthy();
  expect(screen.getByRole('button', { name: /room_garden.*room_unlock_first/ })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /room_beach/ }));
  expect(onPick).not.toHaveBeenCalled();
});
