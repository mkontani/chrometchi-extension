import type { FormId } from '@/core/types';

/**
 * Where a form wears things, as [x, y] in its 32 px art (pixel-edge coordinates, like the
 * accessory anchors). A worn item's own anchor lands on the point for its place. The points are
 * idle0's, and every pose uses them, except that idle1 sinks those with y <= `squashRow` by 1 px.
 * How they were found, and the forms set by hand: style guide, Accessories.
 */
export interface FormAnchors {
  /** The hat line, 2-3 px below the top of the head. */
  readonly head: [number, number];
  /** The middle of the eyes. */
  readonly face: [number, number];
  /** Under the mouth, where a neck item's top edge goes. */
  readonly neck: [number, number];
  /**
   * The art row that idle1 removed (`scripts/art/idle1.ts squash`): rows [0, squashRow) sink 1 px
   * while the feet stay put. In pixel edges, edges 0..squashRow move down one (edge squashRow is the
   * bottom of row squashRow - 1) and the edges below stay, so in idle1 a point with y <= squashRow is 1 px lower.
   */
  readonly squashRow: number;
}

/** id, then head x y, face x y, neck x y, then the squash row (read from idle0 and idle1). */
type Row = readonly [FormId, number, number, number, number, number, number, number];

const ROWS: readonly Row[] = [
  // Baby and children
  ['baby_puni', 16, 4, 16, 14, 16, 22, 22],
  ['child_kemu', 16, 4, 16, 14, 16, 22, 23],
  ['child_dango', 16, 4, 16, 15, 16, 23, 26],
  ['child_hoshi', 16, 4, 16, 15, 16, 23, 25],
  ['child_mochi', 16, 7, 16, 16, 16, 23, 16],
  ['child_pico', 16, 4, 16, 14, 16, 19, 19],
  ['child_awa', 16, 4, 16, 15, 16, 22, 23],
  ['child_tane', 16, 5, 16, 13, 16, 19, 17],
  ['child_ame', 16, 8, 16, 14, 16, 20, 16],
  ['child_yuki', 16, 4, 16, 15, 16, 19, 23],
  // Young
  ['young_kirari', 16, 10, 16, 16, 16, 22, 21],
  ['young_kage', 16, 11, 16, 17, 16, 22, 24],
  ['young_poyo', 16, 4, 16, 12, 16, 22, 22],
  ['young_hinoko', 14, 8, 13, 15, 13, 21, 21],
  ['young_shizuku', 16, 8, 16, 16, 16, 22, 15],
  ['young_mebuki', 16, 10, 16, 16, 16, 22, 23],
  ['young_fuwari', 16, 8, 16, 13, 16, 20, 21],
  ['young_gear', 16, 10, 16, 16, 16, 23, 15],
  ['young_tomoshi', 16, 4, 16, 12, 16, 18, 23],
  ['young_kingyo', 13, 4, 12, 18, 12, 22, 19],
  ['young_kogane', 16, 5, 16, 15, 16, 22, 25],
  ['young_kumo', 15, 3, 17, 15, 17, 22, 16],
  ['young_kaminari', 14, 3, 16, 20, 16, 23, 25],
  ['young_obake', 16, 4, 16, 13, 16, 20, 20],
  ['young_tsurara', 17, 5, 17, 19, 17, 22, 17],
  ['young_koishi', 16, 4, 16, 15, 16, 22, 16],
  // Adults
  ['adult_dragon', 16, 6, 16, 13, 16, 22, 16],
  ['adult_beast', 15, 5, 15, 15, 15, 23, 22],
  ['adult_salamander', 13, 10, 11, 17, 11, 22, 17],
  ['adult_phoenix', 11, 5, 10, 15, 10, 20, 19],
  ['adult_hedgehog', 16, 4, 16, 18, 16, 22, 22],
  ['adult_ferret', 16, 6, 15, 15, 15, 19, 21],
  ['adult_rooster', 15, 4, 15, 15, 15, 19, 25],
  ['adult_serpent', 15, 4, 15, 13, 15, 18, 23],
  ['adult_turtle', 16, 5, 16, 16, 16, 22, 17],
  ['adult_kraken', 16, 4, 16, 15, 16, 22, 16],
  ['adult_seal', 16, 4, 16, 13, 16, 18, 22],
  ['adult_otter', 16, 4, 16, 12, 16, 17, 22],
  ['adult_dolphin', 16, 4, 16, 19, 16, 24, 17],
  ['adult_whale', 15, 3, 12, 20, 12, 25, 21],
  ['adult_golem', 16, 4, 16, 15, 16, 22, 18],
  ['adult_mole', 16, 4, 16, 12, 16, 22, 21],
  ['adult_tree', 16, 5, 16, 20, 16, 23, 22],
  ['adult_mushroom', 16, 4, 16, 18, 16, 23, 22],
  ['adult_bunny', 16, 5, 16, 16, 16, 19, 22],
  ['adult_sunflower', 16, 3, 16, 15, 16, 21, 26],
  ['adult_stag', 16, 3, 16, 9, 16, 12, 16],
  ['adult_griffin', 16, 7, 16, 19, 16, 22, 18],
  ['adult_owl', 16, 5, 16, 13, 16, 20, 18],
  ['adult_pegasus', 16, 4, 16, 14, 16, 20, 26],
  ['adult_butterfly', 16, 3, 16, 15, 16, 20, 18],
  ['adult_dandelion', 16, 4, 17, 15, 17, 19, 19],
  ['adult_swallow', 27, 5, 17, 16, 17, 22, 22],
  ['adult_stormbird', 14, 4, 13, 16, 13, 21, 26],
  ['adult_robot', 16, 5, 16, 12, 16, 18, 22],
  ['adult_ufo', 16, 8, 16, 17, 16, 23, 17],
  ['adult_cyborg', 16, 4, 16, 14, 16, 22, 16],
  ['adult_clock', 16, 4, 16, 14, 16, 19, 23],
  ['adult_drone', 16, 5, 16, 18, 16, 23, 25],
  ['adult_toaster', 16, 3, 10, 21, 10, 25, 21],
  ['adult_mecha', 16, 4, 16, 8, 16, 12, 22],
  ['adult_ghost', 16, 4, 16, 12, 16, 20, 16],
  ['adult_alien', 16, 4, 16, 12, 16, 23, 24],
  ['adult_bat', 16, 7, 16, 13, 16, 19, 23],
  ['adult_vampire', 16, 4, 16, 15, 16, 23, 16],
  ['adult_pumpkin', 17, 3, 19, 9, 19, 13, 23],
  ['adult_blackcat', 16, 5, 16, 15, 16, 22, 25],
  ['adult_koala', 20, 3, 16, 16, 16, 22, 17],
  ['adult_unicorn', 16, 4, 16, 16, 16, 22, 26],
  ['adult_comet', 15, 5, 14, 17, 14, 23, 22],
  ['adult_nexus', 16, 9, 16, 16, 16, 22, 16],
  ['adult_astra', 16, 7, 16, 15, 16, 19, 20],
  ['adult_jellyfish', 16, 4, 16, 14, 16, 21, 26],
  ['adult_fairy', 19, 5, 17, 15, 17, 19, 25],
  ['adult_rainbow', 16, 4, 16, 15, 16, 19, 22],
  ['adult_bear', 16, 4, 16, 9, 16, 14, 22],
  ['adult_hippo', 16, 3, 16, 9, 16, 23, 17],
  ['adult_pudding', 16, 3, 16, 16, 16, 23, 22],
  ['adult_grandpudding', 16, 7, 16, 15, 16, 20, 15],
  ['adult_elephant', 16, 3, 16, 15, 16, 21, 25],
  ['adult_balloon', 16, 4, 16, 14, 16, 17, 27],
  ['adult_pancake', 16, 4, 16, 12, 16, 18, 24],
];

/** Every form but the egg, which can't wear anything. */
export const FORM_ANCHORS: Readonly<Record<FormId, FormAnchors>> = Object.fromEntries(
  ROWS.map(([id, hx, hy, fx, fy, nx, ny, squashRow]) => [
    id,
    { head: [hx, hy], face: [fx, fy], neck: [nx, ny], squashRow },
  ]),
);
