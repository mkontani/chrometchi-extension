import { afterEach, describe, expect, test, vi } from 'vitest';
import { makeGame, makePet, type PetOverrides } from '@/core/__fixtures__/pet';
import { createRng } from '@/core/rng';
import { createFreshSave } from '@/storage/repository';
import { SAVE_KEY, type SaveV1 } from '@/storage/schema';
import { startRoam, type RoamControllerDeps } from './controller';
import type { RoamFrames } from './frames';
import type { RoamView, RoamViewDeps } from './view';

const FRAMES: RoamFrames = { walk: ['data:w'], rest: ['data:i0', 'data:i1'], sleep: 'data:s', happy: 'data:h' };

function saveWith(pet: PetOverrides = {}, roam = true): SaveV1 {
  const s = createFreshSave(0);
  return { ...s, settings: { ...s.settings, roam }, game: makeGame({ pet: makePet(pet) }) };
}

type Listener = (changes: Record<string, { newValue?: unknown }>, area: string) => void;

function setup(initial: unknown = saveWith(), href = 'https://a.com/page', extra: Partial<RoamControllerDeps> = {}) {
  const listeners = new Set<Listener>();
  const media = { matches: false, listeners: new Set<() => void>() };
  let viewDeps: RoamViewDeps | null = null;
  const view: RoamView = { render: vi.fn(), destroy: vi.fn() };
  const sendMessage = vi.fn(async (msg: { type: string }) =>
    msg.type === 'roamFrames' ? { ok: true, key: 'k', frames: FRAMES } : { ok: true },
  );
  const deps: RoamControllerDeps = {
    doc: document,
    href,
    storage: {
      get: async () => ({ [SAVE_KEY]: initial }),
      onChanged: { addListener: (l) => void listeners.add(l), removeListener: (l) => void listeners.delete(l) },
    },
    sendMessage,
    reducedMotion: {
      get matches() {
        return media.matches;
      },
      addEventListener: (_t, l) => void media.listeners.add(l),
      removeEventListener: (_t, l) => void media.listeners.delete(l),
    },
    t: (k) => k,
    rng: createRng(1),
    mountView: (_doc, d) => {
      viewDeps = d;
      return view;
    },
  };
  const stop = startRoam({ ...deps, ...extra });
  const change = (value: unknown, area = 'local') => listeners.forEach((l) => l({ [SAVE_KEY]: { newValue: value } }, area));
  const lastRender = () => (view.render as ReturnType<typeof vi.fn>).mock.calls.at(-1);
  const frameRequests = () => sendMessage.mock.calls.filter(([m]) => m.type === 'roamFrames').length;
  return { view, viewDeps: () => viewDeps as RoamViewDeps, sendMessage, change, lastRender, frameRequests, stop, listeners, media };
}

afterEach(() => vi.restoreAllMocks());

describe('roam controller', () => {
  test('shows the pet once the save and its frames arrive', async () => {
    const { lastRender } = setup();
    await vi.waitFor(() => expect(lastRender()?.[1]).toEqual(FRAMES));
    expect(lastRender()?.[0]).toMatchObject({ kind: 'pet', motion: 'walk' });
  });

  test('hides when roaming is turned off in storage', async () => {
    const { change, lastRender } = setup();
    await vi.waitFor(() => expect(lastRender()?.[1]).toEqual(FRAMES));
    change(saveWith({}, false));
    await vi.waitFor(() => expect(lastRender()?.[0]).toEqual({ kind: 'hidden' }));
  });

  test('ignores other storage areas and keys', async () => {
    const { change, lastRender, listeners } = setup();
    await vi.waitFor(() => expect(lastRender()?.[1]).toEqual(FRAMES));
    change(saveWith({}, false), 'sync');
    listeners.forEach((l) => l({ other: { newValue: 1 } }, 'local'));
    expect(lastRender()?.[0]).toMatchObject({ kind: 'pet' });
  });

  test('refetches frames only when the pet changes form', async () => {
    const { change, frameRequests, lastRender } = setup();
    await vi.waitFor(() => expect(lastRender()?.[1]).toEqual(FRAMES));
    change(saveWith({ stats: { hunger: 50 } }));
    await vi.waitFor(() => expect(lastRender()?.[0].pet.stats.hunger).toBe(50));
    expect(frameRequests()).toBe(1);
    change(saveWith({ formId: 'child_kemu', stage: 'child' }));
    await vi.waitFor(() => expect(frameRequests()).toBe(2));
  });

  test('a save that fails validation renders nothing', async () => {
    const { lastRender } = setup({ version: 99 });
    await vi.waitFor(() => expect(lastRender()?.[0]).toEqual({ kind: 'hidden' }));
  });

  test('pages that are not http(s) stay empty', async () => {
    const { lastRender, frameRequests } = setup(saveWith(), 'file:///tmp/x.html');
    await vi.waitFor(() => expect(lastRender()?.[0]).toEqual({ kind: 'hidden' }));
    expect(frameRequests()).toBe(0);
  });

  test('turning on reduced motion stops the walking', async () => {
    const { media, lastRender } = setup();
    await vi.waitFor(() => expect(lastRender()?.[1]).toEqual(FRAMES));
    media.matches = true;
    media.listeners.forEach((l) => l());
    await vi.waitFor(() => expect(lastRender()?.[0]).toMatchObject({ motion: 'still' }));
  });

  test('hiding sends only the request type; the background reads the site from the sender', async () => {
    const { viewDeps, sendMessage } = setup();
    viewDeps().onHide();
    expect(sendMessage).toHaveBeenCalledWith({ type: 'hideRoamSite' });
  });

  test('a failed frame request renders nothing', async () => {
    const s = setup();
    s.sendMessage.mockImplementation(async () => ({ ok: false, error: 'x' }));
    s.change(saveWith({ formId: 'child_kemu', stage: 'child' }));
    await vi.waitFor(() => expect(s.lastRender()?.[1]).toBeNull());
  });

  test('stop removes the listeners and destroys the view', async () => {
    const { stop, view, listeners, media } = setup();
    stop();
    expect(view.destroy).toHaveBeenCalled();
    expect(listeners.size).toBe(0);
    expect(media.listeners.size).toBe(0);
  });

  test('once the extension is gone (disabled, removed or updated), the next frame removes the pet', () => {
    let alive = true;
    const queued: FrameRequestCallback[] = [];
    const raf = vi.fn((cb: FrameRequestCallback) => queued.push(cb));
    const { view, viewDeps, listeners } = setup(saveWith(), 'https://a.com/page', { raf, isAlive: () => alive });
    const tick = vi.fn();
    viewDeps().raf?.(tick);
    queued.shift()?.(16);
    expect(tick).toHaveBeenCalledTimes(1);
    alive = false;
    viewDeps().raf?.(tick);
    queued.shift()?.(32);
    expect(tick).toHaveBeenCalledTimes(1);
    expect(view.destroy).toHaveBeenCalled();
    expect(listeners.size).toBe(0);
  });

  test('stop removes the view once, even when a dead context throws on removing listeners', () => {
    const dead = () => {
      throw new Error('Extension context invalidated.');
    };
    const storage = { get: async () => ({}), onChanged: { addListener: () => undefined, removeListener: dead } };
    const { stop, view } = setup(saveWith(), 'https://a.com/page', { storage });
    expect(() => stop()).not.toThrow();
    stop();
    expect(view.destroy).toHaveBeenCalledTimes(1);
  });
});
