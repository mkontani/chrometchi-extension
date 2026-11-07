import { SELL_PRICE } from '@/data/economy';
import { addCoins } from './progress';
import { stockOf } from './pantry';
import type { CareOutcome, IngredientId, Pantry, Progress } from './types';

export interface SellInput {
  pantry: Pantry;
  progress: Progress;
  food: IngredientId;
  amount: number;
}

export interface SellResult {
  pantry: Pantry;
  progress: Progress;
  outcome: CareOutcome;
}

/** Sells `amount` of an ingredient; refused (nothing changes) when the stock is short. */
export function sellFood({ pantry, progress, food, amount }: SellInput): SellResult {
  if (stockOf(pantry, food) < amount) {
    const outcome: CareOutcome = { action: 'sell', result: 'refused', reason: 'noStock' };
    return { pantry, progress, outcome };
  }
  const { [food]: have = 0, ...rest } = pantry;
  const left = have - amount;
  return {
    pantry: left > 0 ? { ...rest, [food]: left } : rest,
    progress: addCoins(progress, SELL_PRICE[food] * amount),
    outcome: { action: 'sell', result: 'ok' },
  };
}
