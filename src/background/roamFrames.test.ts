import { describe, expect, test, vi } from 'vitest';
import { makeGame, makePet } from '@/core/__fixtures__/pet';
import { createFreshSave } from '@/storage/repository';
import type { SaveV1 } from '@/storage/schema';
import { bytesToDataUrl, createDataUrlReader, createFrameLoader } from './roamFrames';

const saveWith = (formId: string, generation = 1): SaveV1 => ({
  ...createFreshSave(0),
  game: makeGame({ pet: makePet({ formId, stage: 'adult' }), generation }),
});

function setup(initial: SaveV1) {
  let save = initial;
  const toDataUrl = vi.fn(async (path: string) => `data:${path}`);
  const loader = createFrameLoader({ load: async () => save, toDataUrl });
  return { loader, toDataUrl, setSave: (s: SaveV1) => void (save = s) };
}

describe('frame loader', () => {
  test('paths become data URLs, keyed by form and generation', async () => {
    const { loader } = setup(saveWith('adult_dragon', 2));
    const res = await loader();
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.key).toBe('adult_dragon:2');
    for (const url of [...res.frames.walk, ...res.frames.rest, res.frames.sleep, res.frames.happy]) {
      expect(url.startsWith('data:')).toBe(true);
    }
  });

  test('the same pet is served from cache', async () => {
    const { loader, toDataUrl } = setup(saveWith('adult_dragon'));
    await loader();
    const calls = toDataUrl.mock.calls.length;
    await loader();
    expect(toDataUrl.mock.calls.length).toBe(calls);
  });

  test('a new form refetches', async () => {
    const { loader, toDataUrl, setSave } = setup(saveWith('adult_dragon'));
    await loader();
    const calls = toDataUrl.mock.calls.length;
    setSave(saveWith('adult_beast'));
    const res = await loader();
    expect(toDataUrl.mock.calls.length).toBeGreaterThan(calls);
    expect(res.ok && res.key).toBe('adult_beast:1');
  });

  test('a failed fetch answers ok:false', async () => {
    const loader = createFrameLoader({ load: async () => saveWith('adult_dragon'), toDataUrl: async () => {
      throw new Error('404');
    } });
    expect(await loader()).toEqual({ ok: false, error: '404' });
  });
});

test('bytesToDataUrl encodes PNG bytes as base64', () => {
  expect(bytesToDataUrl(new Uint8Array([137, 80, 78, 71]))).toBe('data:image/png;base64,iVBORw==');
});

describe('data URL reader', () => {
  const png = new Uint8Array([137, 80, 78, 71]);

  test('reads a bundled file through the extension URL', async () => {
    const fetchFn = vi.fn(async () => new Response(png, { status: 200 }));
    const read = createDataUrlReader(fetchFn, (p) => `chrome-extension://id${p}`);
    expect(await read('/assets/walk0.png')).toBe('data:image/png;base64,iVBORw==');
    expect(fetchFn).toHaveBeenCalledWith('chrome-extension://id/assets/walk0.png');
  });

  test('passes data URLs through untouched', async () => {
    const fetchFn = vi.fn();
    expect(await createDataUrlReader(fetchFn, (p) => p)('data:image/png;base64,AA==')).toBe('data:image/png;base64,AA==');
    expect(fetchFn).not.toHaveBeenCalled();
  });

  test('a missing file throws', async () => {
    const read = createDataUrlReader(async () => new Response(null, { status: 404 }), (p) => p);
    await expect(read('/assets/nope.png')).rejects.toThrow('404');
  });
});
