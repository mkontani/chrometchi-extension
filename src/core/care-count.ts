import type { CareHistory, RoomId } from './types';

const MORNING_MINUTES = 180;
const DAY_MINUTES = 1440;

/** The room with the most awake minutes this stage; `current` on a tie or with no minutes. */
export function grownRoom(history: CareHistory, current: RoomId): RoomId {
  const entries = Object.entries(history.roomMinutes) as [RoomId, number][];
  const top = Math.max(0, ...entries.map(([, minutes]) => minutes));
  const leaders = entries.filter(([, minutes]) => minutes === top && top > 0);
  return leaders.length === 1 ? leaders[0]![0] : current;
}

/** True in the 3 hours from waking up; the window wraps past midnight. */
export function isMorning(minuteOfDay: number, sleepEndMin: number): boolean {
  const since = (minuteOfDay - sleepEndMin + DAY_MINUTES) % DAY_MINUTES;
  return since < MORNING_MINUTES;
}

/** One more care action this stage, and one more morning care when it is morning. */
export function countCare(history: CareHistory, minuteOfDay: number, sleepEndMin: number): CareHistory {
  return {
    ...history,
    care: history.care + 1,
    morningCare: history.morningCare + (isMorning(minuteOfDay, sleepEndMin) ? 1 : 0),
  };
}
