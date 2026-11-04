import { describe, expect, test } from "vitest";
import { cook, fitPotToStock, matchRecipe, POT_MAX } from "./cooking";
import { createEgg } from "./factory";
import { EMPTY_KITCHEN } from "./kitchen";
import type { Kitchen, PetState } from "./types";

const alive = (patch: Partial<PetState> = {}): PetState => ({
  ...createEgg(),
  stage: "child",
  ...patch,
});

const kitchenWith = (
  pantry: Kitchen["pantry"],
  recipes: Kitchen["recipes"] = [],
): Kitchen => ({
  ...EMPTY_KITCHEN,
  pantry,
  recipes,
});

describe("matchRecipe", () => {
  test("ignores order", () => {
    expect(matchRecipe(["veggie", "meat", "meat"])).toBe("steak");
  });

  test("needs an exact match", () => {
    expect(matchRecipe(["meat", "meat"])).toBeNull();
    expect(matchRecipe(["meat", "meat", "veggie", "veggie"])).toBeNull();
    expect(matchRecipe(["rice", "fish"])).toBe("onigiri");
  });

  test("the pot holds 4", () => {
    expect(POT_MAX).toBe(4);
  });
});

describe("fitPotToStock", () => {
  test("fitPotToStock drops the latest extra copies when stock falls", () => {
    expect(
      fitPotToStock(["meat", "veggie", "meat"], { meat: 1, veggie: 1 }),
    ).toEqual(["meat", "veggie"]);
    expect(fitPotToStock(["meat", "meat", "meat"], { meat: 0 })).toEqual([]);
  });

  test("keeps rice whatever the pantry says, and returns the same items when nothing changes", () => {
    expect(fitPotToStock(["rice", "rice", "fish"], {})).toEqual([
      "rice",
      "rice",
    ]);
    const pot = ["rice", "fish", "fish"] as const;
    expect(fitPotToStock(pot, { fish: 2 })).toEqual(pot);
  });
});

describe("cook", () => {
  test("a recipe uses its ingredients but not rice, and adds one dish", () => {
    const r = cook({
      pet: alive(),
      kitchen: kitchenWith({ fish: 1 }),
      items: ["rice", "fish"],
    });
    expect(r.kitchen.pantry).toEqual({ fish: 0, onigiri: 1 });
    expect(r.cooked).toEqual({ dish: "onigiri", first: true });
    expect(r.kitchen.recipes).toEqual(["onigiri"]);
    expect(r.outcome).toEqual({ action: "cook", result: "ok" });
  });

  test("only the first cook of a recipe is first, and the book keeps one entry", () => {
    const items = ["rice", "fish"] as const;
    const one = cook({
      pet: alive(),
      kitchen: kitchenWith({ fish: 2 }),
      items,
    });
    const two = cook({ pet: alive(), kitchen: one.kitchen, items });
    expect(two.cooked).toEqual({ dish: "onigiri", first: false });
    expect(two.kitchen.recipes).toEqual(["onigiri"]);
    expect(two.kitchen.pantry).toEqual({ fish: 0, onigiri: 2 });
  });

  test("a mix that matches nothing makes a mystery dish and records nothing", () => {
    const k = kitchenWith({ meat: 1, fruit: 1 }, ["cake"]);
    const r = cook({ pet: alive(), kitchen: k, items: ["meat", "fruit"] });
    expect(r.kitchen.pantry).toEqual({ meat: 0, fruit: 0, mystery: 1 });
    expect(r.cooked).toEqual({ dish: "mystery", first: false });
    expect(r.kitchen.recipes).toEqual(["cake"]);
    expect(r.outcome.result).toBe("ok");
  });

  test("is refused without enough stock and changes nothing", () => {
    const k = kitchenWith({ meat: 1, veggie: 1 });
    const r = cook({
      pet: alive(),
      kitchen: k,
      items: ["meat", "meat", "veggie"],
    });
    expect(r.outcome).toEqual({
      action: "cook",
      result: "refused",
      reason: "noStock",
    });
    expect(r.kitchen).toBe(k);
    expect(r.cooked).toBeNull();
  });

  test("is refused when the dish is already at 99, and nothing is used", () => {
    const k = kitchenWith({ fish: 1, onigiri: 99 });
    const r = cook({ pet: alive(), kitchen: k, items: ["rice", "fish"] });
    expect(r.outcome).toEqual({
      action: "cook",
      result: "refused",
      reason: "pantryFull",
    });
    expect(r.kitchen).toBe(k);
    expect(r.cooked).toBeNull();
  });

  test("is refused when the mystery dish is already at 99, and nothing is used", () => {
    const k = kitchenWith({ meat: 1, fruit: 1, mystery: 99 });
    const r = cook({ pet: alive(), kitchen: k, items: ["meat", "fruit"] });
    expect(r.outcome.reason).toBe("pantryFull");
    expect(r.kitchen).toBe(k);
  });

  test("is refused for a dead, egg or sleeping pet in that order; a sick pet may cook", () => {
    const k = kitchenWith({ fish: 1 });
    const items = ["rice", "fish"] as const;
    const reason = (pet: PetState) =>
      cook({ pet, kitchen: k, items }).outcome.reason;
    expect(
      reason(alive({ lifecycle: "dead", stage: "egg", asleep: true })),
    ).toBe("notAlive");
    expect(reason(alive({ stage: "egg", asleep: true }))).toBe("egg");
    expect(reason(alive({ asleep: true }))).toBe("asleep");
    expect(
      cook({ pet: alive({ sick: true }), kitchen: k, items }).outcome.result,
    ).toBe("ok");
  });

  test("does not mutate its inputs", () => {
    const k = kitchenWith({ meat: 2, veggie: 1 }, ["cake"]);
    const pet = alive();
    const items = ["meat", "meat", "veggie"] as const;
    const before = structuredClone({ k, pet, items });
    cook({ pet, kitchen: k, items });
    expect({ k, pet, items }).toEqual(before);
  });
});
