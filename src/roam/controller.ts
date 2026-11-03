import type { Rng } from '@/core/types';
import { SAVE_KEY, saveSchema, type SaveV1 } from '@/storage/schema';
import { roamDisplay, type RoamDisplay } from './display';
import type { RoamFrames } from './frames';
import { hostOf } from './sites';
import { mountRoam, type RoamView, type RoamViewDeps } from './view';

type StorageListener = (changes: Record<string, { newValue?: unknown }>, area: string) => void;

/** The browser APIs the roaming content script uses, injectable for tests. */
export interface RoamControllerDeps {
  doc: Document;
  href: string;
  storage: {
    get(key: string): Promise<Record<string, unknown>>;
    onChanged: { addListener(l: StorageListener): void; removeListener(l: StorageListener): void };
  };
  sendMessage(message: unknown): Promise<unknown>;
  reducedMotion: {
    readonly matches: boolean;
    addEventListener(type: 'change', l: () => void): void;
    removeEventListener(type: 'change', l: () => void): void;
  };
  t(key: string): string;
  rng: Rng;
  mountView?: (doc: Document, deps: RoamViewDeps) => RoamView;
  /** False once the extension is disabled, removed or updated and this script is orphaned. */
  isAlive?: () => boolean;
  raf?: (cb: FrameRequestCallback) => number;
}

/** Storage is shared with the page's other extension contexts: never trust its shape. */
function parseSave(raw: unknown): SaveV1 | null {
  const parsed = saveSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

function isFramesResponse(res: unknown): res is { ok: true; frames: RoamFrames } {
  const r = res as { ok?: unknown; frames?: { walk?: unknown; rest?: unknown } } | null;
  return r?.ok === true && Array.isArray(r.frames?.walk) && Array.isArray(r.frames?.rest);
}

const petKey = (d: RoamDisplay): string | null => (d.kind === 'pet' ? `${d.pet.formId}:${d.generation}` : null);

/** Animation frames that end the pet instead of running once the extension is gone. */
function guardedRaf(deps: RoamControllerDeps, onDead: () => void): (cb: FrameRequestCallback) => number {
  const raf = deps.raf ?? ((cb: FrameRequestCallback) => requestAnimationFrame(cb));
  const isAlive = deps.isAlive ?? (() => true);
  return (cb) => raf((now) => (isAlive() ? cb(now) : onDead()));
}

/** Removes the pet first: in an orphaned script, unhooking extension listeners can throw. */
function stopper(view: RoamView, unhook: () => void): () => void {
  let stopped = false;
  return () => {
    if (stopped) return;
    stopped = true;
    view.destroy();
    try {
      unhook();
    } catch {
      // The extension is gone, so there is nothing left to unhook or to report to.
    }
  };
}

/** Runs the roaming pet on this page; returns a function that removes it again. */
export function startRoam(deps: RoamControllerDeps): () => void {
  const host = hostOf(deps.href);
  const onHide = () => void deps.sendMessage({ type: 'hideRoamSite' }).catch(() => undefined);
  const raf = guardedRaf(deps, () => stop());
  const view = (deps.mountView ?? mountRoam)(deps.doc, { t: deps.t, rng: deps.rng, onHide, raf });
  let save: SaveV1 | null = null;
  let loaded: { key: string; frames: RoamFrames } | null = null;
  let requested: string | null = null;

  const fetchFrames = async (key: string) => {
    requested = key;
    const res = await deps.sendMessage({ type: 'roamFrames' }).catch(() => null);
    if (requested !== key || !isFramesResponse(res)) return; // stale, or the background failed
    loaded = { key, frames: res.frames };
    render();
  };
  function render() {
    const display = roamDisplay(save, host, deps.reducedMotion.matches);
    const key = petKey(display);
    view.render(display, key !== null && loaded?.key === key ? loaded.frames : null);
    if (key !== null && loaded?.key !== key && requested !== key) void fetchFrames(key);
  }
  const onStorage: StorageListener = (changes, area) => {
    if (area !== 'local' || !(SAVE_KEY in changes)) return;
    save = parseSave(changes[SAVE_KEY]?.newValue);
    render();
  };

  deps.storage.onChanged.addListener(onStorage);
  deps.reducedMotion.addEventListener('change', render);
  deps.storage
    .get(SAVE_KEY)
    .then((got) => void (save = parseSave(got[SAVE_KEY])))
    .catch(() => undefined)
    .finally(render);

  const stop = stopper(view, () => {
    deps.storage.onChanged.removeListener(onStorage);
    deps.reducedMotion.removeEventListener('change', render);
  });
  return stop;
}
