import { z } from 'zod';
import { EMPTY_PROGRESS } from '@/core/progress';
import type { MissionKind, Progress, RecentReason, RecentReward, RewardId } from '@/core/types';
import {
  COINS_MAX,
  MISSIONS,
  MISSION_KINDS,
  RECENT_MAX,
  ZUKAN_MILESTONES,
  missionRewardId,
  zukanRewardId,
} from '@/data/economy';

type Raw = Record<string, unknown>;

const isRecord = (v: unknown): v is Raw => typeof v === 'object' && v !== null && !Array.isArray(v);

const REWARD_ID_SET = new Set<string>([
  ...ZUKAN_MILESTONES.map((m) => zukanRewardId(m.count)),
  ...MISSION_KINDS.flatMap((k) => MISSIONS[k].map((_, i) => missionRewardId(k, (i + 1) as 1 | 2 | 3))),
]);
const RECENT_REASONS = new Set<string>([...REWARD_ID_SET, 'ending:departed', 'ending:dead']);

const isRewardId = (v: unknown): v is RewardId => typeof v === 'string' && REWARD_ID_SET.has(v);
const isRecentReason = (v: unknown): v is RecentReason => typeof v === 'string' && RECENT_REASONS.has(v);

function wholeOrZero(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0;
}

function parseCoins(v: unknown): number {
  return typeof v === 'number' && Number.isNaN(v) ? 0 : Math.min(COINS_MAX, wholeOrZero(v));
}

function parseCounts(v: unknown): Record<MissionKind, number> {
  const raw = isRecord(v) ? v : {};
  return Object.fromEntries(MISSION_KINDS.map((k) => [k, wholeOrZero(raw[k])])) as Record<MissionKind, number>;
}

function parseClaimed(v: unknown): RewardId[] {
  return Array.isArray(v) ? [...new Set(v)].filter(isRewardId) : [];
}

function parseRecent(v: unknown): RecentReward[] {
  if (!Array.isArray(v)) return [];
  const good = v.flatMap((e): RecentReward[] =>
    isRecord(e) && isRecentReason(e.reason) && typeof e.coins === 'number' && typeof e.at === 'number'
      ? [{ reason: e.reason, coins: e.coins, at: e.at }]
      : [],
  );
  return good.slice(0, RECENT_MAX);
}

/** Never fails: a bad field falls back on its own, so loading can never reset the save. */
export function parseProgress(raw: unknown): Progress {
  if (!isRecord(raw)) return EMPTY_PROGRESS;
  return {
    coins: parseCoins(raw.coins),
    counts: parseCounts(raw.counts),
    claimed: parseClaimed(raw.claimed),
    recent: parseRecent(raw.recent),
    unseen: raw.unseen === true,
  };
}

/** preprocess (not transform) so a save with no `progress` key still reaches the parser. */
export const progressSchema = z.preprocess(parseProgress, z.custom<Progress>());
