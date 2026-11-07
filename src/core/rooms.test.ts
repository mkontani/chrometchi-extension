import { describe, expect, test } from 'vitest';
import { ownedRooms, roomUnlockedBy, shownRoom } from './rooms';
import type { RewardId } from './types';

describe('rooms', () => {
  test('a new player owns only home', () => {
    expect(ownedRooms([])).toEqual(['home']);
  });

  test('owned rooms follow the claimed rewards, in table order', () => {
    const claimed: RewardId[] = ['zukan:20', 'mission:clean:2', 'ending:first', 'zukan:10'];
    expect(ownedRooms(claimed)).toEqual(['home', 'garden', 'beach', 'forest', 'washitsu']);
  });

  test('a room that is not owned is shown as home', () => {
    expect(shownRoom('beach', ['zukan:10'])).toBe('beach');
    expect(shownRoom('beach', [])).toBe('home');
    expect(shownRoom('home', [])).toBe('home');
  });

  test('roomUnlockedBy maps reward ids to rooms', () => {
    expect(roomUnlockedBy('zukan:30')).toBe('sweets');
    expect(roomUnlockedBy('zukan:60')).toBeNull();
    expect(roomUnlockedBy('ending:first')).toBe('garden');
  });
});
