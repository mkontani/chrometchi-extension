import { describe, expect, test } from 'vitest';
import { MEDICINE_DOSES, POOP, SUGAR } from './constants';
import { makePet } from './__fixtures__/pet';
import { becomeSick, stepHygiene } from './hygiene';

describe('stepHygiene', () => {
  test('scheduled poop appears when its timer runs out', () => {
    const r = stepHygiene(makePet({ poopTimers: [1] }));
    expect(r.pet.poops).toBe(1);
    expect(r.pet.poopTimers).toEqual([]);
    expect(r.events).toEqual([{ type: 'pooped' }]);
  });

  test('timers not yet due just count down', () => {
    const r = stepHygiene(makePet({ poopTimers: [5, 2] }));
    expect(r.pet.poopTimers).toEqual([4, 1]);
    expect(r.events).toEqual([]);
  });

  test('poops cap at 4', () => {
    const r = stepHygiene(makePet({ poops: 3, poopTimers: [1, 1] }));
    expect(r.pet.poops).toBe(POOP.max);
    expect(r.events).toEqual([{ type: 'pooped' }]);
  });

  test('timer at max is removed without an event', () => {
    const r = stepHygiene(makePet({ poops: POOP.max, poopTimers: [1] }));
    expect(r.pet.poops).toBe(POOP.max);
    expect(r.pet.poopTimers).toEqual([]);
    expect(r.events.filter((e) => e.type === 'pooped')).toEqual([]);
  });

  test('poop left 120 minutes causes one poop mistake and sickness', () => {
    const r = stepHygiene(
      makePet({ poops: 1, episodes: { ...makePet().episodes, poopMin: POOP.sickAfterMin - 1 } }),
    );
    expect(r.pet.history.totalMistakes).toBe(1);
    expect(r.pet.history.stageMistakes).toBe(1);
    expect(r.pet.sick).toBe(true);
    expect(r.pet.medicineNeeded).toBe(MEDICINE_DOSES);
    expect(r.pet.episodes.poopMin).toBe(0);
    expect(r.events).toEqual([{ type: 'mistake', reason: 'poop' }, { type: 'sick' }]);
  });

  test('poopMin increments while poops exist and resets at zero poops', () => {
    expect(stepHygiene(makePet({ poops: 1 })).pet.episodes.poopMin).toBe(1);
    const dirty = makePet({ episodes: { ...makePet().episodes, poopMin: 50 } });
    expect(stepHygiene(dirty).pet.episodes.poopMin).toBe(0);
  });

  test('sugar decays by 1 every 60 minutes', () => {
    let pet = makePet({ sugar: 2 });
    for (let i = 0; i < SUGAR.decayEveryMin - 1; i++) pet = stepHygiene(pet).pet;
    expect(pet.sugar).toBe(2);
    pet = stepHygiene(pet).pet;
    expect(pet.sugar).toBe(1);
    expect(pet.sugarDecayMin).toBe(0);
  });

  test('sugar at 0 keeps decay counter at 0', () => {
    const r = stepHygiene(makePet({ sugar: 0, sugarDecayMin: 10 }));
    expect(r.pet.sugar).toBe(0);
    expect(r.pet.sugarDecayMin).toBe(0);
  });

  test('already-sick pet does not re-emit sick', () => {
    const r = stepHygiene(
      makePet({
        sick: true,
        medicineNeeded: 1,
        poops: 1,
        episodes: { ...makePet().episodes, poopMin: POOP.sickAfterMin - 1 },
      }),
    );
    expect(r.events).toEqual([{ type: 'mistake', reason: 'poop' }]);
    expect(r.pet.medicineNeeded).toBe(1);
  });

  test('does not mutate its input', () => {
    const pet = makePet({ poops: 1, sugar: 1, poopTimers: [1] });
    const snapshot = structuredClone(pet);
    stepHygiene(pet);
    expect(pet).toEqual(snapshot);
  });
});

describe('becomeSick', () => {
  test('makes a healthy pet sick', () => {
    const pet = makePet();
    const r = becomeSick(pet);
    expect(r.pet.sick).toBe(true);
    expect(r.pet.medicineNeeded).toBe(MEDICINE_DOSES);
    expect(r.events).toEqual([{ type: 'sick' }]);
    expect(pet.sick).toBe(false);
  });

  test('leaves an already-sick pet unchanged', () => {
    const pet = makePet({ sick: true, medicineNeeded: 1 });
    const r = becomeSick(pet);
    expect(r.pet).toBe(pet);
    expect(r.events).toEqual([]);
  });
});
