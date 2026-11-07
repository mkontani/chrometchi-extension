import { countMission, rewardEnding, settleRewards } from '@/core/progress';
import type { GameEvent, MissionKind, Progress } from '@/core/types';
import type { SaveV1 } from '@/storage/schema';

export interface ProgressInput {
  events: GameEvent[];
  mission?: MissionKind;
  now: number;
}

/** Pays endings, counts the mission and settles due rewards; returns `save` itself when nothing changed. */
export function bookkeepProgress(save: SaveV1, { events, mission, now }: ProgressInput): SaveV1 {
  let progress: Progress = save.progress;
  for (const e of events) {
    if (e.type === 'died') progress = rewardEnding(progress, 'dead', now);
    if (e.type === 'departed') progress = rewardEnding(progress, 'departed', now);
  }
  if (mission !== undefined) progress = countMission(progress, mission);
  progress = settleRewards(progress, save.zukan.discovered.length, save.zukan.memories.length, now);
  return progress === save.progress ? save : { ...save, progress };
}
