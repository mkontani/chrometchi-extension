import { describe, expect, test } from 'vitest';
import { EMPTY_KITCHEN } from '@/core/kitchen';
import { EMPTY_PROGRESS } from '@/core/progress';
import { makeGame } from '@/core/__fixtures__/pet';
import { createFreshSave, createSaveRepository } from './repository';
import { LEGACY_KEYS, NOTIFY_KINDS, SAVE_KEY, saveSchema } from './schema';
import { createMemoryArea } from './__fixtures__/memory-area';

const NOW = 1_000_000;

describe('saveSchema', () => {
  test('fresh save is valid', () => {
    expect(saveSchema.safeParse(createFreshSave(NOW)).success).toBe(true);
  });

  test.each([1440, -1, 1.5])('sleepStartMin %s is invalid', (v) => {
    const s = createFreshSave(NOW);
    const bad = { ...s, settings: { ...s.settings, sleepStartMin: v } };
    expect(saveSchema.safeParse(bad).success).toBe(false);
  });

  test('rejects bad enum and missing foodCounts key', () => {
    const s = createFreshSave(NOW);
    const badStage = { ...s, game: { ...s.game, pet: { ...s.game.pet, stage: 'x' } } };
    expect(saveSchema.safeParse(badStage).success).toBe(false);
    const food: Record<string, number> = { ...s.game.pet.history.foodCounts };
    delete food.grain;
    const history = { ...s.game.pet.history, foodCounts: food };
    const badFood = { ...s, game: { ...s.game, pet: { ...s.game.pet, history } } };
    expect(saveSchema.safeParse(badFood).success).toBe(false);
  });

  test('keeps every known notify stamp, fellAsleep included', () => {
    const s = createFreshSave(NOW);
    const lastNotified = Object.fromEntries(NOTIFY_KINDS.map((k, i) => [k, NOW + i]));
    const parsed = saveSchema.parse({ ...s, meta: { ...s.meta, lastNotified } });
    expect(parsed.meta.lastNotified).toEqual(lastNotified);
    expect(parsed.meta.lastNotified.fellAsleep).toBe(NOW + NOTIFY_KINDS.indexOf('fellAsleep'));
  });

  test('drops notify stamps this build does not know instead of rejecting the save', () => {
    const s = createFreshSave(NOW);
    const meta = { ...s.meta, lastNotified: { hungry: NOW, someFutureKind: NOW } };
    const parsed = saveSchema.safeParse({ ...s, meta });
    expect(parsed.success).toBe(true);
    expect(parsed.data?.meta.lastNotified).toEqual({ hungry: NOW });
    expect(parsed.data?.game).toEqual(s.game);
  });

  test('a save from before roaming loads with roaming off and the pet intact', () => {
    const s = createFreshSave(NOW);
    const settings: Record<string, unknown> = { ...s.settings };
    delete settings.roam;
    delete settings.roamHiddenSites;
    const parsed = saveSchema.safeParse({ ...s, settings });
    expect(parsed.success).toBe(true);
    expect(parsed.data?.settings.roam).toBe(false);
    expect(parsed.data?.settings.roamHiddenSites).toEqual([]);
    expect(parsed.data?.game).toEqual(s.game);
  });

  test.each([
    ['a URL', ['https://a.com']],
    ['a path', ['a.com/x']],
    ['spaces', ['A B']],
    ['too many sites', Array.from({ length: 101 }, (_, i) => `s${i}.com`)],
  ])('roamHiddenSites rejects %s', (_label, roamHiddenSites) => {
    const s = createFreshSave(NOW);
    expect(saveSchema.safeParse({ ...s, settings: { ...s.settings, roamHiddenSites } }).success).toBe(false);
  });

  test('rejects hunger out of range', () => {
    const s = createFreshSave(NOW);
    const stats = { ...s.game.pet.stats, hunger: 101 };
    const bad = { ...s, game: { ...s.game, pet: { ...s.game.pet, stats } } };
    expect(saveSchema.safeParse(bad).success).toBe(false);
  });
});

describe('save repository', () => {
  test('first run creates and persists a fresh save', async () => {
    const area = createMemoryArea();
    const s = await createSaveRepository(area, () => NOW).load();
    expect(s).toEqual(createFreshSave(NOW));
    expect(area.data.get(SAVE_KEY)).toEqual(s);
  });

  test('legacy keys are removed and renewal notice is flagged', async () => {
    const area = createMemoryArea({
      chrometchiState: {},
      chrometchiCatalog: [],
      chrometchiSettings: {},
    });
    const s = await createSaveRepository(area, () => NOW).load();
    expect(s.meta.showRenewal).toBe(true);
    for (const k of LEGACY_KEYS) expect(area.data.has(k)).toBe(false);
    expect(area.data.get(SAVE_KEY)).toEqual(s);
  });

  test('a single legacy key is removed', async () => {
    const area = createMemoryArea({ chrometchiCatalog: [1] });
    const s = await createSaveRepository(area, () => NOW).load();
    expect(s.meta.showRenewal).toBe(true);
    expect(area.data.has('chrometchiCatalog')).toBe(false);
  });

  test.each([{ version: 2 }, { version: 1, game: 'x' }, 'garbage', { version: 1 }])(
    'invalid save %j resets with showDataReset',
    async (bad) => {
      const area = createMemoryArea({ [SAVE_KEY]: bad });
      const s = await createSaveRepository(area, () => NOW).load();
      expect(s).toEqual(createFreshSave(NOW, { showDataReset: true }));
      expect(area.data.get(SAVE_KEY)).toEqual(s);
    },
  );

  test('valid save round-trips unchanged', async () => {
    const area = createMemoryArea();
    const repo = createSaveRepository(area, () => NOW);
    const saved = { ...createFreshSave(NOW), game: makeGame() };
    await repo.save(saved);
    expect(await repo.load()).toEqual(saved);
  });

  test('area errors propagate', async () => {
    const area = createMemoryArea();
    area.get = async () => {
      throw new Error('boom');
    };
    await expect(createSaveRepository(area, () => NOW).load()).rejects.toThrow('boom');
  });
});

test('a fresh save has an empty kitchen', () => {
  expect(createFreshSave(NOW).kitchen).toEqual(EMPTY_KITCHEN);
});

test('a fresh save starts in the home room', () => {
  expect(createFreshSave(NOW).home).toEqual({ room: 'home', ownedDecor: [], decor: {}, ownedAcc: [], worn: {} });
});

test('a fresh save starts with empty progress', () => {
  expect(createFreshSave(NOW).progress).toEqual(EMPTY_PROGRESS);
});
