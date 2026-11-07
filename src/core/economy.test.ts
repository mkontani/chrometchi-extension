import { describe, expect, test } from 'vitest';
import { STAGE_MINUTES } from './constants';
import { ACCESSORIES } from '@/data/accessories';
import { DECOR } from '@/data/decor';
import { ENDING_COINS, MISSIONS, SELL_PRICE, ZUKAN_MILESTONES } from '@/data/economy';

// Assumptions of the model (spec 5.2). Change them here, not in the formulas.
/** Minutes with Chrome open per day, a normal working day. */
const CHROME_MINUTES_PER_DAY = 480;
/** Trips the player takes per day. */
const TRIPS_PER_DAY = 3;
/** Outing kinds the player rotates through. */
const OUTING_KINDS_USED = 3;
/** Items one trip brings home. */
const ITEMS_PER_TRIP = 2;
/** Farm harvests per day. */
const HARVESTS_PER_DAY = 2;
/** Items one harvest yields. */
const ITEMS_PER_HARVEST = 3;
/** The rest is kept for cooking, so only half is sold. */
const SOLD_SHARE = 0.5;
/** Fewest and most generations buying the whole catalog should take. */
const MIN_GENERATIONS = 20;
const MAX_GENERATIONS = 30;

const sum = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0);

function generationsToBuyAll(): number {
  const awakeMinutes = sum(Object.values(STAGE_MINUTES));
  const days = awakeMinutes / CHROME_MINUTES_PER_DAY;
  const sellPrices = Object.values(SELL_PRICE);
  const meanSell = sum(sellPrices) / sellPrices.length;
  const gathered = TRIPS_PER_DAY * OUTING_KINDS_USED * ITEMS_PER_TRIP + HARVESTS_PER_DAY * ITEMS_PER_HARVEST;
  const perGeneration = gathered * SOLD_SHARE * meanSell * days + ENDING_COINS.departed;
  const missionCoins = sum(Object.values(MISSIONS).flatMap((tiers) => tiers.map((t) => t.coins)));
  const oneTime = missionCoins + sum(ZUKAN_MILESTONES.map((m) => m.coins));
  const catalog = sum(DECOR.map((d) => d.price)) + sum(ACCESSORIES.map((a) => a.price));
  return (catalog - oneTime) / perGeneration;
}

describe('economy balance', () => {
  test('buying everything takes 20 to 30 generations of ordinary play', () => {
    const generations = generationsToBuyAll();
    expect(generations).toBeGreaterThanOrEqual(MIN_GENERATIONS);
    expect(generations).toBeLessThanOrEqual(MAX_GENERATIONS);
  });
});
