import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import type { RefuseReason, Stage } from '@/core/types';
import { DISH_IDS, FOODS, INGREDIENT_IDS, isDish } from './foods';
import { POT_ITEMS, RECIPES } from './recipes';
import { FORMS } from './forms';
import { GAMES } from './games';

type Messages = Record<string, { message: string }>;
const load = (locale: string): Messages =>
  JSON.parse(
    readFileSync(resolve(__dirname, `../../public/_locales/${locale}/messages.json`), 'utf8'),
  ) as Messages;
const ja = load('ja');
const en = load('en');

const ORDER: Stage[] = ['egg', 'baby', 'child', 'young', 'adult'];
const isFallback = (when: object) => Object.keys(when).length === 0;

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
      farmNotReady: true, pantryFull: true,
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
