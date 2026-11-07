import { describe, expect, test } from 'vitest';
import { FORMS } from '@/data/forms';
import { FRAME_MS, WALK_PX_PER_S } from './constants';
import { BOB_MS, BOB_PX, bounceOffset, FORM_GAITS, GAIT_STYLES, gaitOf, HOP_PX, type Gait } from './gait';

describe('gaits', () => {
  test('every form except the egg has a gait, and no gait names an unknown form', () => {
    const ids = FORMS.map((f) => f.id).filter((id) => id !== 'egg');
    expect(Object.keys(FORM_GAITS).sort()).toEqual([...ids].sort());
  });

  test('legless or winged forms float, legless ground forms crawl, forms with hands down go on all fours', () => {
    const expected: Record<string, Gait> = {
      adult_ghost: 'float', adult_nexus: 'float',
      adult_serpent: 'crawl', adult_pudding: 'crawl', adult_mole: 'crawl',
      adult_beast: 'trot', adult_salamander: 'trot', adult_turtle: 'trot', adult_griffin: 'trot', adult_comet: 'trot',
    };
    Object.entries(expected).forEach(([id, gait]) => expect(gaitOf(id)).toBe(gait));
  });

  test('the 41 new forms move as spec appendix A lists', () => {
    const byGait: Record<Gait, string[]> = {
      walk: ['young_kogane', 'adult_rooster', 'adult_otter', 'adult_mushroom', 'adult_sunflower', 'adult_clock',
        'adult_toaster', 'adult_mecha', 'adult_koala'],
      trot: ['adult_hedgehog', 'adult_ferret', 'adult_stag', 'adult_blackcat', 'adult_elephant'],
      hop: ['child_pico', 'child_tane', 'child_ame', 'child_yuki', 'young_tomoshi', 'young_koishi', 'adult_bunny',
        'adult_pumpkin', 'adult_pancake'],
      crawl: ['adult_seal'],
      float: ['child_awa', 'young_kingyo', 'young_kumo', 'young_kaminari', 'young_obake', 'young_tsurara',
        'adult_dolphin', 'adult_whale', 'adult_butterfly', 'adult_dandelion', 'adult_swallow', 'adult_stormbird',
        'adult_drone', 'adult_jellyfish', 'adult_fairy', 'adult_rainbow', 'adult_balloon'],
    };
    const listed = Object.entries(byGait).flatMap(([gait, ids]) => ids.map((id) => [id, gait] as const));
    expect(listed).toHaveLength(41);
    for (const [id, gait] of listed) expect(FORM_GAITS[id], id).toBe(gait);
  });

  test('the egg and unknown forms walk', () => {
    expect(gaitOf('egg')).toBe('walk');
    expect(gaitOf('nope')).toBe('walk');
  });

  test('walking keeps the original pace; only floaters leave the ground', () => {
    expect(GAIT_STYLES.walk).toEqual({ pxPerS: WALK_PX_PER_S, frameMs: FRAME_MS.walk, liftPx: 0 });
    const lifted = (Object.keys(GAIT_STYLES) as Gait[]).filter((g) => GAIT_STYLES[g].liftPx > 0);
    expect(lifted).toEqual(['float']);
  });

  test('crawlers are the slowest', () => {
    const others = (Object.keys(GAIT_STYLES) as Gait[]).filter((g) => g !== 'crawl');
    others.forEach((g) => expect(GAIT_STYLES.crawl.pxPerS).toBeLessThan(GAIT_STYLES[g].pxPerS));
  });
});

describe('bounceOffset', () => {
  const hopMs = 4 * GAIT_STYLES.hop.frameMs;
  const moving = (walkMs: number, nowMs = 0) => ({ walkMs, nowMs });
  const resting = (nowMs: number) => ({ walkMs: null, nowMs });

  test('hoppers arc off the ground while moving: two hops per 8-frame cycle', () => {
    expect(bounceOffset('hop', moving(0))).toBe(0);
    expect(bounceOffset('hop', moving(hopMs / 2))).toBe(HOP_PX);
    expect(bounceOffset('hop', moving(hopMs))).toBe(0);
    expect(bounceOffset('hop', resting(hopMs / 2))).toBe(0);
  });

  test('floaters drift up and down on page time, moving or not', () => {
    expect(bounceOffset('float', resting(0))).toBe(0);
    expect(bounceOffset('float', resting(BOB_MS / 2))).toBe(BOB_PX);
    expect(bounceOffset('float', moving(0, BOB_MS / 2))).toBe(BOB_PX);
  });

  test('walkers, trotters and crawlers stay on the ground', () => {
    (['walk', 'trot', 'crawl'] as const).forEach((g) => expect(bounceOffset(g, moving(hopMs / 2, BOB_MS / 2))).toBe(0));
  });

  test('offsets are whole art pixels (the art is drawn at 2x)', () => {
    for (let t = 0; t < 2000; t += 37) {
      expect(bounceOffset('hop', moving(t)) % 2).toBe(0);
      expect(bounceOffset('float', resting(t)) % 2).toBe(0);
    }
  });
});
