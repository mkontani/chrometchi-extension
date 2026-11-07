import type { FormId } from '@/core/types';

/**
 * Where a form wears things, as [x, y] in its 32 px art (pixel-edge coordinates, like the
 * accessory anchors). A worn item's own anchor lands on the point for its place, and the same
 * points serve every pose. How they were found, and the forms set by hand: style guide, Accessories.
 */
export interface FormAnchors {
  /** The hat line, 2-3 px below the top of the head. */
  readonly head: [number, number];
  /** The middle of the eyes. */
  readonly face: [number, number];
  /** Under the mouth, where a neck item's top edge goes. */
  readonly neck: [number, number];
}

/** id, then head x y, face x y, neck x y. */
type Row = readonly [FormId, number, number, number, number, number, number];

const ROWS: readonly Row[] = [
  // Baby and children
  ['baby_puni', 16, 4, 16, 14, 16, 22],
  ['child_kemu', 16, 4, 16, 14, 16, 22],
  ['child_dango', 16, 4, 16, 15, 16, 23],
  ['child_hoshi', 16, 4, 16, 15, 16, 23],
  ['child_mochi', 16, 7, 16, 16, 16, 23],
  // Young
  ['young_kirari', 16, 10, 16, 16, 16, 22],
  ['young_kage', 16, 11, 16, 17, 16, 22],
  ['young_poyo', 16, 4, 16, 12, 16, 22],
  ['young_hinoko', 14, 8, 13, 15, 13, 21],
  ['young_shizuku', 16, 8, 16, 16, 16, 22],
  ['young_mebuki', 16, 10, 16, 16, 16, 22],
  ['young_fuwari', 16, 8, 16, 13, 16, 20],
  ['young_gear', 16, 10, 16, 16, 16, 23],
  // Adults
  ['adult_dragon', 16, 6, 16, 13, 16, 22],
  ['adult_beast', 15, 5, 15, 15, 15, 23],
  ['adult_salamander', 13, 10, 11, 17, 11, 22],
  ['adult_phoenix', 11, 5, 10, 15, 10, 20],
  ['adult_serpent', 15, 4, 15, 13, 15, 18],
  ['adult_turtle', 16, 5, 16, 16, 16, 22],
  ['adult_kraken', 16, 4, 16, 15, 16, 22],
  ['adult_golem', 16, 4, 16, 15, 16, 22],
  ['adult_mole', 16, 4, 16, 12, 16, 22],
  ['adult_tree', 16, 5, 16, 20, 16, 25],
  ['adult_griffin', 16, 7, 16, 19, 16, 24],
  ['adult_owl', 16, 5, 16, 13, 16, 20],
  ['adult_pegasus', 16, 4, 16, 14, 16, 20],
  ['adult_robot', 16, 5, 16, 12, 16, 18],
  ['adult_ufo', 16, 8, 16, 17, 16, 23],
  ['adult_cyborg', 16, 4, 16, 14, 16, 22],
  ['adult_ghost', 16, 4, 16, 12, 16, 20],
  ['adult_alien', 16, 4, 16, 12, 16, 23],
  ['adult_bat', 16, 7, 16, 13, 16, 19],
  ['adult_vampire', 16, 4, 16, 15, 16, 23],
  ['adult_unicorn', 16, 4, 16, 16, 16, 22],
  ['adult_comet', 15, 5, 14, 17, 14, 23],
  ['adult_nexus', 16, 9, 16, 16, 16, 22],
  ['adult_astra', 16, 7, 16, 15, 16, 19],
  ['adult_bear', 16, 4, 16, 9, 16, 14],
  ['adult_hippo', 16, 3, 16, 9, 16, 23],
  ['adult_pudding', 16, 3, 16, 16, 16, 23],
  ['adult_grandpudding', 16, 7, 16, 15, 16, 20],
];

/** Every form but the egg, which can't wear anything. */
export const FORM_ANCHORS: Readonly<Record<FormId, FormAnchors>> = Object.fromEntries(
  ROWS.map(([id, hx, hy, fx, fy, nx, ny]) => [id, { head: [hx, hy], face: [fx, fy], neck: [nx, ny] }]),
);
