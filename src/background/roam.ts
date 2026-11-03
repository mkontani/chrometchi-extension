import type { Settings } from '@/core/types';
import type { EngineRequest, EngineResponse } from '@/messaging/protocol';
import { ROAM_ORIGINS, ROAM_SCRIPT_FILE, ROAM_SCRIPT_ID } from '@/roam/constants';
import { createSerialQueue } from './queue';

interface RoamScript {
  id: string;
  matches: string[];
  js: string[];
  runAt: 'document_idle';
  persistAcrossSessions: boolean;
}

/** The slices of chrome.scripting / permissions / tabs the roam manager uses. */
export interface RoamDeps {
  scripting: {
    getRegisteredContentScripts(filter: { ids: string[] }): Promise<Array<{ id: string }>>;
    registerContentScripts(scripts: RoamScript[]): Promise<void>;
    unregisterContentScripts(filter: { ids: string[] }): Promise<void>;
    executeScript(injection: { target: { tabId: number }; files: string[] }): Promise<unknown>;
  };
  permissions: {
    contains(p: { origins: string[] }): Promise<boolean>;
    remove(p: { origins: string[] }): Promise<boolean>;
  };
  tabs: { query(q: { url: string[] }): Promise<Array<{ id?: number }>> };
  reportError(err: unknown, context: string): void;
}

export interface RoamManager {
  /** Idempotent: registers the script iff roaming is on and allowed; drops access when off. */
  sync(settings: Pick<Settings, 'roam'>): Promise<void>;
}

const origins = (): string[] => [...ROAM_ORIGINS];

/** Pages opened before roaming was turned on get the pet too; tabs Chrome refuses are skipped. */
async function injectOpenTabs(deps: RoamDeps): Promise<void> {
  const tabs = await deps.tabs.query({ url: origins() });
  await Promise.all(
    tabs.map(async ({ id }) => {
      if (id === undefined) return;
      try {
        await deps.scripting.executeScript({ target: { tabId: id }, files: [ROAM_SCRIPT_FILE] });
      } catch (err) {
        deps.reportError(err, `inject roam into tab ${id}`);
      }
    }),
  );
}

async function register(deps: RoamDeps): Promise<void> {
  await deps.scripting.registerContentScripts([
    { id: ROAM_SCRIPT_ID, matches: origins(), js: [ROAM_SCRIPT_FILE], runAt: 'document_idle', persistAcrossSessions: true },
  ]);
  await injectOpenTabs(deps);
}

async function syncOnce(deps: RoamDeps, settings: Pick<Settings, 'roam'>): Promise<void> {
  const want = settings.roam && (await deps.permissions.contains({ origins: origins() }));
  const have = (await deps.scripting.getRegisteredContentScripts({ ids: [ROAM_SCRIPT_ID] })).length > 0;
  if (want && !have) await register(deps);
  if (!want && have) await deps.scripting.unregisterContentScripts({ ids: [ROAM_SCRIPT_ID] });
  if (!settings.roam) {
    // The e2e build declares these origins, and declared ones cannot be removed.
    await deps.permissions.remove({ origins: origins() }).catch((err: unknown) => {
      deps.reportError(err, 'remove roam permission');
    });
  }
}

/** Syncs run one at a time, so overlapping triggers cannot register the script twice. */
export function createRoamManager(deps: RoamDeps): RoamManager {
  const queue = createSerialQueue();
  return { sync: (settings) => queue(() => syncOnce(deps, settings)) };
}

export interface RoamHandlers {
  /** Called with every engine response (popup requests, content scripts, permission events). */
  afterHandle(res: EngineResponse): void;
  onPermissionAdded(p: { origins?: string[] }): void;
  onPermissionRemoved(p: { origins?: string[] }): void;
}

/**
 * Keeps the script registration in step with the save, and the `roam` setting in step with the
 * site access the user grants or revokes (also from chrome://extensions, or while the popup that
 * asked has already closed).
 */
export function roamHandlers(
  manager: RoamManager,
  engine: { handle(req: EngineRequest): Promise<EngineResponse> },
  reportError: (err: unknown, context: string) => void,
): RoamHandlers {
  const afterHandle = (res: EngineResponse): void => {
    if (!res.ok) return;
    manager.sync(res.save.settings).catch((err: unknown) => reportError(err, 'sync roam'));
  };
  const setRoam = (roam: boolean): void => {
    engine
      .handle({ type: 'updateSettings', patch: { roam } })
      .then(afterHandle)
      .catch((err: unknown) => reportError(err, 'set roam'));
  };
  return {
    afterHandle,
    onPermissionAdded: (p) => {
      if (grantsRoam(p)) setRoam(true);
    },
    onPermissionRemoved: (p) => {
      if (revokesRoam(p)) setRoam(false);
    },
  };
}

/** permissions.onAdded: the user granted roaming (both origins at once, as the popup asks). */
export function grantsRoam(p: { origins?: string[] }): boolean {
  return ROAM_ORIGINS.every((o) => p.origins?.includes(o));
}

/** permissions.onRemoved: losing either origin means the pet can no longer roam. */
export function revokesRoam(p: { origins?: string[] }): boolean {
  return ROAM_ORIGINS.some((o) => p.origins?.includes(o));
}
