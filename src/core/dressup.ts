import { accessoryDef } from '@/data/accessories';
import { outingRefusal } from './outings';
import { addCoins } from './progress';
import type { AccessoryId, CareOutcome, Home, PetState, Progress, RefuseReason, WearPlace } from './types';

const refused = (action: 'buy' | 'wear', reason: RefuseReason): CareOutcome => ({
  action,
  result: 'refused',
  reason,
});

/** Buys an accessory; refused (nothing changes) when owned already or the coins are short. */
export function buyAccessory(input: {
  progress: Progress;
  home: Home;
  acc: AccessoryId;
}): { progress: Progress; home: Home; outcome: CareOutcome } {
  const { progress, home, acc } = input;
  const price = accessoryDef(acc).price;
  const reason: RefuseReason | null = home.ownedAcc.includes(acc)
    ? 'owned'
    : progress.coins < price
      ? 'noCoins'
      : null;
  if (reason) return { progress, home, outcome: refused('buy', reason) };
  return {
    progress: addCoins(progress, -price),
    home: { ...home, ownedAcc: [...home.ownedAcc, acc] },
    outcome: { action: 'buy', result: 'ok' },
  };
}

function wearRefusal(pet: PetState, home: Home, place: WearPlace, acc: AccessoryId | null): RefuseReason | null {
  const blocked = outingRefusal(pet);
  if (blocked || acc === null) return blocked;
  if (!home.ownedAcc.includes(acc)) return 'notOwned';
  return accessoryDef(acc).place === place ? null : 'wrongPlace';
}

/** Puts an owned accessory on a place (replacing what was there), or takes the place's item off with null. */
export function wear(input: {
  pet: PetState;
  home: Home;
  place: WearPlace;
  acc: AccessoryId | null;
}): { home: Home; outcome: CareOutcome } {
  const { pet, home, place, acc } = input;
  const reason = wearRefusal(pet, home, place, acc);
  if (reason) return { home, outcome: refused('wear', reason) };
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the item taken off is dropped on purpose
  const { [place]: _off, ...others } = home.worn;
  const worn: Home['worn'] = acc === null ? others : { ...others, [place]: acc };
  return { home: { ...home, worn }, outcome: { action: 'wear', result: 'ok' } };
}

/** Everything off (a new egg); the items stay owned. Returns the same home when nothing is worn. */
export function takeOffAll(home: Home): Home {
  return Object.keys(home.worn).length === 0 ? home : { ...home, worn: {} };
}
