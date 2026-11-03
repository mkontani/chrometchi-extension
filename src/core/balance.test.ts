import { describe, expect, test } from 'vitest';
import { applyCare } from './care';
import { MEDICINE_DOSES, STAGE_MINUTES } from './constants';
import { dominant, weightClass } from './evolution';
import { createEgg } from './factory';
import { farmAction, growFarm } from './farm';
import { EMPTY_KITCHEN } from './kitchen';
import { forage, outingsLeft } from './outings';
import { feedFromPantry } from './pantry';
import { createRng } from './rng';
import { stepMinute } from './step';
import type { CareAction, FoodId, FoodTag, Kitchen, PetState } from './types';
import { FOODS } from '@/data/foods';
import { OUTING_KINDS } from '@/data/outings';

const CARE_INTERVAL = 120;
const FIRST_CARE = 30;

function careEdit(pet: PetState): PetState {
  return {
    ...pet,
    poops: 0,
    poopTimers: [],
    sick: false,
    stats: {
      ...pet.stats,
      hunger: Math.min(100, pet.stats.hunger + 80),
      mood: Math.min(100, pet.stats.mood + 60),
    },
    episodes: { ...pet.episodes, poopMin: 0 },
  };
}

function simulate(untilAwake: number, cared: boolean): PetState {
  const rng = createRng(1);
  let pet = createEgg();
  while (pet.awakeMinutes < untilAwake && pet.lifecycle === 'alive') {
    pet = stepMinute(pet, { asleep: false, rng, hour: 12 }).pet;
    const due = pet.awakeMinutes >= FIRST_CARE && (pet.awakeMinutes - FIRST_CARE) % CARE_INTERVAL === 0;
    if (cared && due && pet.awakeMinutes < untilAwake) pet = careEdit(pet);
  }
  return pet;
}

/** Spec 4.3's lowest cadence: 3 visits per 8 awake hours. */
const SPARSE_INTERVAL = 160;
const ADULT_AT = 1410;
const MAX_MEALS = 3;
const MAX_GAMES = 2;
const HAPPY_MOOD = 80;

function careOk(pet: PetState, action: CareAction): { pet: PetState; ok: boolean } {
  const r = applyCare(pet, action);
  if (r.outcome.result === 'refused' && r.outcome.reason !== 'full') {
    throw new Error(`unexpected refusal ${r.outcome.reason}`);
  }
  return { pet: r.pet, ok: r.outcome.result === 'ok' };
}

/** The non-meal part of a visit: games until happy, clean, medicine. */
function tend(start: PetState): PetState {
  let pet = start;
  for (let i = 0; i < MAX_GAMES && pet.stats.mood < HAPPY_MOOD; i++) {
    pet = careOk(pet, { kind: 'play', game: 'catch', won: true }).pet;
  }
  if (pet.poops > 0) pet = careOk(pet, { kind: 'clean' }).pet;
  for (let i = 0; i < MEDICINE_DOSES && pet.sick; i++) pet = careOk(pet, { kind: 'medicine' }).pet;
  return pet;
}

/** One visit made only of player actions: meals until full, games until happy, clean, medicine. */
function visit(start: PetState): PetState {
  let pet = start;
  for (let i = 0; i < MAX_MEALS; i++) {
    const r = careOk(pet, { kind: 'feed', food: 'rice' });
    pet = r.pet;
    if (!r.ok) break;
  }
  return tend(pet);
}

function simulateSparseCare(untilAwake: number): PetState {
  const rng = createRng(1);
  const hatch = STAGE_MINUTES.egg;
  let pet = createEgg();
  while (pet.awakeMinutes < untilAwake && pet.lifecycle === 'alive') {
    pet = stepMinute(pet, { asleep: false, rng, hour: 12 }).pet;
    const due = pet.awakeMinutes >= hatch && (pet.awakeMinutes - hatch) % SPARSE_INTERVAL === 0;
    if (due && pet.lifecycle === 'alive') pet = visit(pet);
  }
  return pet;
}

describe('balance', () => {
  test('player care every 160 awake minutes raises an adult by 1410 with at most one mistake', () => {
    const pet = simulateSparseCare(ADULT_AT);
    expect(pet.lifecycle).toBe('alive');
    expect(pet.awakeMinutes).toBe(ADULT_AT);
    expect(pet.stage).toBe('adult');
    expect(pet.history.totalMistakes).toBeLessThanOrEqual(1);
  });

  test('the same sparse care keeps the adult well until it departs', () => {
    const pet = simulateSparseCare(ADULT_AT + STAGE_MINUTES.adult);
    expect(pet.lifecycle).toBe('departed');
    expect(pet.history.totalMistakes).toBeLessThanOrEqual(1);
  });

  test('cared-for pet reaches adult at awake minute 1410 with no mistakes', () => {
    const pet = simulate(1410, true);
    expect(pet.awakeMinutes).toBe(1410);
    expect(pet.stage).toBe('adult');
    expect(pet.history.totalMistakes).toBe(0);
    expect(pet.stats.vitality).toBe(100);
  });

  test('neglected pet floors at vitality 1 and is still alive after 2800 awake minutes', () => {
    const pet = simulate(2800, false);
    expect(pet.lifecycle).toBe('alive');
    expect(pet.stats.vitality).toBe(1);
  });
});

type Route = 'meat' | 'fish' | 'sweet';

const MIDNIGHT = new Date(2026, 10, 4).getTime();
const OUTING_SCORE = 50;
const BABY_EXTRA_VISIT = 140;
const MS_PER_MIN = 60_000;

function foodsOfTag(tag: FoodTag): FoodId[] {
  return FOODS.filter((f) => f.tag === tag && f.id !== 'candy').map((f) => f.id);
}

/** Outings left today at score 50, then the field: harvest, plant fruit, water. */
function gather(pet: PetState, start: Kitchen, now: number, rng: ReturnType<typeof createRng>): Kitchen {
  let kitchen = start;
  for (const kind of OUTING_KINDS) {
    while (outingsLeft(kitchen.outings, kind, now) > 0) {
      kitchen = forage({ pet, kitchen, kind, score: OUTING_SCORE, now, rng }).kitchen;
    }
  }
  for (const op of [{ op: 'harvest' }, { op: 'plant', crop: 'fruit' }, { op: 'water' }] as const) {
    kitchen = farmAction({ pet, kitchen, action: op }).kitchen;
  }
  return kitchen;
}

function mealOrder(kitchen: Kitchen, route: Route | null): FoodId[] {
  const preferred = route === null ? [] : foodsOfTag(route);
  return [...preferred.filter((f) => (kitchen.pantry[f] ?? 0) > 0), 'rice'];
}

/** Up to 3 meals from the pantry (route foods first, then rice); sweet adds at most 1 candy. */
function eat(start: PetState, startKitchen: Kitchen, route: Route | null): { pet: PetState; kitchen: Kitchen } {
  let pet = start;
  let kitchen = startKitchen;
  const foods: FoodId[] = [];
  for (let i = 0; i < MAX_MEALS; i++) foods.push(mealOrder(kitchen, route)[0] ?? 'rice');
  if (route === 'sweet') foods.push('candy');
  for (const food of foods) {
    const fed = feedFromPantry(pet, kitchen.pantry, { kind: 'feed', food });
    if (fed.result.outcome.result !== 'ok') {
      if (food === 'candy' || food === 'rice') break;
      continue;
    }
    pet = fed.result.pet;
    kitchen = { ...kitchen, pantry: fed.pantry };
  }
  return { pet, kitchen };
}

function kitchenVisit(
  start: PetState,
  kitchen: Kitchen,
  ctx: { route: Route | null; now: number; rng: ReturnType<typeof createRng> },
): { pet: PetState; kitchen: Kitchen } {
  const stocked = gather(start, kitchen, ctx.now, ctx.rng);
  const fed = eat(start, stocked, ctx.route);
  const pet = tend(fed.pet);
  return { pet, kitchen: fed.kitchen };
}

interface RouteRun {
  lastBaby: PetState;
  lastChild: PetState;
}

/** Sparse care (a visit every 160 awake minutes) with outings and farm, until the child stage ends. */
function simulateRoute(route: Route | null, extraVisits: readonly number[] = []): RouteRun {
  const rng = createRng(1);
  const forageRng = createRng(7);
  const hatch = STAGE_MINUTES.egg;
  let pet = createEgg();
  let kitchen = EMPTY_KITCHEN;
  let lastVisit = hatch;
  let lastBaby = pet;
  let lastChild = pet;
  while (pet.stage !== 'young' && pet.lifecycle === 'alive') {
    pet = stepMinute(pet, { asleep: false, rng, hour: 12 }).pet;
    if (pet.stage === 'baby') lastBaby = pet;
    if (pet.stage === 'child') lastChild = pet;
    const sparse = pet.awakeMinutes >= hatch && (pet.awakeMinutes - hatch) % SPARSE_INTERVAL === 0;
    const due = sparse || extraVisits.includes(pet.awakeMinutes);
    if (!due || pet.stage === 'young') continue;
    const farm = growFarm(kitchen.farm, pet.awakeMinutes - lastVisit);
    lastVisit = pet.awakeMinutes;
    const now = MIDNIGHT + pet.awakeMinutes * MS_PER_MIN;
    const next =
      route === null
        ? { pet: visit(pet), kitchen }
        : kitchenVisit(pet, { ...kitchen, farm }, { route, now, rng: forageRng });
    pet = next.pet;
    kitchen = next.kitchen;
  }
  return { lastBaby, lastChild };
}

describe('evolution routes under outing limits (spec 7.1)', () => {
  test.each<Route>(['meat', 'fish', 'sweet'])(
    'a player who prefers %s ends the child stage with it dominant',
    (route) => {
      const { lastChild } = simulateRoute(route);
      expect(lastChild.stage).toBe('child');
      expect(dominant(lastChild.history.foodCounts)).toBe(route);
    },
  );

  test.each([[[]], [[BABY_EXTRA_VISIT]]])(
    'a rice-only player ends the baby and child stages at normal weight (extra visits %j)',
    (extra) => {
      const { lastBaby, lastChild } = simulateRoute(null, extra);
      expect(weightClass(lastBaby)).toBe('normal');
      expect(weightClass(lastChild)).toBe('normal');
    },
  );

  test('a meat-loving player can still end the baby stage heavy', () => {
    // The sparse cadence never meets a hungry baby (the 30-minute visit finds it full), so
    // this player looks in once more just before the stage ends.
    const { lastBaby } = simulateRoute('meat', [BABY_EXTRA_VISIT]);
    expect(lastBaby.stage).toBe('baby');
    expect(weightClass(lastBaby)).toBe('heavy');
  });
});
