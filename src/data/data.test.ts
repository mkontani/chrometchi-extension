import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import type { Stage } from '@/core/types';
import { FOODS } from './foods';
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

  test('every form has a 4-12 word motif', () => {
    for (const f of FORMS) {
      const words = f.motif.trim().split(/\s+/).length;
      expect(words, f.id).toBeGreaterThanOrEqual(4);
      expect(words, f.id).toBeLessThanOrEqual(12);
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
    expect(keys).toHaveLength(42 + 6 + 3);
    for (const key of keys) {
      expect(ja[key]?.message, `ja ${key}`).toBeTruthy();
      expect(en[key]?.message, `en ${key}`).toBeTruthy();
    }
  });

  test('message keys are valid chrome.i18n keys', () => {
    for (const key of Object.keys(ja)) expect(key).toMatch(/^[A-Za-z0-9_]+$/);
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
