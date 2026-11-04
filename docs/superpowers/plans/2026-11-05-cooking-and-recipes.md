# Cooking and Recipes Implementation Plan (plan 2 of 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The player puts up to 4 ingredients in a pot inside the food panel and presses Cook. An exact match with one of 12 recipes makes that dish; anything else makes a mystery dish. Found recipes stay in a recipe book in the zukan, and dishes are fed from the pantry like any other food.

**Architecture:**
- **Dishes are foods.** The 11 new dishes and the mystery dish join `FOODS` (cake is already there), so feeding, the pantry, the save and the feed effect handle them with no new path.
- **Core rules.** `src/data/recipes.ts` holds the 12 recipes. `src/core/cooking.ts` matches a pot against them and turns stock into one dish. The recipe book is `kitchen.recipes`, so it survives a new egg like the rest of the kitchen.
- **Engine.** A new `cook` request carries only the pot's item list. The engine checks stock and returns what was `cooked`.
- **Popup.** The food panel gets Eat and Cook tabs, and the zukan gets Pets and Recipes tabs. Cooking plays a short pot effect on the stage (the care-effect timelines) and then a 「〇〇ができた！」 note.

**Plan 1 (merged):** the pantry, outings and farm (`docs/superpowers/plans/2026-11-04-pantry-and-outings.md`). This plan builds on its `kitchen`, `stockOf`, `addToPantry`, `outingRefusal`, `useScrollCue`, `GainedNote` and the art scripts.

**Tech Stack:** Preact, TypeScript, Zod 4, Vitest + @testing-library/preact (happy-dom), Playwright e2e, pngjs art scripts, PixelLab MCP.

**Spec:** `docs/superpowers/specs/2026-11-04-foraging-and-cooking-design.md`, chapters 5, 6, 7.1, 8 and 9 (parent: `docs/superpowers/specs/2026-11-03-chrometchi-rebuild-design.md`)

## Global Constraints

- **Where cooking lives.** A 「りょうりする」 tab inside the food panel. No new action button (spec 5.1).
- **The pot.**
  - It holds 1 to 4 items, taken from rice and the 8 ingredients (fish, shrimp, meat, egg, nuts, mushroom, veggie, fruit).
  - Candy and dishes never go in the pot.
  - Tapping an ingredient puts it in the pot. Tapping it in the pot takes it back.
- **Matching.**
  - A pot makes a recipe's dish only if it has exactly that recipe's kinds and counts, in any order. Anything else makes the mystery dish.
  - Either way, the ingredients in the pot are used up, except rice, which is never used up.
  - One cook makes one dish.
- **Who can cook.** The same as feeding: an egg, a sleeping pet and a pet that is not alive are refused; a sick pet may cook.
- **Recipe book.**
  - The first successful cook of a recipe records it for good. It lives in `kitchen`, so it survives a new egg.
  - The mystery dish is never recorded.
  - A recipe not yet found shows 「？？？」 and a short hint. The page shows 「みつけたレシピ n / 12」.
- **Dishes as food.**
  - Each dish restores more hunger + mood than any raw ingredient in its recipe. The mystery dish is weak.
  - Cake, nut cookie and fruit tart are snacks and count toward `sugar`.
  - A dish counts once, as the tag the recipe data gives it (spec 7.1).
- **Boundaries.**
  - The popup sends only the pot's item list. The engine validates it (known pot items, 1 to 4 of them) and checks stock.
  - The popup never adds a dish directly.
- **Save format.** Keep `version: 1` and `SAVE_KEY`. A kitchen without `recipes` (a plan-1 save) loads with `[]`, and the pantry, pet and zukan stay. Unknown recipe ids are dropped.
- **Names.** Only general dish names; nothing from existing works.
- **Art.**
  - Master palette, checked with `npx tsx scripts/art/check.ts --palette --size <WxH> <files>`.
  - 1px black (`#000000`) outline, transparent background.
  - No faces on food or props, including ketchup or toppings that read as a face.
  - No imitation of existing franchises.
  - Review at 4×.
- **PixelLab.** Use the free monthly quota only. Check `get_balance` before each art step, and stop and ask the owner if `generations_remaining` < 100.
- **Popup size.** Unchanged (360×462).
- **Repo rules.**
  - TDD, with each test watched failing first.
  - Coverage stays around 98% (at least 80%).
  - Functions < 50 lines, files < 800 lines.
  - Immutable updates, no `console.log`.
  - UI text in both `public/_locales/ja` and `en`.
- **Commits.** Conventional format, **no attribution trailer** (owner rule). Never push, open a PR or merge without the owner's say-so.
- **Language.** Talk to the owner in Japanese. Code, comments and test names stay in English.

## Review Focus

1. **The pot in a different order.** The player puts veggie, meat, meat. Expected: steak, the same as meat, meat, veggie. Tested in Task 2 (`matchRecipe ignores order`).
2. **The same recipe twice.** Steak is cooked a second time. Expected: no 「はじめて！」 the second time, and the book lists steak once. Tested in Task 2 (`only the first cook of a recipe is first, and the book keeps one entry`).
3. **The last ingredients cooked twice quickly** (a double tap on Cook, or two popups). Expected: the second cook is refused with `noStock`, and no count goes below 0. Tested in Task 3 (`cooking the last ingredients twice refuses the second with noStock`) and Task 4 (`a second cook while one is pending is ignored`).
4. **A plan-1 save, first open after the update.** The kitchen has a pantry but no `recipes`. Expected: it loads with an empty book, and the pantry, pet and zukan are unchanged (no data-reset notice). Tested in Task 2 (`a kitchen without recipes loads with an empty recipe book and keeps the pantry`).
5. **A forged cook request** (candy, a dish, 5 items, an empty list, an unknown id). Expected: it is rejected as an invalid request, and nothing changes. Tested in Task 3 (`cook requests with a bad pot are rejected`).

---

## File Structure

| File | Responsibility |
|---|---|
| `src/core/types.ts` | `DishId`, `CookedDish`, `PotItem`, `Cooked`, `Kitchen.recipes`, `pantryFull`, the `cook` outcome |
| `src/data/foods.ts` | 12 more food defs, `INGREDIENT_IDS`, `DISH_IDS`, `isDish` |
| `src/data/recipes.ts` | `POT_ITEMS`, `RECIPES` |
| `src/core/cooking.ts` (+test) | `POT_MAX`, `potCounts`, `matchRecipe`, `cook` |
| `src/core/kitchen.ts`, `src/storage/schema.ts` | `recipes` in the kitchen, with a default |
| `src/messaging/protocol.ts`, `src/background/engine.ts` | the `cook` request and the `cooked` response |
| `src/ui/useCooking.ts` (+test) | sends a cook, holds `cooked` |
| `src/ui/components/{FoodPanel,CookTab}.tsx` (+tests) | the Eat and Cook tabs |
| `src/ui/effects/cook.ts` (+test), `src/ui/components/CookedNote.tsx` (+test) | the pot effect and the ready note |
| `src/ui/components/RecipeBook.tsx` (+test), `src/entrypoints/popup/App.tsx` | the Recipes tab and the wiring |
| `src/ui/sound.ts`, `src/ui/assets.ts` | the `simmer` and `cooked` sounds, the pot art |
| `src/assets/ui/icons/food_<dish>.png`, `src/assets/ui/food/<dish>_bite{1,2}.png`, `src/assets/ui/cook/pot.png` | art |

---

### Task 1: The dishes as foods, and their art

**Files:**
- Modify: `src/core/types.ts`, `src/data/foods.ts`, `src/data/data.test.ts`, `public/_locales/{ja,en}/messages.json`, `docs/art/style-guide.md`
- Create: `src/assets/ui/icons/food_{steak,acquapazza,onigiri,omurice,seafoodbowl,friedshrimp,hamburg,stirfry,mushroomsoup,nutcookie,fruittart,mystery}.png` (32×32), and `src/assets/ui/food/<same ids>_bite{1,2}.png`

**Interfaces:**
- Produces:
  - `type DishId = 'steak' | 'acquapazza' | 'cake' | 'onigiri' | 'omurice' | 'seafoodbowl' | 'friedshrimp' | 'hamburg' | 'stirfry' | 'mushroomsoup' | 'nutcookie' | 'fruittart'`
  - `type CookedDish = DishId | 'mystery'`
  - `type FoodId = 'rice' | 'candy' | IngredientId | CookedDish`
  - `INGREDIENT_IDS: readonly IngredientId[]`: fish, shrimp, meat, egg, nuts, mushroom, veggie, fruit
  - `DISH_IDS: readonly DishId[]`, in the spec 5.3 order (the `DishId` order above)
  - `isDish(food: FoodId): food is CookedDish`, true for `DISH_IDS` and `'mystery'`
  - `FOODS` order: today's 11 foods unchanged (cake stays after fruit), then steak, acquapazza, onigiri, omurice, seafoodbowl, friedshrimp, hamburg, stirfry, mushroomsoup, nutcookie, fruittart, mystery

New food values (cake is unchanged):

| id | tag | kind | hunger | mood | weight | vitality | ja | en |
|---|---|---|---|---|---|---|---|---|
| steak | meat | meal | 60 | 15 | 2 | 3 | ステーキ | Steak |
| acquapazza | fish | meal | 60 | 15 | 1 | 6 | アクアパッツァ | Acqua pazza |
| onigiri | grain | meal | 55 | 10 | 1 | 2 | おにぎり | Rice ball |
| omurice | meat | meal | 60 | 15 | 2 | 3 | オムライス | Omelet rice |
| seafoodbowl | fish | meal | 65 | 15 | 1 | 5 | かいせんどん | Seafood bowl |
| friedshrimp | fish | meal | 55 | 20 | 2 | 2 | えびフライ | Fried shrimp |
| hamburg | meat | meal | 65 | 20 | 2 | 3 | ハンバーグ | Hamburg steak |
| stirfry | veggie | meal | 50 | 10 | 0 | 8 | やさいいため | Veggie stir-fry |
| mushroomsoup | veggie | meal | 45 | 10 | 0 | 8 | きのこスープ | Mushroom soup |
| nutcookie | grain | snack | 15 | 25 | 2 | 0 | きのみクッキー | Nut cookie |
| fruittart | sweet | snack | 15 | 35 | 2 | 2 | フルーツタルト | Fruit tart |
| mystery | grain | meal | 20 | 5 | 1 | 0 | ふしぎなりょうり | Mystery dish |

- [ ] **Step 1: Write the failing tests** (`src/data/data.test.ts`):
  - `the dishes and the mystery dish are foods with the planned values`: table-driven over the table above (tag, kind, hunger, mood, weight, vitality).
  - `DISH_IDS lists the 12 dishes in spec order, and isDish is true only for them and mystery`: `isDish('cake')` true, `isDish('mystery')` true, `isDish('fish')` false, `isDish('rice')` false.
  - `INGREDIENT_IDS lists the 8 ingredients`
  - `every food has a name in both languages`: `food_<id>` exists in `ja` and `en` for every `FOODS` id, unless an existing test already checks exactly this.
- [ ] **Step 2: Run** `npx vitest run src/data`. Expected: FAIL (unknown ids, missing exports).
- [ ] **Step 3: Implement** the types, the defs, the exports and the names (`food_<id>` in both locale files, from the table).
- [ ] **Step 4: Make the art** (12 icons at 32×32). `npx vitest run src/assets` fails until every new food has an icon and two bite frames.
  - Call PixelLab `get_balance` first. For each dish, run `create_image_pixen` with `no_background true`, `outline 'single color black outline'` and `detail 'low detail'`, and make 3 candidates.
  - Prompt: `<dish words>, cute pixel food icon, thick black outline, no face`. Dish words:
    - steak: `a juicy steak on a small plate with a green vegetable`
    - acquapazza: `a whole fish simmered in a shallow pan with tomatoes and greens`
    - onigiri: `a rice ball wrapped in a dark seaweed band with pink salmon filling showing on top`. It must not look like the rice icon, which is a plain rice ball.
    - omurice: `omelet rice, a yellow omelet over rice with a red ketchup zigzag line`. The ketchup must never form a face.
    - seafoodbowl: `a rice bowl topped with fish slices and a shrimp`
    - friedshrimp: `two golden fried shrimp with tails on a small plate`
    - hamburg: `a round hamburg steak patty with brown sauce on a small plate`
    - stirfry: `stir-fried green vegetables and carrots in a small pan`
    - mushroomsoup: `a bowl of creamy soup with mushroom pieces`
    - nutcookie: `two round cookies with nuts on top`
    - fruittart: `a small fruit tart with berries and apple slices`
    - mystery: `a bowl of odd purple stew with bubbles`
  - Read every candidate yourself. Reject any with a face, a wrong size or an off-style look.
  - Snap the pick with `reduce_colors` and `docs/art/palette.png`. Fix any non-black edge pixel by hand. If all 3 candidates have faces, draw the icon by hand on the palette.
  - Bites: `npx tsx scripts/art/bite.ts <1|2> src/assets/ui/icons/food_<id>.png src/assets/ui/food/<id>_bite<n>.png`. Check that no thin sliver is left floating. Plan 1's fruit had one; it was fixed by cutting from a copy without the detached part.
  - Verify: `npx tsx scripts/art/check.ts --palette --size 32x32 <all 36 files>` exits 0.
- [ ] **Step 5: Run** `npx vitest run && npm run typecheck && npm run lint`. Expected: all pass.
- [ ] **Step 6: Style guide.** Add a "Dishes" section to `docs/art/style-guide.md`: the prompts, the onigiri and omurice rules, and which icons are hand-drawn.
- [ ] **Step 7: Commit** `feat: add the dishes and their art`
- [ ] **Step 8: Gate H (blocking; run by the controller).**
  - Show the owner the 12 icons and their bite frames at 4×, beside today's rice, cake and raw ingredients.
  - Apply what they ask for, and keep everything green.

### Task 2: Recipes and the cooking rules

**Files:**
- Create: `src/data/recipes.ts`, `src/core/cooking.ts`, `src/core/cooking.test.ts`
- Modify: `src/core/types.ts`, `src/core/kitchen.ts`, `src/storage/schema.ts`, `src/storage/schema.test.ts`, `src/data/data.test.ts`, `src/core/balance.test.ts`, `public/_locales/{ja,en}/messages.json`

**Interfaces:**
- Consumes:
  - `DishId`, `CookedDish`, `INGREDIENT_IDS`, `FOODS` (Task 1)
  - `stockOf`, `addToPantry`, `takeOne` (`src/core/pantry.ts`), `PANTRY_MAX`, `outingRefusal(pet)` (`src/core/outings.ts`)
- Produces:
  - `type PotItem = 'rice' | IngredientId`
  - `POT_ITEMS: readonly PotItem[]`: rice, then `INGREDIENT_IDS`
  - `interface RecipeDef { id: DishId; items: Readonly<Partial<Record<PotItem, number>>> }`
  - `RECIPES: readonly RecipeDef[]`: the 12 recipes in spec 5.3 order
  - `Kitchen.recipes: DishId[]`, in discovery order with no duplicates. `EMPTY_KITCHEN.recipes = []`.
  - `interface Cooked { dish: CookedDish; first: boolean }`
  - `RefuseReason` adds `'pantryFull'`, and `CareOutcome.action` adds `'cook'`
  - `POT_MAX = 4`
  - `potCounts(items: readonly PotItem[]): Partial<Record<PotItem, number>>`
  - `matchRecipe(items: readonly PotItem[]): DishId | null`
  - `cook(input: { pet: PetState; kitchen: Kitchen; items: readonly PotItem[] }): { kitchen: Kitchen; cooked: Cooked | null; outcome: CareOutcome }`. It assumes 1 to `POT_MAX` known items, which the protocol validates in Task 3.

Recipes (spec 5.3):
- steak: meat 2, veggie 1
- acquapazza: fish 2, veggie 2
- cake: fruit 3
- onigiri: rice 1, fish 1
- omurice: rice 1, egg 2
- seafoodbowl: rice 1, fish 1, shrimp 1
- friedshrimp: shrimp 2, egg 1
- hamburg: meat 2, egg 1, veggie 1
- stirfry: veggie 3
- mushroomsoup: mushroom 2, veggie 1
- nutcookie: nuts 2, egg 1
- fruittart: fruit 2, nuts 1, egg 1

`cook` checks, in this order:
1. `outingRefusal(pet)`: notAlive, then egg, then asleep.
2. `noStock`: some pot item's count is more than `stockOf`. Rice never runs out.
3. `pantryFull`: the resulting dish (or mystery) is already at `PANTRY_MAX`.

When all checks pass, it takes the pot's ingredients (never rice), adds one dish, and appends the recipe to `recipes` the first time.

- [ ] **Step 1: Write the failing tests.**
  - `data.test.ts`:
    - `no two recipes share the same ingredients`
    - `every recipe uses 1 to 4 pot items and only pot items`
    - `every recipe's dish is a food whose tag is the tag of one of its ingredients`
    - `every dish restores more hunger plus mood than any raw ingredient in its recipe`
  - `cooking.test.ts`:
    - `matchRecipe ignores order`: `['veggie','meat','meat']` → `'steak'`.
    - `matchRecipe needs an exact match`:
      - `['meat','meat']` → null
      - `['meat','meat','veggie','veggie']` → null
      - `['rice','fish']` → `'onigiri'`
    - `cooking a recipe uses its ingredients but not rice, and adds one dish`:
      - pantry `{ fish: 1 }` with `['rice','fish']` → pantry `{ fish: 0, onigiri: 1 }`
      - cooked `{ dish: 'onigiri', first: true }`, recipes `['onigiri']`, outcome ok
    - `only the first cook of a recipe is first, and the book keeps one entry`
    - `a mix that matches nothing makes a mystery dish and records nothing`:
      - `{ meat: 1, fruit: 1 }` with `['meat','fruit']` → `{ meat: 0, fruit: 0, mystery: 1 }`
      - `first: false`, recipes unchanged
    - `cooking is refused without enough stock and changes nothing`: `{ meat: 1, veggie: 1 }` with `['meat','meat','veggie']` → refused `noStock`, the same kitchen object back, cooked null.
    - `cooking is refused when the dish is already at 99, and nothing is used`. Do the same for mystery at 99.
    - `cooking is refused for a dead, egg or sleeping pet in that order; a sick pet may cook`
    - `cook does not mutate its inputs`
  - `schema.test.ts`:
    - `a kitchen without recipes loads with an empty recipe book and keeps the pantry`
    - `unknown or repeated recipe ids are dropped`: `['steak','pizza','steak']` → `['steak']`.
  - `balance.test.ts`:
    - `a player who cooks steak from the haul still ends the child stage meat-dominant`. Use the 7.1 route helpers. Cook steak whenever meat ≥ 2 and veggie ≥ 1, feed steak first, and assert dominant `meat` on the last child minute.
- [ ] **Step 2: Run** `npx vitest run src/core src/data src/storage`. Expected: FAIL.
- [ ] **Step 3: Implement** `recipes.ts`, the types, `EMPTY_KITCHEN.recipes`, `cooking.ts` and the schema field.
  - Schema: an array of strings. Filter it to known `DISH_IDS`, then dedupe, keeping the first. Default to `[]` when missing.
  - Locale: `refuse_pantryFull` is 「しょくりょうこが いっぱいだよ」 / "Your pantry is full."
- [ ] **Step 4: Run** `npx vitest run && npm run typecheck && npm run lint`. Expected: all pass.
- [ ] **Step 5: Commit** `feat: add the recipes and the cooking rules`

### Task 3: The cook request

**Files:**
- Modify: `src/messaging/protocol.ts`, `src/messaging/protocol.test.ts`, `src/background/engine.ts`, `src/background/engine.test.ts`

**Interfaces:**
- Consumes: `POT_ITEMS`, `POT_MAX`, `cook`, `Cooked` (Task 2)
- Produces:
  - request `{ type: 'cook'; items: PotItem[] }`, validated as `z.array(z.enum(POT_ITEMS)).min(1).max(POT_MAX)`
  - `EngineResponse` ok adds `cooked?: Cooked`, sent only when the cook was ok

- [ ] **Step 1: Write the failing tests.**
  - `cook requests with a bad pot are rejected`: `[]`, 5 items, `['candy']`, `['steak']`, `['beef']` and `'meat'` (not an array) each answer `invalid request`, and the stored save is unchanged.
  - `cooking steak saves the dish and the recipe and returns cooked`
  - `a refused cook returns no cooked and leaves the save unchanged`
  - `cooking the last ingredients twice refuses the second with noStock`: send two cooks of `['meat','meat','veggie']` at the same moment with `{ meat: 2, veggie: 1 }`. The first is ok and the second is refused `noStock`; the pantry ends `{ meat: 0, veggie: 0, steak: 1 }`.
- [ ] **Step 2: Run** `npx vitest run src/messaging src/background`. Expected: FAIL.
- [ ] **Step 3: Implement** the request schema and a `cookMutator` beside `forageMutator`.
  - `mutatorFor` must stay under 50 lines: move today's feed branch into its own `feedMutator` at the same time.
- [ ] **Step 4: Run** `npx vitest run && npm run typecheck && npm run lint`. Expected: all pass.
- [ ] **Step 5: Commit** `feat: cook in the engine`

### Task 4: The Cook tab

**Files:**
- Create: `src/ui/components/CookTab.tsx` (+test), `src/ui/useCooking.ts` (+test)
- Modify: `src/ui/components/FoodPanel.tsx` (+test), `src/entrypoints/popup/App.tsx` (+test), `src/entrypoints/popup/style.css`, `public/_locales/{ja,en}/messages.json`

**Interfaces:**
- Consumes: `POT_ITEMS`, `POT_MAX`, `Cooked` (Task 2); the `cook` request (Task 3); `stockOf`, `isDish`, `useScrollCue`
- Produces:
  - `useCooking(send: UseGame['send']): { cook(items: readonly PotItem[]): Promise<void>; cooked: Cooked | null; clearCooked(): void }`
    - It ignores a cook while one is pending, and resets in `finally`.
    - It sets `cooked` only from an ok reply that carries it. Refusals reach the player through the usual outcome toast.
  - `FoodPanel` props add `onCook(items: readonly PotItem[]): void`
  - `CookTab({ pantry, pot, onPot, onCook }: { pantry: Pantry; pot: readonly PotItem[]; onPot(next: readonly PotItem[]): void; onCook(items: readonly PotItem[]): void })`. `FoodPanel` owns `pot`.

Copy:

| key | ja | en |
|---|---|---|
| `tab_eat` | たべる | Eat |
| `tab_cook` | りょうりする | Cook |
| `cook_make` | つくる | Cook it |
| `cook_pot` | なべ | Pot |
| `cook_pot_empty` | しょくざいを タップして なべに いれよう | Tap ingredients to put them in the pot |

- [ ] **Step 1: Write the failing tests.**
  - `FoodPanel.test.tsx`:
    - `the eat tab hides dishes you have none of but keeps the ingredients`:
      - pantry `{ steak: 1 }` shows steak ×1
      - cake, omurice and mystery are absent
      - fish shows ×0 and is disabled
    - `the tabs switch between eating and cooking`: tabs have `role="tab"` and `aria-selected`, with Eat selected first.
  - `CookTab.test.tsx`:
    - `the pot offers rice and the 8 ingredients, never candy or dishes`
    - `tapping an ingredient puts it in the pot, and tapping it in the pot takes it back`
    - `an ingredient goes in only as many times as you have it; rice any number of times`: with `{ meat: 1 }`, meat is disabled after one tap, and its count shows ×0.
    - `the pot holds at most 4`
    - `Cook it is disabled for an empty pot and sends the pot items in the order they went in`
  - `useCooking.test.ts`:
    - `a second cook while one is pending is ignored`: `send` is called once.
    - `an ok reply sets cooked; a refused reply leaves it null`
  - `App.test.tsx`:
    - `cooking from the food panel sends the pot and closes the panel`
- [ ] **Step 2: Run** the four test files. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - The pot state lives in `FoodPanel`, so switching tabs keeps it and closing the panel empties it.
  - The pot is a row of 4 slots plus the Cook it button. The ingredient grid below it reuses the food grid styles and the ▼ cue.
  - Wire `onCook` in `PanelChoice`: call `cooking.cook(items)` and close the panel. `useCooking` lives in `MainScreen`, beside `useCareEffect`.
- [ ] **Step 4: Look at it.**
  - Build the e2e extension and screenshot both tabs in ja with a seeded pantry (in your own temp dir).
  - Check that the Cook tab fits inside the panel and the popup stays 360×462.
- [ ] **Step 5: Run** `npx vitest run && npm run typecheck && npm run lint`, and `npx wxt build --mode e2e && npx playwright test`. Expected: all pass (plan 1's e2e still finds fish disabled at ×0).
- [ ] **Step 6: Commit** `feat: add the cook tab to the food panel`

### Task 5: The pot effect and the ready note

**Files:**
- Create: `src/ui/effects/cook.ts` (+test), `src/ui/components/CookedNote.tsx` (+test), `src/assets/ui/cook/pot.png` (32×32)
- Modify:
  - `src/ui/effects/{types,timeline,layout}.ts` (+ `timeline.test.ts`), `src/ui/components/EffectLayer.tsx`
  - `src/ui/assets.ts` (+ `src/assets/assets.test.ts`), `src/ui/sound.ts` (+test)
  - `src/entrypoints/popup/App.tsx` (+test), `public/_locales/{ja,en}/messages.json`, `docs/art/style-guide.md`

**Interfaces:**
- Consumes: `useCooking().cooked` (Task 4), `effectDurationMs`, `useCareEffect().play`, the `dust0`–`dust2` and `sparkle` effect art
- Produces:
  - `CareEffect` adds `{ kind: 'cook'; dish: CookedDish }`
  - `PropArt` adds `{ kind: 'cook'; id: 'pot' }`, drawn at 32 px art size
  - `COOK_ART_IDS = ['pot']`, under `src/assets/ui/cook/` and checked at 32×32
  - `SfxName` adds `simmer` (notes [262, 294, 262, 294], 0.07 s) and `cooked` (notes [659, 784, 988, 1319], 0.08 s)
  - `CookedNote({ cooked, delayMs, onDone })`
    - It shows nothing for `delayMs`, then shows the note for `COOKED_MS = 2500` and calls `onDone`.
    - The note has the dish icon, `cooked_title`, and `cooked_first` when `first` is true.

The COOK timeline (whole display pixels; props on even x and y):
- **Normal (1600 ms):**
  - The pot sits at `POT_AT` (beside the pet, where `FOOD_AT` is) for the whole effect.
  - 0–1200 ms: the pot hops up 2 px every other 150 ms, and one steam puff rises from the pot's top every 400 ms (dust0 → dust1 → dust2, 4 px up per 100 ms).
  - 1200–1600 ms: the pot is still, a sparkle shows over it, and the pet's pose is `happy`.
  - Cues: `simmer` at 0 and 600, `cooked` at 1200.
- **Reduced (800 ms):**
  - The pot is still for the whole effect, with no steam.
  - From 500 ms: the sparkle and the `happy` pose.
  - Cues: `simmer` at 0, `cooked` at 500.

Copy:

| key | ja | en |
|---|---|---|
| `cooked_title` | $1 ができた！ | $1 is ready! |
| `cooked_first` | はじめて！ | New recipe! |

The placeholder works the way `zukan_count` does (`$P1$` with a `placeholders` entry).

- [ ] **Step 1: Write the failing tests.**
  - `cook.test.ts`:
    - `the pot shows for the whole effect and hops only while simmering`
    - `steam puffs rise from the pot while simmering`
    - `the sparkle and the happy pose come at 1200 ms (500 ms reduced)`
    - `cues: simmer at 0 and 600, cooked at 1200; reduced: simmer at 0, cooked at 500`
  - `timeline.test.ts`: add `cook` to the every-effect checks: within `MAX_EFFECT_MS` and `MAX_REDUCED_MS`, even positions, and no motion when reduced.
  - `CookedNote.test.tsx`:
    - `shows nothing until delayMs, then the dish and the title`
    - `marks a first recipe with New recipe!`
    - `a mystery dish has no New recipe! mark`
    - `calls onDone after COOKED_MS`
  - `sound.test.ts`: `simmer` and `cooked` exist.
  - `App.test.tsx`: `an ok cook plays the pot effect, then the ready note`.
- [ ] **Step 2: Run** those files. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - When `cooked` turns non-null, `MainScreen` plays `{ kind: 'cook', dish }`.
  - It shows `CookedNote` in the top overlay beside `GainedNote`, with `delayMs = effectDurationMs(effect, reduced)`.
- [ ] **Step 4: Make the pot.**
  - `get_balance` first. Run `create_image_pixen` with the same settings as Task 1: `a small round cooking pot with a lid and two handles, cute pixel icon, thick black outline, no face`, 3 candidates.
  - Pick, snap and edge-fix as in Task 1. Draw it by hand if all 3 have faces.
  - Run `check.ts --palette --size 32x32`.
  - Add the pot to the style guide's Dishes section, with a note that steam reuses the dust puffs.
- [ ] **Step 5: Run** `npx vitest run && npm run typecheck && npm run lint`. Expected: all pass.
- [ ] **Step 6: Commit** `feat: play a pot effect and a ready note after cooking`

### Task 6: The recipe book

**Files:**
- Create: `src/ui/components/RecipeBook.tsx` (+test)
- Modify: `src/entrypoints/popup/App.tsx` (+test; the zukan overlay gets tabs), `src/entrypoints/popup/style.css`, `public/_locales/{ja,en}/messages.json`

**Interfaces:**
- Consumes: `RECIPES`, `POT_ITEMS` (Task 2), `kitchen.recipes`, `iconUrl`
- Produces: `RecipeBook({ recipes }: { recipes: readonly DishId[] })`
  - A found recipe shows its icon, its name, and its ingredients in `POT_ITEMS` order as `<name>×<n>` joined by `・` (ja) or ` · ` (en), via a `recipe_join` message.
  - A recipe not yet found shows a plain "?" box, 「？？？」 and its hint.

Copy:

| key | ja | en |
|---|---|---|
| `zukan_tab_pets` | ペット | Pets |
| `zukan_tab_recipes` | レシピ | Recipes |
| `recipes_count` | みつけたレシピ $1 / $2 | Recipes found $1 / $2 |
| `recipe_unknown` | ？？？ | ??? |
| `recipe_join` | ・ | " · " |
| `recipe_hint_steak` | おにくが しゅやく… | Meat is the star… |
| `recipe_hint_acquapazza` | おさかなを やさいと にこむ… | Fish simmered with veggies… |
| `recipe_hint_cake` | くだものが いっぱい… | Lots of fruit… |
| `recipe_hint_onigiri` | ごはんで なにかを つつむ… | Rice wrapped around something… |
| `recipe_hint_omurice` | ごはんを たまごで つつむ… | Rice wrapped in egg… |
| `recipe_hint_seafoodbowl` | ごはんに うみのものを のせる… | Rice topped with things from the sea… |
| `recipe_hint_friedshrimp` | えびに ころもを つける… | Shrimp in a crispy coat… |
| `recipe_hint_hamburg` | おにくを こねて まるめる… | Meat kneaded into a patty… |
| `recipe_hint_stirfry` | やさいだけで いためる… | Only veggies, stir-fried… |
| `recipe_hint_mushroomsoup` | きのこが はいった スープ… | A soup with mushrooms… |
| `recipe_hint_nutcookie` | きのみを つかった おかし… | A snack made with nuts… |
| `recipe_hint_fruittart` | くだものと きのみの おかし… | A snack of fruit and nuts… |

- [ ] **Step 1: Write the failing tests.**
  - `RecipeBook.test.tsx`:
    - `shows how many of the 12 recipes are found`: `['steak']` → 「みつけたレシピ 1 / 12」 (via `t`).
    - `a found recipe shows its dish and its ingredients with counts`: steak → `Meat×2 · Veggies×1` (en names).
    - `a recipe not yet found shows ??? and its hint, not its name`
    - `the mystery dish is never listed`: 12 rows.
  - `App.test.tsx`:
    - `the zukan has Pets and Recipes tabs`: Pets is first and shows today's zukan; Recipes shows the book.
- [ ] **Step 2: Run** those files. Expected: FAIL.
- [ ] **Step 3: Implement.** The tabs work like the food panel's (`role="tab"`, `aria-selected`). `ZukanView` stays unchanged under the Pets tab.
- [ ] **Step 4: Look at it.** Screenshot the Recipes tab in ja and en from the e2e build, with a few recipes found. Check that the rows fit.
- [ ] **Step 5: Run** `npx vitest run && npm run typecheck && npm run lint`. Expected: all pass.
- [ ] **Step 6: Commit** `feat: add the recipe book to the zukan`

### Task 7: Real-extension tests and the play gate (Gate I)

**Files:**
- Modify: `e2e/popup.spec.ts` (and `e2e/fixtures.ts` if a seeding helper helps)

- [ ] **Step 1: Write the e2e tests.**
  - `cooking steak puts it in the pantry and in the recipe book`:
    - Seed a pantry `{ meat: 2, veggie: 1 }`.
    - In the Cook tab, tap meat, meat, veggie, then Cook it.
    - The ready note shows the steak title and New recipe!.
    - The Eat tab shows steak ×1 and meat ×0.
    - The zukan's Recipes tab shows 1 / 12 and the steak name.
  - `a mix that matches no recipe makes a mystery dish`: `{ meat: 1, fruit: 1 }` → the mystery title, no New recipe!, and the book is still 0 / 12.
- [ ] **Step 2: Run** `npx wxt build --mode e2e && npx playwright test`. Expected: all pass.
- [ ] **Step 3: Full check:** `npm run lint && npm run typecheck && npm run test:coverage`. Expected: all pass, with coverage about where it was.
- [ ] **Step 4: Gate I (blocking; run by the controller).**
  - Record GIFs from the e2e build in ja: cooking steak for the first time, cooking it again (no New recipe!), a mystery dish, the recipe book, and feeding a dish (its bite frames).
  - Show the pot at 4× too. Show them to the owner, apply what they ask for, and keep everything green.
- [ ] **Step 5: Commit** `test: cover cooking and the recipe book in the real extension` (plus any `fix:` commits from the gate)

### Task 8: README and store screenshots

**Files:**
- Modify: `README.md`, and the store screenshots that `npm run screenshots` writes

- [ ] **Step 1: README.** In Features:
  - Change the Care bullet to: `**Care**: meals and treats, mini-games (Catch, Cups, Stop), cleaning up, medicine, lights out, and petting. Only rice and candy are free; everything else comes from the pantry.`
  - Add after it: `**Outings**: fishing, hunting and gathering (three trips each a day) and a small farm fill the pantry.`
  - Add after that: `**Cooking**: put up to four ingredients in the pot to discover 12 recipes; found recipes stay in the recipe book.`
  - Change the Zukan bullet to: `**Zukan**: a collection of every form you have discovered, memories of past pets, and your recipe book.`
- [ ] **Step 2: Screenshots.** Run `npm run screenshots` as it is, and read every image it writes. Each shows the 8-button bar.
- [ ] **Step 3: Commit** `docs: describe outings and cooking, refresh the store screenshots`
