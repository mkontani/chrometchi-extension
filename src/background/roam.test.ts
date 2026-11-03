import { describe, expect, test, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '@/core/constants';
import type { EngineRequest } from '@/messaging/protocol';
import { ROAM_ORIGINS, ROAM_SCRIPT_FILE, ROAM_SCRIPT_ID } from '@/roam/constants';
import { createRoamManager, grantsRoam, revokesRoam, roamHandlers, type RoamDeps } from './roam';

const ON = { ...DEFAULT_SETTINGS, roam: true };
const OFF = { ...DEFAULT_SETTINGS, roam: false };

function fakes(opts: { allowed?: boolean; registered?: boolean; tabs?: number[]; failTab?: number } = {}) {
  const errors: Array<[unknown, string]> = [];
  const deps = {
    scripting: {
      getRegisteredContentScripts: vi.fn(async () => (opts.registered ? [{ id: ROAM_SCRIPT_ID }] : [])),
      registerContentScripts: vi.fn(async () => {}),
      unregisterContentScripts: vi.fn(async () => {}),
      executeScript: vi.fn(async ({ target }: { target: { tabId: number } }) => {
        if (target.tabId === opts.failTab) throw new Error('cannot access a chrome:// URL');
        return [];
      }),
    },
    permissions: {
      contains: vi.fn(async () => opts.allowed ?? true),
      remove: vi.fn(async () => true),
    },
    tabs: { query: vi.fn(async () => (opts.tabs ?? []).map((id) => ({ id }))) },
    reportError: (err: unknown, context: string) => void errors.push([err, context]),
  } satisfies RoamDeps;
  return { deps, errors };
}

describe('roam manager', () => {
  test('registers and injects open tabs when roam is on and allowed', async () => {
    const { deps, errors } = fakes({ tabs: [1, 2], failTab: 1 });
    await createRoamManager(deps).sync(ON);
    expect(deps.scripting.registerContentScripts).toHaveBeenCalledWith([
      {
        id: ROAM_SCRIPT_ID,
        matches: [...ROAM_ORIGINS],
        js: [ROAM_SCRIPT_FILE],
        runAt: 'document_idle',
        persistAcrossSessions: true,
      },
    ]);
    expect(deps.tabs.query).toHaveBeenCalledWith({ url: [...ROAM_ORIGINS] });
    expect(deps.scripting.executeScript).toHaveBeenCalledWith({ target: { tabId: 2 }, files: [ROAM_SCRIPT_FILE] });
    expect(errors.map(([, c]) => c)).toEqual(['inject roam into tab 1']);
  });

  test('does nothing when already registered', async () => {
    const { deps } = fakes({ registered: true, tabs: [1] });
    await createRoamManager(deps).sync(ON);
    expect(deps.scripting.registerContentScripts).not.toHaveBeenCalled();
    expect(deps.scripting.unregisterContentScripts).not.toHaveBeenCalled();
    expect(deps.scripting.executeScript).not.toHaveBeenCalled();
  });

  test('unregisters and drops the permission when roam is off', async () => {
    const { deps } = fakes({ registered: true });
    await createRoamManager(deps).sync(OFF);
    expect(deps.scripting.unregisterContentScripts).toHaveBeenCalledWith({ ids: [ROAM_SCRIPT_ID] });
    expect(deps.permissions.remove).toHaveBeenCalledWith({ origins: [...ROAM_ORIGINS] });
  });

  test('stays unregistered when roam is on but the permission is missing', async () => {
    const { deps } = fakes({ allowed: false, registered: true });
    await createRoamManager(deps).sync(ON);
    expect(deps.scripting.registerContentScripts).not.toHaveBeenCalled();
    expect(deps.scripting.unregisterContentScripts).toHaveBeenCalled();
    expect(deps.permissions.remove).not.toHaveBeenCalled();
  });

  test('overlapping syncs register the script once', async () => {
    const { deps } = fakes();
    let registered = false;
    deps.scripting.getRegisteredContentScripts.mockImplementation(async () => (registered ? [{ id: ROAM_SCRIPT_ID }] : []));
    deps.scripting.registerContentScripts.mockImplementation(async () => {
      registered = true;
    });
    const manager = createRoamManager(deps);
    await Promise.all([manager.sync(ON), manager.sync(ON)]);
    expect(deps.scripting.registerContentScripts).toHaveBeenCalledTimes(1);
  });

  test('a failing permissions.remove is reported, not thrown', async () => {
    const { deps, errors } = fakes();
    deps.permissions.remove.mockRejectedValueOnce(new Error('required permission'));
    await expect(createRoamManager(deps).sync(OFF)).resolves.toBeUndefined();
    expect(errors.map(([, c]) => c)).toEqual(['remove roam permission']);
  });
});

describe('permission events', () => {
  test('roaming is granted only when both origins are added', () => {
    expect(grantsRoam({ origins: [...ROAM_ORIGINS] })).toBe(true);
    expect(grantsRoam({ origins: ['https://*/*'] })).toBe(false);
    expect(grantsRoam({})).toBe(false);
  });

  test('losing either origin revokes roaming', () => {
    expect(revokesRoam({ origins: ['http://*/*'] })).toBe(true);
    expect(revokesRoam({ origins: ['https://example.com/*'] })).toBe(false);
    expect(revokesRoam({})).toBe(false);
  });
});

describe('roam handlers', () => {
  const okSave = (roam: boolean) => ({ ok: true as const, save: { settings: { ...DEFAULT_SETTINGS, roam } } as never });

  function setup() {
    const manager = { sync: vi.fn(async () => {}) };
    const engine = {
      handle: vi.fn(async (req: EngineRequest) => okSave(req.type === 'updateSettings' ? (req.patch.roam ?? false) : false)),
    };
    const errors: string[] = [];
    const h = roamHandlers(manager, engine, (_e, c) => void errors.push(c));
    return { manager, engine, errors, h };
  }

  test('every successful engine response re-syncs with its settings', async () => {
    const { manager, h } = setup();
    h.afterHandle(okSave(true));
    h.afterHandle({ ok: false, error: 'x' });
    await vi.waitFor(() => expect(manager.sync).toHaveBeenCalledTimes(1));
    expect(manager.sync).toHaveBeenCalledWith(expect.objectContaining({ roam: true }));
  });

  test('granting site access turns roaming on', async () => {
    const { engine, manager, h } = setup();
    h.onPermissionAdded({ origins: [...ROAM_ORIGINS] });
    await vi.waitFor(() => expect(manager.sync).toHaveBeenCalled());
    expect(engine.handle).toHaveBeenCalledWith({ type: 'updateSettings', patch: { roam: true } });
  });

  test('revoking site access turns roaming off', async () => {
    const { engine, h } = setup();
    h.onPermissionRemoved({ origins: ['https://*/*'] });
    await vi.waitFor(() => expect(engine.handle).toHaveBeenCalledWith({ type: 'updateSettings', patch: { roam: false } }));
  });

  test('unrelated permission changes are ignored', () => {
    const { engine, h } = setup();
    h.onPermissionAdded({ origins: ['https://example.com/*'] });
    h.onPermissionRemoved({ permissions: ['notifications'] } as never);
    expect(engine.handle).not.toHaveBeenCalled();
  });

  test('startup syncs from the stored save without writing it', async () => {
    const { manager, engine, h } = setup();
    h.startup({ version: 1, settings: { ...DEFAULT_SETTINGS, roam: true }, game: {} });
    await vi.waitFor(() => expect(manager.sync).toHaveBeenCalledWith(expect.objectContaining({ roam: true })));
    expect(engine.handle).not.toHaveBeenCalled();
  });

  test('startup with no usable save syncs as roaming off', async () => {
    const { manager, h } = setup();
    h.startup(undefined);
    await vi.waitFor(() => expect(manager.sync).toHaveBeenCalledWith({ roam: false }));
  });

  test('a failing sync is reported', async () => {
    const { manager, errors, h } = setup();
    manager.sync.mockRejectedValueOnce(new Error('boom'));
    h.afterHandle(okSave(true));
    await vi.waitFor(() => expect(errors).toEqual(['sync roam']));
  });
});
