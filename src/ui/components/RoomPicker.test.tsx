import { act, cleanup, fireEvent, render, screen } from '@testing-library/preact';
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
  const locked = screen.getAllByRole('button').filter((b) => b.getAttribute('aria-disabled') === 'true');
  expect(locked).toHaveLength(10);
  for (const b of locked) expect((b as HTMLButtonElement).disabled).toBe(false);
  expect(screen.getByRole('button', { name: /room_beach.*room_locked.*reward_zukan:10/ })).toBeTruthy();
  expect(screen.getByRole('button', { name: /room_washitsu.*reward_mission:mission_clean,30/ })).toBeTruthy();
  expect(screen.getByRole('button', { name: /room_garden.*room_unlock_first/ })).toBeTruthy();
  const beach = screen.getByRole('button', { name: /room_beach/ });
  beach.focus();
  expect(document.activeElement).toBe(beach);
  fireEvent.click(beach);
  expect(onPick).not.toHaveBeenCalled();
});

test('the room list has an accessible name', () => {
  render(<RoomPicker owned={['home']} current="home" onPick={vi.fn()} />);
  expect(screen.getByRole('list', { name: 'room_list' })).toBeTruthy();
});

function stubScroll(el: Element, m: { scrollHeight: number; clientHeight: number; scrollTop: number }) {
  for (const k of ['scrollHeight', 'clientHeight', 'scrollTop'] as const) {
    Object.defineProperty(el, k, { configurable: true, get: () => m[k] });
  }
}

test('a scroll cue shows while rooms hide below and goes at the bottom', () => {
  const { container } = render(<RoomPicker owned={['home']} current="home" onPick={vi.fn()} />);
  const list = container.querySelector('.rooms')!;
  const m = { scrollHeight: 300, clientHeight: 150, scrollTop: 0 };
  stubScroll(list, m);
  act(() => {
    list.dispatchEvent(new Event('scroll'));
  });
  const cue = container.querySelector('.panel__more');
  expect(cue).toBeTruthy();
  expect(cue!.getAttribute('aria-hidden')).toBe('true');
  m.scrollTop = 150;
  act(() => {
    list.dispatchEvent(new Event('scroll'));
  });
  expect(container.querySelector('.panel__more')).toBeNull();
});
