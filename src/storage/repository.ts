import { DEFAULT_SETTINGS } from '@/core/constants';
import { createGame, createZukan } from '@/core/factory';
import {
  LEGACY_KEYS,
  SAVE_KEY,
  saveSchema,
  type KeyValueArea,
  type SaveMeta,
  type SaveV1,
} from './schema';

export interface SaveRepository {
  load(): Promise<SaveV1>;
  save(s: SaveV1): Promise<void>;
}

export function createFreshSave(now: number, flags: Partial<SaveMeta> = {}): SaveV1 {
  return {
    version: 1,
    game: createGame(now),
    zukan: createZukan(),
    settings: { ...DEFAULT_SETTINGS },
    meta: { lastNotified: {}, showRenewal: false, showDataReset: false, ...flags },
  };
}

export function createSaveRepository(area: KeyValueArea, now: () => number): SaveRepository {
  const save = (s: SaveV1) => area.set({ [SAVE_KEY]: s });

  const persistFresh = async (flags: Partial<SaveMeta>): Promise<SaveV1> => {
    const fresh = createFreshSave(now(), flags);
    await save(fresh);
    return fresh;
  };

  return {
    async load() {
      const got = await area.get([SAVE_KEY, ...LEGACY_KEYS]);
      if (got[SAVE_KEY] !== undefined) {
        const parsed = saveSchema.safeParse(got[SAVE_KEY]);
        return parsed.success ? parsed.data : persistFresh({ showDataReset: true });
      }
      if (LEGACY_KEYS.some((k) => got[k] !== undefined)) {
        await area.remove([...LEGACY_KEYS]);
        return persistFresh({ showRenewal: true });
      }
      return persistFresh({});
    },
    save,
  };
}
