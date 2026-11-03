import { outingRefusal, type KitchenResult } from './outings';
import { addToPantry } from './pantry';
import type { CareOutcome, Crop, Farm, Gained, Kitchen, PetState, RefuseReason } from './types';

export const FARM = { growMin: 240, harvest: 2, waterBonus: 2 } as const;

export type FarmOp = { op: 'plant'; crop: Crop } | { op: 'water' } | { op: 'harvest' };

const EMPTY_FIELD: Farm = { crop: null, growMinLeft: 0, watered: false };

/** The crop grows in game minutes and stops at 0; an empty field or no time changes nothing. */
export function growFarm(farm: Farm, minutes: number): Farm {
  if (farm.crop === null || minutes <= 0) return farm;
  return { ...farm, growMinLeft: Math.max(0, farm.growMinLeft - minutes) };
}

function refused(kitchen: Kitchen, reason: RefuseReason): KitchenResult {
  const outcome: CareOutcome = { action: 'farm', result: 'refused', reason };
  return { kitchen, gained: {}, outcome };
}

function done(kitchen: Kitchen, gained: Gained = {}): KitchenResult {
  return { kitchen, gained, outcome: { action: 'farm', result: 'ok' } };
}

function harvest(kitchen: Kitchen): KitchenResult {
  const { farm } = kitchen;
  if (farm.crop === null || farm.growMinLeft > 0) return refused(kitchen, 'farmNotReady');
  const amount = FARM.harvest + (farm.watered ? FARM.waterBonus : 0);
  const { pantry, added } = addToPantry(kitchen.pantry, { [farm.crop]: amount });
  return done({ ...kitchen, pantry, farm: EMPTY_FIELD }, added);
}

function applyOp(kitchen: Kitchen, action: FarmOp): KitchenResult {
  const { farm } = kitchen;
  switch (action.op) {
    case 'plant':
      if (farm.crop !== null) return refused(kitchen, 'farmNotReady');
      return done({ ...kitchen, farm: { crop: action.crop, growMinLeft: FARM.growMin, watered: false } });
    case 'water':
      if (farm.crop === null || farm.growMinLeft <= 0 || farm.watered) {
        return refused(kitchen, 'farmNotReady');
      }
      return done({ ...kitchen, farm: { ...farm, watered: true } });
    case 'harvest':
      return harvest(kitchen);
  }
}

/** Plant, water or harvest. Same refusal order as outings, then the field's own state. */
export function farmAction(input: { pet: PetState; kitchen: Kitchen; action: FarmOp }): KitchenResult {
  const { pet, kitchen, action } = input;
  const reason = outingRefusal(pet);
  if (reason !== null) return refused(kitchen, reason);
  return applyOp(kitchen, action);
}
