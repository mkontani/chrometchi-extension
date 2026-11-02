import type { EvolutionContext } from './evolution';
import { stepGrowth } from './growth';
import { stepHygiene } from './hygiene';
import { stepNeeds } from './needs';
import { stepSleep } from './sleep';
import type { GameEvent, PetState, StepResult, WarningLevel } from './types';
import { stepVitality } from './vitality';
import { deriveWarning } from './warnings';

export interface MinuteContext extends EvolutionContext {
  asleep: boolean;
}

const WARNING_RANK: Readonly<Record<WarningLevel, number>> = {
  none: 0,
  notice: 1,
  danger: 2,
  critical: 3,
};

function runAwake(pet: PetState, ctx: EvolutionContext): StepResult {
  if (pet.stage === 'egg') return stepGrowth(pet, ctx);
  const needs = stepNeeds(pet);
  const hygiene = stepHygiene(needs.pet);
  const vitality = stepVitality(hygiene.pet);
  const events = [...needs.events, ...hygiene.events, ...vitality.events];
  if (vitality.pet.lifecycle !== 'alive') return { pet: vitality.pet, events };
  const growth = stepGrowth(vitality.pet, ctx);
  return { pet: growth.pet, events: [...events, ...growth.events] };
}

/** One minute of game time (awake or asleep). Pure: returns the new pet and the events raised. */
export function stepMinute(pet: PetState, ctx: MinuteContext): StepResult {
  if (pet.lifecycle !== 'alive') return { pet, events: [] };
  const startLevel = deriveWarning(pet);
  const sleep = stepSleep(pet, ctx.asleep);
  const body: StepResult = ctx.asleep ? { pet: sleep.pet, events: [] } : runAwake(sleep.pet, ctx);
  const events: GameEvent[] = [...sleep.events, ...body.events];
  const level = deriveWarning(body.pet);
  if (WARNING_RANK[level] > WARNING_RANK[startLevel]) events.push({ type: 'warning', level });
  return { pet: body.pet, events };
}
