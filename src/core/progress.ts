import { COINS_MAX, ENDING_COINS, MISSIONS, MISSION_KINDS, RECENT_MAX, ZUKAN_MILESTONES, missionRewardId, zukanRewardId } from '@/data/economy';
import type { MissionKind, MissionTierNo, Progress, RecentReason, RewardId } from './types';

export const EMPTY_PROGRESS: Progress = {
  coins: 0,
  counts: { clean: 0, play: 0, feed: 0, outing: 0, harvest: 0, cook: 0 },
  claimed: [],
  recent: [],
  unseen: false,
};

export function addCoins(p: Progress, n: number): Progress {
  return { ...p, coins: Math.min(COINS_MAX, Math.max(0, p.coins + n)) };
}

export function countMission(p: Progress, kind: MissionKind): Progress {
  return { ...p, counts: { ...p.counts, [kind]: p.counts[kind] + 1 } };
}

function pay(p: Progress, reason: RecentReason, coins: number, at: number, id?: RewardId): Progress {
  const paid = addCoins(p, coins);
  return {
    ...paid,
    claimed: id ? [...p.claimed, id] : p.claimed,
    recent: [{ reason, coins, at }, ...p.recent].slice(0, RECENT_MAX),
    unseen: true,
  };
}

/** Pays every reward that is due and not yet claimed; returns `p` itself when none is. */
export function settleRewards(p: Progress, discovered: number, endings: number, now: number): Progress {
  let next = p;
  const due = (id: RewardId) => !next.claimed.includes(id);
  if (endings >= 1 && due('ending:first')) next = pay(next, 'ending:first', 0, now, 'ending:first');
  for (const m of ZUKAN_MILESTONES) {
    const id = zukanRewardId(m.count);
    if (discovered >= m.count && due(id)) next = pay(next, id, m.coins, now, id);
  }
  for (const kind of MISSION_KINDS) {
    MISSIONS[kind].forEach((tier, i) => {
      const id = missionRewardId(kind, (i + 1) as MissionTierNo);
      if (next.counts[kind] >= tier.target && due(id)) next = pay(next, id, tier.coins, now, id);
    });
  }
  return next;
}

export function rewardEnding(p: Progress, ending: 'departed' | 'dead', now: number): Progress {
  return pay(p, `ending:${ending}`, ENDING_COINS[ending], now);
}

export function markSeen(p: Progress): Progress {
  return { ...p, unseen: false };
}

export function missionStatus(
  p: Progress,
  kind: MissionKind,
): { count: number; tier: MissionTierNo | null; target: number; coins: number } {
  const tiers = MISSIONS[kind];
  const index = tiers.findIndex((_, i) => !p.claimed.includes(missionRewardId(kind, (i + 1) as MissionTierNo)));
  const shown = tiers[index === -1 ? tiers.length - 1 : index] ?? { target: 0, coins: 0 };
  return {
    count: p.counts[kind],
    tier: index === -1 ? null : ((index + 1) as MissionTierNo),
    target: shown.target,
    coins: shown.coins,
  };
}
