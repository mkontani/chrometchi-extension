import { describe, expect, test } from 'vitest';
import {
  EMPTY_PROGRESS,
  addCoins,
  countMission,
  markSeen,
  missionStatus,
  rewardEnding,
  settleRewards,
} from './progress';
import type { Progress } from './types';

const withCounts = (counts: Partial<Progress['counts']>): Progress => ({
  ...EMPTY_PROGRESS,
  counts: { ...EMPTY_PROGRESS.counts, ...counts },
});

describe('progress', () => {
  test('coins never pass 99999 or go below 0', () => {
    expect(addCoins({ ...EMPTY_PROGRESS, coins: 99990 }, 50).coins).toBe(99999);
    expect(addCoins({ ...EMPTY_PROGRESS, coins: 10 }, -50).coins).toBe(0);
  });

  test('countMission adds one without touching the input', () => {
    const next = countMission(EMPTY_PROGRESS, 'feed');
    expect(next.counts.feed).toBe(1);
    expect(EMPTY_PROGRESS.counts.feed).toBe(0);
  });

  test('settleRewards pays each reward once', () => {
    const paid = settleRewards(EMPTY_PROGRESS, 23, 1000);
    expect(paid.coins).toBe(100);
    expect(paid.recent).toHaveLength(2);
    expect(paid.claimed).toEqual(['zukan:10', 'zukan:20']);
    expect(paid.unseen).toBe(true);
    expect(settleRewards(paid, 23, 2000)).toBe(paid);
  });

  test('a mission tier is paid when the count reaches its target', () => {
    let p = withCounts({ clean: 9 });
    expect(settleRewards(p, 0, 1)).toBe(p);
    p = settleRewards(withCounts({ clean: 10 }), 0, 1);
    expect(p.coins).toBe(30);
    expect(p.claimed).toEqual(['mission:clean:1']);
    p = settleRewards({ ...p, counts: { ...p.counts, clean: 30 } }, 0, 2);
    expect(p.coins).toBe(110);
  });

  test('a count past two targets pays both tiers in one settle', () => {
    const p = settleRewards(withCounts({ clean: 30 }), 0, 5);
    expect(p.coins).toBe(110);
    expect(p.claimed).toEqual(['mission:clean:1', 'mission:clean:2']);
    expect(p.recent).toHaveLength(2);
  });

  test('recent keeps the 5 newest, newest first', () => {
    const p = settleRewards(withCounts({ clean: 100, play: 100 }), 0, 9);
    expect(p.recent).toHaveLength(5);
    expect(p.claimed).toHaveLength(6);
    expect(p.recent[0]?.reason).toBe('mission:play:3');
  });

  test('an ending pays 100 for departed and 30 for dead, every time', () => {
    const once = rewardEnding(EMPTY_PROGRESS, 'departed', 1);
    const twice = rewardEnding(once, 'departed', 2);
    expect(twice.coins).toBe(200);
    expect(twice.recent[0]).toEqual({ reason: 'ending:departed', coins: 100, at: 2 });
    expect(twice.claimed).toEqual([]);
    expect(twice.unseen).toBe(true);
    expect(rewardEnding(EMPTY_PROGRESS, 'dead', 1).coins).toBe(30);
  });

  test('markSeen clears unseen and keeps everything else', () => {
    const p = rewardEnding(EMPTY_PROGRESS, 'dead', 1);
    expect(markSeen(p)).toEqual({ ...p, unseen: false });
  });

  test('missionStatus shows the next tier, then null when all are done', () => {
    const p = { ...withCounts({ feed: 25 }), claimed: ['mission:feed:1' as const] };
    expect(missionStatus(p, 'feed')).toEqual({ count: 25, tier: 2, target: 60, coins: 80 });
    const done = {
      ...withCounts({ feed: 250 }),
      claimed: ['mission:feed:1', 'mission:feed:2', 'mission:feed:3'] as Progress['claimed'],
    };
    expect(missionStatus(done, 'feed')).toEqual({ count: 250, tier: null, target: 200, coins: 200 });
  });
});
