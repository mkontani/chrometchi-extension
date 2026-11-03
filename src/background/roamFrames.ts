import type { RoamFramesResponse } from '@/messaging/protocol';
import { roamFramePaths, type RoamFrames } from '@/roam/frames';
import type { SaveV1 } from '@/storage/schema';

export interface FrameLoaderDeps {
  load(): Promise<SaveV1>;
  /** Reads one bundled sprite and returns it as a data URL. */
  toDataUrl(path: string): Promise<string>;
}

export function bytesToDataUrl(bytes: Uint8Array, mime = 'image/png'): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return `data:${mime};base64,${btoa(binary)}`;
}

async function toDataUrls(frames: RoamFrames, toDataUrl: (path: string) => Promise<string>): Promise<RoamFrames> {
  const [walk, rest, [sleep = '', happy = '']] = await Promise.all([
    Promise.all(frames.walk.map(toDataUrl)),
    Promise.all(frames.rest.map(toDataUrl)),
    Promise.all([frames.sleep, frames.happy].map(toDataUrl)),
  ]);
  return { walk, rest, sleep, happy };
}

/**
 * Serves the current pet's frames to the roaming content script as data URLs, so no extension
 * file has to be web-accessible. Only the latest pet is cached.
 */
export function createFrameLoader(deps: FrameLoaderDeps): () => Promise<RoamFramesResponse> {
  let cached: { key: string; frames: RoamFrames } | null = null;
  return async () => {
    try {
      const { game } = await deps.load();
      const key = `${game.pet.formId}:${game.generation}`;
      if (cached?.key !== key) {
        const frames = await toDataUrls(roamFramePaths(game.pet, game.generation), deps.toDataUrl);
        cached = { key, frames };
      }
      return { ok: true, key, frames: cached.frames };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  };
}

/** Reads a bundled file (an asset path such as `/assets/walk0-x.png`) as a data URL. */
export function createDataUrlReader(
  fetchFn: (url: string) => Promise<Response>,
  getURL: (path: string) => string,
): (path: string) => Promise<string> {
  return async (path) => {
    if (path.startsWith('data:')) return path;
    const res = await fetchFn(getURL(path));
    if (!res.ok) throw new Error(`sprite ${path}: ${res.status}`);
    return bytesToDataUrl(new Uint8Array(await res.arrayBuffer()));
  };
}
