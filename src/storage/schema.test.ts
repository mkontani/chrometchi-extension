import { describe, expect, test } from 'vitest';
import { EMPTY_KITCHEN } from '@/core/kitchen';
import { EMPTY_PROGRESS } from '@/core/progress';
import type { Kitchen } from '@/core/types';
import { createFreshSave } from './repository';
import { saveSchema, type SaveV1 } from './schema';

const NOW = 1_000_000;

function withKitchen(kitchen: unknown) {
  return { ...createFreshSave(NOW), kitchen };
}

describe('saveSchema kitchen', () => {
  test('a save without kitchen loads with an empty kitchen and keeps the pet', () => {
    const old: Partial<SaveV1> = createFreshSave(NOW);
    delete old.kitchen;
    const parsed = saveSchema.safeParse({ ...old, zukan: { discovered: ['egg', 'baby_puni'], memories: [] } });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.kitchen).toEqual(EMPTY_KITCHEN);
    expect(parsed.data.zukan.discovered).toEqual(['egg', 'baby_puni']);
    expect(parsed.data.game.pet.stage).toBe('egg');
  });

  test('a kitchen round-trips', () => {
    const kitchen: Kitchen = {
      pantry: { fish: 3, cake: 99, egg: 0 },
      outings: { day: '2026-01-05', used: { fishing: 1, hunting: 3, gathering: 0 } },
      farm: { crop: 'fruit', growMinLeft: 12, watered: true },
      recipes: ['steak', 'cake'],
    };
    const parsed = saveSchema.safeParse(withKitchen(kitchen));
    expect(parsed.success && parsed.data.kitchen).toEqual(kitchen);
  });

  test('unknown pantry keys are dropped and counts outside 0..99 fail', () => {
    const k = { ...EMPTY_KITCHEN, pantry: { fish: 2, unicorn: 5 } };
    const parsed = saveSchema.safeParse(withKitchen(k));
    expect(parsed.success && parsed.data.kitchen.pantry).toEqual({ fish: 2 });
    for (const bad of [100, -1, 1.5]) {
      const r = saveSchema.safeParse(withKitchen({ ...EMPTY_KITCHEN, pantry: { fish: bad } }));
      expect(r.success).toBe(false);
    }
  });

  test('growMinLeft must be a non-negative integer', () => {
    for (const bad of [-1, 1.5]) {
      const farm = { ...EMPTY_KITCHEN.farm, growMinLeft: bad };
      expect(saveSchema.safeParse(withKitchen({ ...EMPTY_KITCHEN, farm })).success).toBe(false);
    }
  });

  test('outing counts and crop are validated', () => {
    const used = { fishing: -1, hunting: 0, gathering: 0 };
    const badUsed = { ...EMPTY_KITCHEN, outings: { day: '', used } };
    expect(saveSchema.safeParse(withKitchen(badUsed)).success).toBe(false);
    const badCrop = { ...EMPTY_KITCHEN, farm: { ...EMPTY_KITCHEN.farm, crop: 'rice' } };
    expect(saveSchema.safeParse(withKitchen(badCrop)).success).toBe(false);
  });

  test('a kitchen without recipes loads with an empty recipe book and keeps the pantry', () => {
    const plan1 = { pantry: { fish: 4 }, outings: EMPTY_KITCHEN.outings, farm: EMPTY_KITCHEN.farm };
    const parsed = saveSchema.safeParse(withKitchen(plan1));
    expect(parsed.success && parsed.data.kitchen.recipes).toEqual([]);
    expect(parsed.success && parsed.data.kitchen.pantry).toEqual({ fish: 4 });
  });

  test('unknown or repeated recipe ids are dropped', () => {
    const k = { ...EMPTY_KITCHEN, recipes: ['steak', 'pizza', 'steak'] };
    const parsed = saveSchema.safeParse(withKitchen(k));
    expect(parsed.success && parsed.data.kitchen.recipes).toEqual(['steak']);
  });
});

function withProgress(progress: unknown) {
  return { ...createFreshSave(NOW), progress };
}

describe('saveSchema home', () => {
  test('a save without home loads in the home room and keeps everything else', () => {
    const fresh = createFreshSave(NOW);
    const old: Partial<SaveV1> = { ...fresh };
    delete old.home;
    const parsed = saveSchema.safeParse(old);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.home).toEqual({ room: 'home', ownedDecor: [], decor: {}, ownedAcc: [], worn: {} });
    expect(parsed.data.game).toEqual(fresh.game);
    expect(parsed.data.progress).toEqual(fresh.progress);
    expect(parsed.data.meta).toEqual(fresh.meta);
  });

  test('an unknown or malformed room becomes home without resetting the save', () => {
    for (const home of ['moon', 5, null, { room: 'moon' }, { room: 5 }, { room: [] }, { room: null }]) {
      const parsed = saveSchema.safeParse({ ...createFreshSave(NOW), home });
      expect(parsed.success && parsed.data.home).toEqual({ room: 'home', ownedDecor: [], decor: {}, ownedAcc: [], worn: {} });
    }
  });

  test('a known room is kept', () => {
    const parsed = saveSchema.safeParse({ ...createFreshSave(NOW), home: { room: 'beach' } });
    expect(parsed.success && parsed.data.home).toEqual({ room: 'beach', ownedDecor: [], decor: {}, ownedAcc: [], worn: {} });
  });
});

describe('saveSchema furniture', () => {
  const parseHomeOf = (home: unknown) => {
    const parsed = saveSchema.safeParse({ ...createFreshSave(NOW), home });
    if (!parsed.success) throw new Error('save must never fail on furniture');
    return parsed.data.home;
  };

  test('a stage-2 home without furniture loads with none', () => {
    expect(parseHomeOf({ room: 'beach' })).toEqual({ room: 'beach', ownedDecor: [], decor: {}, ownedAcc: [], worn: {} });
  });

  test('the furniture parser drops unknown, unowned and misplaced items', () => {
    const home = parseHomeOf({
      room: 'home',
      ownedDecor: ['candle', 'ghost', 'rug', 'candle', 'clock', 'bunting', 7],
      decor: {
        moon: { floorL: 'candle' },
        beach: { wallL: 'clock', floorL: 'candle', ceiling: 'bunting', rug: 'rug' },
        home: {
          wallL: 'rug',
          wallR: 'clock',
          floorL: 'candle',
          floorR: 'candle',
          rug: 'rug',
          ceiling: 'lamp',
          nowhere: 'candle',
        },
        kitchen: { floorL: 'plant' },
      },
    });
    expect(home.ownedDecor).toEqual(['candle', 'rug', 'clock', 'bunting']);
    expect(home.decor).toEqual({
      beach: { floorL: 'candle', rug: 'rug' },
      home: { wallR: 'clock', rug: 'rug', floorL: 'candle' },
    });
  });

  test('unknown home fields still pass through', () => {
    expect(parseHomeOf({ room: 'home', future: ['x'] })).toEqual({
      room: 'home',
      ownedDecor: [],
      decor: {},
      ownedAcc: [],
      worn: {},
      future: ['x'],
    });
  });

  test('a malformed furniture section never resets the save', () => {
    for (const bad of [5, null, 'x', [], { a: 1 }]) {
      const home = parseHomeOf({ room: 'beach', ownedDecor: bad, decor: bad });
      expect(home).toEqual({ room: 'beach', ownedDecor: [], decor: {}, ownedAcc: [], worn: {} });
    }
    expect(parseHomeOf({ room: 'beach', ownedDecor: ['candle'], decor: { beach: 5, home: [] } })).toEqual({
      room: 'beach',
      ownedDecor: ['candle'],
      decor: {},
      ownedAcc: [],
      worn: {},
    });
  });
});

describe('saveSchema accessories', () => {
  const parseHomeOf = (home: unknown) => {
    const parsed = saveSchema.safeParse({ ...createFreshSave(NOW), home });
    if (!parsed.success) throw new Error('save must never fail on accessories');
    return parsed.data.home;
  };

  test('a stage-3 home without accessories loads with none', () => {
    const home = parseHomeOf({ room: 'home', ownedDecor: ['lamp'], decor: {} });
    expect(home).toMatchObject({ ownedDecor: ['lamp'], ownedAcc: [], worn: {} });
  });

  test('the accessory parser drops unknown, unowned and misplaced items', () => {
    const home = parseHomeOf({
      room: 'home',
      ownedAcc: ['ribbon', 'ghost', 'glasses', 'ribbon', 'bell', 7],
      worn: { head: 'ribbon', face: 'ribbon', neck: 'crown', hat: 'bell' },
    });
    expect(home.ownedAcc).toEqual(['ribbon', 'glasses', 'bell']);
    expect(home.worn).toEqual({ head: 'ribbon' });
    const unowned = parseHomeOf({ ownedAcc: ['bell'], worn: { head: 'crown', face: 'ghost', neck: 'bell' } });
    expect(unowned.worn).toEqual({ neck: 'bell' });
  });

  test('a malformed accessory section never resets the save', () => {
    for (const bad of [5, null, 'x', [], { a: 1 }]) {
      const home = parseHomeOf({ room: 'beach', ownedAcc: bad, worn: bad });
      expect(home).toEqual({ room: 'beach', ownedDecor: [], decor: {}, ownedAcc: [], worn: {} });
    }
    expect(parseHomeOf({ room: 'beach', ownedAcc: ['bell'], worn: 5 })).toMatchObject({ ownedAcc: ['bell'], worn: {} });
  });
});

describe('saveSchema progress', () => {
  test('a save without progress loads with empty progress and keeps everything else', () => {
    const fresh = createFreshSave(NOW);
    const old: Partial<SaveV1> = { ...fresh };
    delete old.progress;
    const parsed = saveSchema.safeParse(old);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.progress).toEqual(EMPTY_PROGRESS);
    expect(parsed.data.game).toEqual(fresh.game);
    expect(parsed.data.zukan).toEqual(fresh.zukan);
    expect(parsed.data.kitchen).toEqual(fresh.kitchen);
    expect(parsed.data.meta).toEqual(fresh.meta);
  });

  test('progress with a missing mission count gets 0 for it', () => {
    const parsed = saveSchema.safeParse(withProgress({ ...EMPTY_PROGRESS, counts: { clean: 4 } }));
    expect(parsed.success && parsed.data.progress.counts).toEqual({ ...EMPTY_PROGRESS.counts, clean: 4 });
  });

  test('unknown claimed and recent ids are dropped', () => {
    const progress = {
      ...EMPTY_PROGRESS,
      claimed: ['zukan:10', 'room:moon', 'zukan:10'],
      recent: [{ reason: 'mission:clean:9', coins: 5, at: 1 }],
    };
    const parsed = saveSchema.safeParse(withProgress(progress));
    expect(parsed.success && parsed.data.progress.claimed).toEqual(['zukan:10']);
    expect(parsed.success && parsed.data.progress.recent).toEqual([]);
  });

  test('recent keeps good entries and is cut to RECENT_MAX', () => {
    const good = { reason: 'ending:dead', coins: 30, at: 2 };
    const recent = [good, { reason: 'x' }, ...Array.from({ length: 8 }, () => good)];
    const parsed = saveSchema.safeParse(withProgress({ ...EMPTY_PROGRESS, recent }));
    expect(parsed.success && parsed.data.progress.recent).toEqual(Array(5).fill(good));
  });

  test('coins outside 0..99999 or not whole are clamped and floored', () => {
    const coins = (n: unknown) => {
      const parsed = saveSchema.safeParse(withProgress({ ...EMPTY_PROGRESS, coins: n }));
      return parsed.success && parsed.data.progress.coins;
    };
    expect(coins(-5)).toBe(0);
    expect(coins(100000)).toBe(99999);
    expect(coins(12.9)).toBe(12);
    expect(coins('x')).toBe(0);
  });

  test('a malformed progress becomes empty progress without resetting the save', () => {
    const fresh = createFreshSave(NOW);
    for (const bad of ['oops', { coins: 'x', counts: 5 }]) {
      const parsed = saveSchema.safeParse(withProgress(bad));
      expect(parsed.success).toBe(true);
      if (!parsed.success) continue;
      expect(parsed.data.progress).toEqual(EMPTY_PROGRESS);
      expect(parsed.data.game).toEqual(fresh.game);
    }
  });

  test('bad counts and unseen fall back field by field', () => {
    const parsed = saveSchema.safeParse(
      withProgress({ ...EMPTY_PROGRESS, coins: 7, counts: { clean: -2, play: 'a', feed: 3 }, unseen: 'yes' }),
    );
    expect(parsed.success && parsed.data.progress).toEqual({
      ...EMPTY_PROGRESS,
      coins: 7,
      counts: { ...EMPTY_PROGRESS.counts, feed: 3 },
    });
  });
});

describe('saveSchema care history', () => {
  function withHistory(patch: (h: Record<string, unknown>) => Record<string, unknown>) {
    const save = createFreshSave(NOW);
    const history = patch({ ...save.game.pet.history });
    return { ...save, game: { ...save.game, pet: { ...save.game.pet, history } } };
  }

  test('a history without the new counts loads with zeros', () => {
    const parsed = saveSchema.safeParse(
      withHistory((h) =>
        Object.fromEntries(
          Object.entries(h).filter(([k]) => !['roomMinutes', 'care', 'morningCare'].includes(k)),
        ),
      ),
    );
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.game.pet.history).toMatchObject({ roomMinutes: {}, care: 0, morningCare: 0 });
  });

  test('unknown rooms in the minutes are dropped', () => {
    const parsed = saveSchema.safeParse(
      withHistory((h) => ({ ...h, roomMinutes: { garden: 4, moon: 9, beach: -2, forest: 1.5 }, care: -1, morningCare: 2.5 })),
    );
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.game.pet.history.roomMinutes).toEqual({ garden: 4, beach: 0, forest: 0 });
    expect(parsed.data.game.pet.history).toMatchObject({
      care: 0,
      morningCare: 0,
    });
  });
});
