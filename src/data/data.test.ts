import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import { type PngData, readPng } from '../../scripts/art/lib';
import type { RefuseReason, Stage } from '@/core/types';
import { DISH_IDS, FOODS, INGREDIENT_IDS, isDish } from './foods';
import { POT_ITEMS, RECIPES } from './recipes';
import { FORMS } from './forms';
import { GAMES } from './games';
import { ROOMS, ROOM_IDS } from './rooms';
import { ACCESSORIES, ACCESSORY_IDS, WEAR_PLACES } from './accessories';
import { FORM_ANCHORS } from './anchors';
import { DECOR, DECOR_IDS } from './decor';
import { ROOM_SLOTS, SLOT_IDS, SLOT_KIND } from './slots';
import {
  COINS_MAX,
  ENDING_COINS,
  MISSIONS,
  MISSION_KINDS,
  RECENT_MAX,
  REWARD_IDS,
  SELL_PRICE,
  ZUKAN_MILESTONES,
} from './economy';

type Messages = Record<string, { message: string }>;
const load = (locale: string): Messages =>
  JSON.parse(
    readFileSync(resolve(__dirname, `../../public/_locales/${locale}/messages.json`), 'utf8'),
  ) as Messages;
const ja = load('ja');
const en = load('en');

const ORDER: Stage[] = ['egg', 'baby', 'child', 'young', 'adult'];
const isFallback = (when: object) => Object.keys(when).length === 0;
/** Spec 7.3: a new player can afford one item of every kind. */
const AFFORDABLE = 100;

describe('form data', () => {
  test('form ids are unique and there are 42 forms', () => {
    expect(new Set(FORMS.map((f) => f.id)).size).toBe(42);
    expect(FORMS).toHaveLength(42);
  });

  test('every non-adult form has >=2 children and exactly one {} fallback', () => {
    for (const parent of FORMS.filter((f) => f.stage !== 'adult' && f.stage !== 'egg')) {
      const children = FORMS.filter((f) => f.from.includes(parent.id));
      expect(children.length, parent.id).toBeGreaterThanOrEqual(2);
      expect(children.filter((c) => isFallback(c.when)).length, parent.id).toBe(1);
    }
  });

  test('every `from` id refers to an existing form of the previous stage', () => {
    for (const form of FORMS.filter((f) => f.stage !== 'egg')) {
      const prev = ORDER[ORDER.indexOf(form.stage) - 1];
      expect(form.from.length, form.id).toBeGreaterThan(0);
      for (const id of form.from) {
        const parent = FORMS.find((f) => f.id === id);
        expect(parent, `${form.id} <- ${id}`).toBeDefined();
        expect(parent?.stage, `${form.id} <- ${id}`).toBe(prev);
      }
    }
  });

  test('4 hidden adults have priority 100', () => {
    expect(FORMS.filter((f) => f.priority === 100 && f.stage === 'adult')).toHaveLength(4);
  });

  test('the heavy line uses original pudding forms, not slimes', () => {
    const ids = FORMS.map((f) => f.id);
    expect(ids).toEqual(expect.arrayContaining(['adult_pudding', 'adult_grandpudding']));
    expect(ids.filter((id) => /slime/.test(id))).toEqual([]);
    for (const f of FORMS) expect(f.motif, f.id).not.toMatch(/slime|jelly mound|teardrop/i);
  });

  test('every form has a 4-12 word motif', () => {
    for (const f of FORMS) {
      const words = f.motif.trim().split(/\s+/).length;
      expect(words, f.id).toBeGreaterThanOrEqual(4);
      expect(words, f.id).toBeLessThanOrEqual(12);
    }
  });
});

describe('new ingredients', () => {
  test('the new ingredients count as fish, meat, grain, veggie and sweet', () => {
    const expected = { shrimp: 'fish', egg: 'meat', nuts: 'grain', mushroom: 'veggie', fruit: 'sweet' };
    for (const [id, tag] of Object.entries(expected)) {
      const def = FOODS.find((f) => f.id === id);
      expect(def?.tag, id).toBe(tag);
      expect(def?.kind, id).toBe('meal');
    }
  });
});

describe('dishes', () => {
  // id, tag, kind, hunger, mood, weight, vitality
  const table = [
    ['steak', 'meat', 'meal', 60, 15, 2, 3],
    ['acquapazza', 'fish', 'meal', 60, 15, 1, 6],
    ['onigiri', 'grain', 'meal', 55, 10, 1, 2],
    ['omurice', 'meat', 'meal', 60, 15, 2, 3],
    ['seafoodbowl', 'fish', 'meal', 65, 15, 1, 5],
    ['friedshrimp', 'fish', 'meal', 55, 20, 2, 2],
    ['hamburg', 'meat', 'meal', 65, 20, 2, 3],
    ['stirfry', 'veggie', 'meal', 50, 10, 0, 8],
    ['mushroomsoup', 'veggie', 'meal', 45, 10, 0, 8],
    ['nutcookie', 'grain', 'snack', 15, 25, 2, 0],
    ['fruittart', 'sweet', 'snack', 15, 35, 2, 2],
    ['mystery', 'grain', 'meal', 20, 5, 1, 0],
  ] as const;

  test('the dishes and the mystery dish are foods with the planned values', () => {
    for (const [id, tag, kind, hunger, mood, weight, vitality] of table) {
      expect(FOODS.find((f) => f.id === id), id).toEqual({
        id, tag, kind, hunger, mood, weight, vitality,
      });
    }
    expect(FOODS.map((f) => f.id).slice(0, 11)).toEqual([
      'rice', 'candy', 'fish', 'shrimp', 'meat', 'egg', 'nuts', 'mushroom', 'veggie', 'fruit', 'cake',
    ]);
    expect(FOODS.map((f) => f.id).slice(11)).toEqual(table.map((r) => r[0]));
  });

  test('DISH_IDS lists the 12 dishes in spec order, and isDish is true only for them and mystery', () => {
    expect(DISH_IDS).toEqual([
      'steak', 'acquapazza', 'cake', 'onigiri', 'omurice', 'seafoodbowl',
      'friedshrimp', 'hamburg', 'stirfry', 'mushroomsoup', 'nutcookie', 'fruittart',
    ]);
    for (const id of DISH_IDS) expect(isDish(id), id).toBe(true);
    expect(isDish('mystery')).toBe(true);
    expect(isDish('fish')).toBe(false);
    expect(isDish('rice')).toBe(false);
    expect(isDish('candy')).toBe(false);
  });

  test('INGREDIENT_IDS lists the 8 ingredients', () => {
    expect(INGREDIENT_IDS).toEqual([
      'fish', 'shrimp', 'meat', 'egg', 'nuts', 'mushroom', 'veggie', 'fruit',
    ]);
  });
});

describe('recipes', () => {
  const key = (items: Readonly<Record<string, number | undefined>>) =>
    Object.entries(items).filter(([, n]) => n).sort().join('|');

  test('there are 12 recipes, one per dish, in dish order', () => {
    expect(RECIPES.map((r) => r.id)).toEqual(DISH_IDS);
    expect(POT_ITEMS).toEqual(['rice', ...INGREDIENT_IDS]);
  });

  test('no two recipes share the same ingredients', () => {
    expect(new Set(RECIPES.map((r) => key(r.items))).size).toBe(RECIPES.length);
  });

  test('every recipe uses 1 to 4 pot items and only pot items', () => {
    for (const r of RECIPES) {
      const entries = Object.entries(r.items);
      const total = entries.reduce((sum, [, n]) => sum + n, 0);
      expect(total, r.id).toBeGreaterThanOrEqual(1);
      expect(total, r.id).toBeLessThanOrEqual(4);
      for (const [item, n] of entries) {
        expect(POT_ITEMS as readonly string[], r.id).toContain(item);
        expect(Number.isInteger(n) && n > 0, r.id).toBe(true);
      }
    }
  });

  test("every recipe's dish is a food whose tag is the tag of one of its ingredients", () => {
    for (const r of RECIPES) {
      const tag = FOODS.find((f) => f.id === r.id)?.tag;
      const tags = Object.keys(r.items).map((i) => FOODS.find((f) => f.id === i)?.tag);
      expect(tag, r.id).toBeDefined();
      expect(tags, r.id).toContain(tag);
    }
  });

  test("every dish restores more hunger plus mood than any raw ingredient in its recipe", () => {
    const worth = (id: string) => {
      const f = FOODS.find((x) => x.id === id);
      return (f?.hunger ?? 0) + (f?.mood ?? 0);
    };
    for (const r of RECIPES) {
      for (const item of Object.keys(r.items)) {
        expect(worth(r.id), `${r.id} vs ${item}`).toBeGreaterThan(worth(item));
      }
    }
  });
});

describe('i18n', () => {
  test('ja and en messages have identical key sets', () => {
    expect(Object.keys(ja).sort()).toEqual(Object.keys(en).sort());
  });

  test('every form, food and game has a message in both locales', () => {
    const keys = [
      ...FORMS.map((f) => `form_${f.id}`),
      ...FOODS.map((f) => `food_${f.id}`),
      ...GAMES.map((g) => `game_${g}`),
    ];
    expect(keys).toHaveLength(42 + 23 + 3);
    for (const key of keys) {
      expect(ja[key]?.message, `ja ${key}`).toBeTruthy();
      expect(en[key]?.message, `en ${key}`).toBeTruthy();
    }
  });

  test('every furniture item has a name in both locales', () => {
    for (const id of DECOR_IDS) {
      expect(ja[`decor_${id}`]?.message, `ja ${id}`).toBeTruthy();
      expect(en[`decor_${id}`]?.message, `en ${id}`).toBeTruthy();
    }
  });

  test('every accessory and wear place has a name in both locales', () => {
    expect(ACCESSORY_IDS).toHaveLength(25);
    expect(WEAR_PLACES).toHaveLength(3);
    for (const id of ACCESSORY_IDS) {
      expect(ja[`acc_${id}`]?.message, `ja ${id}`).toBeTruthy();
      expect(en[`acc_${id}`]?.message, `en ${id}`).toBeTruthy();
    }
    for (const place of WEAR_PLACES) {
      expect(ja[`wear_${place}`]?.message, `ja ${place}`).toBeTruthy();
      expect(en[`wear_${place}`]?.message, `en ${place}`).toBeTruthy();
    }
  });

  test('every form except egg and baby has a hint in both locales', () => {
    const hinted = FORMS.filter((f) => f.stage !== 'egg' && f.stage !== 'baby');
    expect(hinted).toHaveLength(40);
    for (const f of hinted) {
      expect(ja[`hint_${f.id}`]?.message, `ja ${f.id}`).toBeTruthy();
      expect(en[`hint_${f.id}`]?.message, `en ${f.id}`).toBeTruthy();
    }
  });

  test('every refuse reason has a message in both locales', () => {
    const reasons: Record<RefuseReason, true> = {
      full: true, notSick: true, asleep: true, awake: true,
      notAlive: true, egg: true, cooldown: true, noPoop: true, noStock: true, outingLimit: true,
      farmNotReady: true, pantryFull: true, locked: true,
      owned: true, noCoins: true, noSlot: true, notOwned: true, wrongSlot: true, wrongPlace: true,
    };
    for (const reason of Object.keys(reasons)) {
      expect(ja[`refuse_${reason}`]?.message, `ja ${reason}`).toBeTruthy();
      expect(en[`refuse_${reason}`]?.message, `en ${reason}`).toBeTruthy();
    }
  });

  test('restart confirmation says goodbye to the pet and keeps the zukan', () => {
    expect(ja.confirm_restart?.message).toMatch(/お別れ/);
    expect(ja.confirm_restart?.message).toMatch(/ずかんはそのまま/);
    expect(en.confirm_restart?.message).toMatch(/goodbye/i);
    expect(en.confirm_restart?.message).toMatch(/kept/i);
    expect(en.confirm_restart?.message).not.toMatch(/erase/i);
  });

  test('message keys are valid chrome.i18n keys', () => {
    for (const key of Object.keys(ja)) expect(key).toMatch(/^[A-Za-z0-9_]+$/);
  });

  test('form names avoid franchise-adjacent names', () => {
    const banned = /カバオ|Kabao|モグロ|Moguro|スライム|Slime/i;
    for (const [locale, msgs] of [['ja', ja], ['en', en]] as const) {
      for (const f of FORMS) {
        expect(msgs[`form_${f.id}`]?.message, `${locale} ${f.id}`).not.toMatch(banned);
      }
    }
  });

  test('no form name ends with っち or tchi', () => {
    for (const [locale, msgs] of [['ja', ja], ['en', en]] as const) {
      for (const f of FORMS) {
        const name = msgs[`form_${f.id}`]?.message ?? '';
        expect(name, `${locale} ${f.id}`).not.toMatch(/(っち|ッチ|tchi)$/i);
      }
    }
  });
});

describe('economy data', () => {
  test('the economy numbers match the spec', () => {
    expect(MISSION_KINDS).toEqual(['clean', 'play', 'feed', 'outing', 'harvest', 'cook']);
    const table = (targets: number[]) => targets.map((target, i) => ({ target, coins: [30, 80, 200][i] }));
    expect(MISSIONS).toEqual({
      clean: table([10, 30, 100]),
      play: table([10, 30, 100]),
      feed: table([20, 60, 200]),
      outing: table([5, 20, 50]),
      harvest: table([3, 10, 30]),
      cook: table([5, 20, 50]),
    });
    expect(ZUKAN_MILESTONES).toEqual([
      { count: 10, coins: 50 },
      { count: 20, coins: 50 },
      { count: 30, coins: 50 },
      { count: 40, coins: 50 },
      { count: 50, coins: 50 },
      { count: 60, coins: 100 },
      { count: 70, coins: 100 },
      { count: 80, coins: 100 },
    ]);
    expect(ENDING_COINS).toEqual({ departed: 100, dead: 30 });
    expect(COINS_MAX).toBe(99999);
    expect(RECENT_MAX).toBe(5);
  });

  test('only the 8 ingredients have a sell price, from 1 to 3', () => {
    expect(Object.keys(SELL_PRICE).sort()).toEqual([...INGREDIENT_IDS].sort());
    expect(SELL_PRICE).toEqual({
      nuts: 1, mushroom: 1, egg: 1, fish: 2, veggie: 2, fruit: 2, meat: 3, shrimp: 3,
    });
  });

  test('REWARD_IDS lists ending:first, 8 zukan and 18 mission rewards, without repeats', () => {
    expect(REWARD_IDS).toHaveLength(27);
    expect(new Set(REWARD_IDS).size).toBe(27);
    expect(REWARD_IDS.filter((r) => r.startsWith('zukan:'))).toHaveLength(8);
    expect(REWARD_IDS.filter((r) => r.startsWith('mission:'))).toHaveLength(18);
    expect(REWARD_IDS[0]).toBe('ending:first');
    expect(REWARD_IDS[1]).toBe('zukan:10');
    expect(REWARD_IDS[9]).toBe('mission:clean:1');
  });

  test('the rooms match the spec table', () => {
    expect(ROOMS.map((r) => [r.id, r.outdoor, r.unlock])).toEqual([
      ['home', false, null],
      ['garden', true, 'ending:first'],
      ['beach', true, 'zukan:10'],
      ['forest', true, 'zukan:20'],
      ['sweets', false, 'zukan:30'],
      ['snowfield', true, 'zukan:40'],
      ['castle', false, 'zukan:50'],
      ['washitsu', false, 'mission:clean:2'],
      ['space', false, 'mission:play:2'],
      ['cabin', false, 'mission:cook:2'],
      ['library', false, 'mission:outing:2'],
    ]);
    expect(ROOM_IDS).toEqual(ROOMS.map((r) => r.id));
  });

  test('every room unlock is a known reward id', () => {
    for (const r of ROOMS) if (r.unlock) expect(REWARD_IDS, r.id).toContain(r.unlock);
  });
});

describe('furniture data', () => {
  test('the furniture matches the spec table', () => {
    const row = (d: (typeof DECOR)[number]) => [d.id, d.slot, String(d.kind), d.price, d.size].join(' ');
    expect(DECOR.map(row)).toEqual([
      'candle floor light 70 24', 'lamp floor light 130 32',
      'fishbowl floor water 160 32', 'vase floor water 80 32',
      'plant floor plant 80 32', 'cactus floor plant 80 24', 'bonsai floor plant 200 32',
      'bunting ceiling sky 80 32', 'telescope floor sky 330 32',
      'clock wall gadget 100 24', 'musicbox floor gadget 200 24', 'toypiano floor gadget 260 32',
      'lantern ceiling night 100 24', 'petbed floor night 130 32',
      'trophy floor sparkle 330 24', 'globe floor sparkle 100 24', 'xmastree floor sparkle 390 32',
      'armchair floor cozy 260 32', 'cushion rug cozy 70 32', 'table floor cozy 160 32',
      'stool floor cozy 80 24', 'rug rug cozy 100 32',
      'ball floor null 70 24', 'blocks floor null 70 24', 'drum floor null 160 24',
      'shelf floor null 200 32', 'picture wall null 130 24', 'chest floor null 260 32',
    ]);
  });

  test('every kind has an item for 100 coins or less', () => {
    const kinds = new Set(DECOR.flatMap((d) => (d.kind ? [d.kind] : [])));
    expect(kinds.size).toBe(8);
    for (const kind of kinds) {
      expect(DECOR.some((d) => d.kind === kind && d.price <= AFFORDABLE), kind).toBe(true);
    }
  });

  test('outdoor rooms have only the floor and rug slots', () => {
    for (const room of ROOMS) {
      const slots = Object.keys(ROOM_SLOTS[room.id]).sort();
      expect(slots, room.id).toEqual(room.outdoor ? ['floorL', 'floorR', 'rug'] : [...SLOT_IDS].sort());
    }
  });

  test('every slot sits on the stage and the room-pixel grid, fits its items and keeps clear of the others', () => {
    const STAGE = { w: 352, h: 272 };
    /** Items are drawn at 2x, so the widest item of a slot kind is twice its largest art size. */
    const widest = (kind: string) => 2 * Math.max(...DECOR.filter((d) => d.slot === kind).map((d) => d.size));
    for (const room of ROOM_IDS) {
      const rects = Object.entries(ROOM_SLOTS[room]).flatMap(([slot, r]) => (r ? [{ slot, r }] : []));
      for (const { slot, r } of rects) {
        const kind = SLOT_KIND[slot as keyof typeof SLOT_KIND];
        const at = `${room} ${slot}`;
        expect([r.x, r.y, r.w, r.h].every((v) => v % 4 === 0), at).toBe(true);
        expect(r.x >= 0 && r.y >= 0 && r.x + r.w <= STAGE.w && r.y + r.h <= STAGE.h, at).toBe(true);
        expect(r.w, at).toBeGreaterThanOrEqual(widest(kind));
        // Ceiling and rug items may overflow the rect's height (style guide), so only floor and wall are checked.
        if (kind === 'floor' || kind === 'wall') expect(r.h, at).toBeGreaterThanOrEqual(widest(kind));
      }
      for (const [i, a] of rects.entries()) {
        for (const b of rects.slice(i + 1)) {
          const apart =
            a.r.x + a.r.w <= b.r.x || b.r.x + b.r.w <= a.r.x || a.r.y + a.r.h <= b.r.y || b.r.y + b.r.h <= a.r.y;
          expect(apart, `${room} ${a.slot} and ${b.slot}`).toBe(true);
        }
      }
    }
  });

  test("no floor slot overlaps the pet's box", () => {
    const box = { x: 112, y: 100, w: 128, h: 128 };
    for (const room of ROOM_IDS) {
      for (const [slot, r] of Object.entries(ROOM_SLOTS[room])) {
        if (SLOT_KIND[slot as keyof typeof SLOT_KIND] !== 'floor' || !r) continue;
        const apart = r.x + r.w <= box.x || r.x >= box.x + box.w || r.y + r.h <= box.y || r.y >= box.y + box.h;
        expect(apart, `${room} ${slot}`).toBe(true);
      }
    }
  });
});

describe('accessory data', () => {
  test('the accessories match the spec table', () => {
    const row = (a: (typeof ACCESSORIES)[number]) => [a.id, a.place, a.price, a.size].join(' ');
    expect(ACCESSORIES.map(row)).toEqual([
      'ribbon head 70 16', 'crown head 260 16', 'partyhat head 80 16', 'tophat head 160 16',
      'beret head 100 16', 'strawhat head 100 20', 'flowercrown head 200 24', 'chefhat head 130 16',
      'beanie head 100 16', 'santahat head 160 16', 'tiara head 260 16', 'cap head 80 16',
      'wizardhat head 200 20', 'headphones head 200 20', 'flowerpin head 70 16',
      'starclip head 70 16', 'leaf head 70 16',
      'glasses face 100 16', 'sunglasses face 130 16', 'heartglasses face 160 16',
      'bowtie neck 80 16', 'scarf neck 130 20', 'bell neck 80 16', 'medal neck 260 16',
      'necklace neck 200 16',
    ]);
  });

  test('every accessory anchor lies inside its art', () => {
    for (const a of ACCESSORIES) {
      const png = readPng(resolve(__dirname, `../assets/ui/acc/${a.id}.png`));
      expect(png, a.id).not.toBeNull();
      if (!png) continue;
      const box = opaqueBox(png);
      // Whole art pixels keep the item on the pet's 4x pixel grid.
      expect(Number.isInteger(a.anchor.x) && Number.isInteger(a.anchor.y), a.id).toBe(true);
      expect(a.anchor.x, a.id).toBeGreaterThanOrEqual(box.left);
      expect(a.anchor.x, a.id).toBeLessThanOrEqual(box.right);
      expect(a.anchor.y, a.id).toBeGreaterThanOrEqual(box.top);
      expect(a.anchor.y, a.id).toBeLessThanOrEqual(box.bottom);
    }
  });

  test('the scarf, necklace and flower crown are short, at most 8 px tall (Gate P)', () => {
    for (const id of ['scarf', 'necklace', 'flowercrown']) {
      const png = readPng(resolve(__dirname, `../assets/ui/acc/${id}.png`));
      expect(png, id).not.toBeNull();
      if (!png) continue;
      const box = opaqueBox(png);
      expect(box.bottom - box.top, id).toBeLessThanOrEqual(8);
    }
  });
});

describe('form anchors', () => {
  const wearers = FORMS.filter((f) => f.stage !== 'egg').map((f) => f.id);
  const points = (id: string) => {
    const a = FORM_ANCHORS[id];
    return a ? [a.head, a.face, a.neck] : [];
  };

  test('every form but the egg has anchors', () => {
    expect(wearers).toHaveLength(41);
    expect(Object.keys(FORM_ANCHORS).sort()).toEqual([...wearers].sort());
    expect(FORM_ANCHORS.egg).toBeUndefined();
  });

  test('every anchor lies inside the 32 px art', () => {
    for (const id of wearers) {
      expect(points(id), id).toHaveLength(3);
      for (const [x, y] of points(id)) {
        // Whole art pixels keep the item on the pet's 4x pixel grid.
        expect(Number.isInteger(x) && Number.isInteger(y), id).toBe(true);
        expect(x >= 0 && x <= 32 && y >= 0 && y <= 32, `${id} (${x},${y})`).toBe(true);
      }
    }
  });

  test.each(wearers)('%s: the head point is above the face point and the face point is above the neck point', (id) => {
    const [head, face, neck] = points(id);
    expect(head?.[1]).toBeLessThan(face?.[1] ?? -1);
    expect(face?.[1]).toBeLessThan(neck?.[1] ?? -1);
  });

  test('idle1 equals idle0 with the rows above squashRow moved down one', () => {
    for (const id of wearers) {
      const idle0 = readPng(resolve(__dirname, `../assets/sprites/${id}/idle0.png`));
      const idle1 = readPng(resolve(__dirname, `../assets/sprites/${id}/idle1.png`));
      const cut = FORM_ANCHORS[id]?.squashRow;
      expect(idle0 && idle1 && cut !== undefined, id).toBeTruthy();
      if (!idle0 || !idle1 || cut === undefined) continue;
      expect(Number.isInteger(cut) && cut > 0 && cut < idle0.height, `${id} squashRow ${cut}`).toBe(true);
      expect(sameRows(idle1, 1, idle0, 0, cut), `${id}: rows 0-${cut - 1} sink 1 px`).toBe(true);
      expect(sameRows(idle1, cut + 1, idle0, cut + 1, idle0.height - cut - 1), `${id}: rows below ${cut} stay`).toBe(true);
      expect(idle1.data.subarray(0, idle1.width * 4).every((v) => v === 0), `${id}: idle1 row 0 is empty`).toBe(true);
    }
  });

  test('a bow tie hangs at most 1 px below the feet (Gate P)', () => {
    const bowtie = ACCESSORIES.find((a) => a.id === 'bowtie');
    const tie = readPng(resolve(__dirname, '../assets/ui/acc/bowtie.png'));
    expect(bowtie && tie).toBeTruthy();
    if (!bowtie || !tie) return;
    const below = opaqueBox(tie).bottom - bowtie.anchor.y;
    for (const id of wearers) {
      const pet = readPng(resolve(__dirname, `../assets/sprites/${id}/idle0.png`));
      const neck = FORM_ANCHORS[id]?.neck;
      expect(pet && neck, id).toBeTruthy();
      if (!pet || !neck) continue;
      expect(neck[1] + below - opaqueBox(pet).bottom, id).toBeLessThanOrEqual(1);
    }
  });
});

/** Whether `count` rows of `a` from row `aFrom` are byte for byte the rows of `b` from row `bFrom`. */
function sameRows(a: PngData, aFrom: number, b: PngData, bFrom: number, count: number): boolean {
  const row = a.width * 4;
  const left = a.data.subarray(aFrom * row, (aFrom + count) * row);
  const right = b.data.subarray(bFrom * row, (bFrom + count) * row);
  return left.length === right.length && left.every((v, i) => v === right[i]);
}

/** The box around a picture's opaque pixels, in pixel-edge coordinates (right and bottom are exclusive). */
function opaqueBox(png: PngData): { left: number; top: number; right: number; bottom: number } {
  const opaque = Array.from({ length: png.width * png.height }, (_, i) => i).filter((i) => png.data[i * 4 + 3] !== 0);
  const xs = opaque.map((i) => i % png.width);
  const ys = opaque.map((i) => Math.floor(i / png.width));
  return { left: Math.min(...xs), top: Math.min(...ys), right: Math.max(...xs) + 1, bottom: Math.max(...ys) + 1 };
}
