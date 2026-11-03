import { describe, expect, test } from 'vitest';
import { EMPTY_KITCHEN } from '@/core/kitchen';
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
});
