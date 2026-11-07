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
    expect(parsed.data.home).toEqual({ room: 'home', ownedDecor: [], decor: {} });
    expect(parsed.data.game).toEqual(fresh.game);
    expect(parsed.data.progress).toEqual(fresh.progress);
    expect(parsed.data.meta).toEqual(fresh.meta);
  });

  test('an unknown or malformed room becomes home without resetting the save', () => {
    for (const home of ['moon', 5, null, { room: 'moon' }, { room: 5 }, { room: [] }, { room: null }]) {
      const parsed = saveSchema.safeParse({ ...createFreshSave(NOW), home });
      expect(parsed.success && parsed.data.home).toEqual({ room: 'home', ownedDecor: [], decor: {} });
    }
  });

  test('a known room is kept', () => {
    const parsed = saveSchema.safeParse({ ...createFreshSave(NOW), home: { room: 'beach' } });
    expect(parsed.success && parsed.data.home).toEqual({ room: 'beach', ownedDecor: [], decor: {} });
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
