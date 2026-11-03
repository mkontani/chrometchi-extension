export const TICK_ALARM = 'tick';
const TICK_PERIOD_MIN = 1;
/** Alarms left behind by older versions (v0.0.2 ran its loop on `gameLoop`). */
export const LEGACY_ALARMS: readonly string[] = ['gameLoop'];

export interface AlarmsApi {
  get(name: string): Promise<unknown>;
  create(name: string, info: { periodInMinutes: number }): Promise<void>;
  clear(name: string): Promise<boolean>;
}

/** (Re)create the 1-minute tick alarm. */
export async function createTickAlarm(alarms: AlarmsApi): Promise<void> {
  await alarms.create(TICK_ALARM, { periodInMinutes: TICK_PERIOD_MIN });
}

/**
 * Run on every service-worker start: onInstalled/onStartup do not fire when the worker is
 * revived or the extension is re-enabled, so the tick alarm may be missing. An existing alarm
 * is left alone so its schedule is not reset. Rejects on API failure (the caller reports it).
 */
export async function ensureTickAlarm(alarms: AlarmsApi): Promise<void> {
  await Promise.all(LEGACY_ALARMS.map((name) => alarms.clear(name)));
  if (await alarms.get(TICK_ALARM)) return;
  await createTickAlarm(alarms);
}
