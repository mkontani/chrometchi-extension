import type { IngredientId, MissionKind, MissionTierNo, RewardId } from '@/core/types';

export const COINS_MAX = 99999;
export const RECENT_MAX = 5;

export const ENDING_COINS = { departed: 100, dead: 30 } as const;

/** Zukan discovery counts that pay a reward, ascending. */
export const ZUKAN_MILESTONES: readonly { count: number; coins: number }[] = [
  { count: 10, coins: 50 },
  { count: 20, coins: 50 },
  { count: 30, coins: 50 },
  { count: 40, coins: 50 },
  { count: 50, coins: 50 },
  { count: 60, coins: 100 },
  { count: 70, coins: 100 },
  { count: 80, coins: 100 },
];

export const MISSION_KINDS: readonly MissionKind[] = [
  'clean', 'play', 'feed', 'outing', 'harvest', 'cook',
];

/** Three tiers per mission: reach `target` to be paid `coins`. */
export const MISSIONS: Readonly<Record<MissionKind, readonly { target: number; coins: number }[]>> = {
  clean: [{ target: 10, coins: 30 }, { target: 30, coins: 80 }, { target: 100, coins: 200 }],
  play: [{ target: 10, coins: 30 }, { target: 30, coins: 80 }, { target: 100, coins: 200 }],
  feed: [{ target: 20, coins: 30 }, { target: 60, coins: 80 }, { target: 200, coins: 200 }],
  outing: [{ target: 5, coins: 30 }, { target: 20, coins: 80 }, { target: 50, coins: 200 }],
  harvest: [{ target: 3, coins: 30 }, { target: 10, coins: 80 }, { target: 30, coins: 200 }],
  cook: [{ target: 5, coins: 30 }, { target: 20, coins: 80 }, { target: 50, coins: 200 }],
};

export const SELL_PRICE: Readonly<Record<IngredientId, number>> = {
  nuts: 1, mushroom: 1, egg: 1, fish: 2, veggie: 2, fruit: 2, meat: 3, shrimp: 3,
};

export function zukanRewardId(count: number): RewardId {
  return `zukan:${count}`;
}

export function missionRewardId(kind: MissionKind, tier: MissionTierNo): RewardId {
  return `mission:${kind}:${tier}`;
}

const TIERS: readonly MissionTierNo[] = [1, 2, 3];

/** Every known reward id: zukan first, then missions in kind and tier order. */
export const REWARD_IDS: readonly RewardId[] = [
  ...ZUKAN_MILESTONES.map((m) => zukanRewardId(m.count)),
  ...MISSION_KINDS.flatMap((kind) => TIERS.map((tier) => missionRewardId(kind, tier))),
];
