import type { Family } from '@/core/types';

export type ZukanFamily = Exclude<Family, 'none'>;

export interface ZukanFamilyRow {
  readonly family: ZukanFamily;
  readonly young: readonly string[];
  /** Existing adults first (games, default), then stop, light, morning, then the rare. */
  readonly adults: readonly string[];
}

export interface ZukanOrder {
  readonly early: readonly string[];
  readonly families: readonly ZukanFamilyRow[];
}

export const ZUKAN_ORDER: ZukanOrder = {
  early: [
    'egg', 'baby_puni',
    'child_kemu', 'child_dango', 'child_hoshi', 'child_mochi',
    'child_pico', 'child_awa', 'child_tane', 'child_ame', 'child_yuki',
  ],
  families: [
    { family: 'solar', young: ['young_hinoko', 'young_tomoshi'],
      adults: ['adult_dragon', 'adult_beast', 'adult_salamander', 'adult_hedgehog', 'adult_ferret', 'adult_rooster', 'adult_phoenix'] },
    { family: 'water', young: ['young_shizuku', 'young_kingyo'],
      adults: ['adult_serpent', 'adult_turtle', 'adult_kraken', 'adult_seal', 'adult_otter', 'adult_dolphin', 'adult_whale'] },
    { family: 'earth', young: ['young_mebuki', 'young_kogane'],
      adults: ['adult_golem', 'adult_mole', 'adult_tree', 'adult_mushroom', 'adult_bunny', 'adult_sunflower', 'adult_stag'] },
    { family: 'wind', young: ['young_fuwari', 'young_kumo'],
      adults: ['adult_griffin', 'adult_owl', 'adult_pegasus', 'adult_butterfly', 'adult_dandelion', 'adult_swallow', 'adult_stormbird'] },
    { family: 'metal', young: ['young_gear', 'young_kaminari'],
      adults: ['adult_robot', 'adult_ufo', 'adult_cyborg', 'adult_clock', 'adult_drone', 'adult_toaster', 'adult_mecha'] },
    { family: 'lunar', young: ['young_kage', 'young_obake'],
      adults: ['adult_ghost', 'adult_alien', 'adult_bat', 'adult_pumpkin', 'adult_blackcat', 'adult_koala', 'adult_vampire'] },
    { family: 'ether', young: ['young_kirari', 'young_tsurara'],
      adults: ['adult_unicorn', 'adult_comet', 'adult_nexus', 'adult_jellyfish', 'adult_fairy', 'adult_rainbow', 'adult_astra'] },
    { family: 'heavy', young: ['young_poyo', 'young_koishi'],
      adults: ['adult_bear', 'adult_hippo', 'adult_pudding', 'adult_elephant', 'adult_balloon', 'adult_pancake', 'adult_grandpudding'] },
  ],
};
