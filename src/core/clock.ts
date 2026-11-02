const MS_PER_MINUTE = 60_000

export interface ElapsedResult {
  readonly minutes: number
  readonly nextTickAt: number
}

/** Whole minutes elapsed since lastTickAt; gaps above maxGapMs or negative gaps count as 0. */
export function consumeElapsed(lastTickAt: number, now: number, maxGapMs: number): ElapsedResult {
  const elapsed = now - lastTickAt
  if (elapsed < 0 || elapsed > maxGapMs) return { minutes: 0, nextTickAt: now }
  const minutes = Math.floor(elapsed / MS_PER_MINUTE)
  return { minutes, nextTickAt: lastTickAt + minutes * MS_PER_MINUTE }
}

/** Local minute of day, 0..1439. */
export function minuteOfDay(ms: number): number {
  const d = new Date(ms)
  return d.getHours() * 60 + d.getMinutes()
}

/** True when minute is in [startMin, endMin); windows may cross midnight; start == end means never. */
export function isSleepTime(minute: number, startMin: number, endMin: number): boolean {
  if (startMin === endMin) return false
  if (startMin < endMin) return minute >= startMin && minute < endMin
  return minute >= startMin || minute < endMin
}
