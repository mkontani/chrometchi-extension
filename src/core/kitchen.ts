import type { Kitchen } from './types';

export const EMPTY_KITCHEN: Kitchen = {
  pantry: {},
  outings: { day: '', used: { fishing: 0, hunting: 0, gathering: 0 } },
  farm: { crop: null, growMinLeft: 0, watered: false },
};

/** The local calendar date as `YYYY-MM-DD`. */
export function dayKey(now: number): string {
  const d = new Date(now);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
