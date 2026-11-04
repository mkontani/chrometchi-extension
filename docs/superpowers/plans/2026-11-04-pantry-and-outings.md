# Pantry and Outings Implementation Plan (plan 1 of 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The pet gets its fish, meat, nuts, vegetables and fruit itself. Three short outing games (fishing, hunting, gathering) and a farm fill a pantry. Only rice and candy stay free. Everything else is fed from the pantry.

**Architecture:**
- **Saved state.** A new top-level `kitchen` holds the pantry, today's outing counts and the farm. Like the zukan, it lives outside `game`, so it survives a new egg. Old saves load with an empty kitchen.
- **Core rules.** All rules are pure functions in `src/core`: stock, yields, the daily limit, farm growth and feeding from stock.
- **Engine.** It gains `forage` and `farm` requests and returns what was `gained`.
- **Outing games.** They reuse the mini-game canvas framework with a new `OutingGame` interface that returns a score from 0 to 100 instead of won/lost. The popup sends only that score; the engine decides the haul with its rng.

**Plan 2 (separate, written after this one lands):** cooking, recipes, the recipe book and dish art (spec chapter 5). It builds on the `kitchen` from this plan. In this plan, cake has no source yet and shows as ×0.

**Tech Stack:** Preact, TypeScript, Zod 4, Vitest + @testing-library/preact (happy-dom), Playwright e2e, pngjs art scripts, PixelLab MCP.

**Spec:** `docs/superpowers/specs/2026-11-04-foraging-and-cooking-design.md` (parent: `docs/superpowers/specs/2026-11-03-chrometchi-rebuild-design.md`)

## Global Constraints

- **Free foods.** Only rice and candy are always available. Fish, shrimp, meat, egg, nuts, mushroom, veggie, fruit and cake come from the pantry, and feeding one takes one away.
- **Pantry limits.** At most 99 of each food. The pantry, outing log and farm survive a new egg.
- **Outing limit.** Fishing, hunting and gathering may be played 3 times each per local calendar day.
  - An outing counts only when its result arrives. Closing the popup mid-game changes nothing.
  - Never change the limit of 3 without asking the owner (spec 4.1).
- **Haul.** Every outing yields at least 1 item.
- **Who can go out.** Outings and farm work are refused for an egg, a sleeping pet and a pet that is not alive. A sick pet may go out.
- **Pet unchanged.** Outings do not change the pet's stats and do not count in `gameCounts`.
- **Farm clock.** The farm grows only in game time (the minutes `advanceTime` consumes), so it does not grow while Chrome is closed.
- **Save format.**
  - Old saves must load without a reset. A missing `kitchen` becomes `EMPTY_KITCHEN`, and the pet and zukan stay.
  - Keep `version: 1` and `SAVE_KEY`.
- **Boundaries.**
  - The popup never adds items directly; it only sends a score.
  - The score is validated as an integer 0..100 at the protocol boundary.
- **Hunting look.** Hunting must not look scary or hurtful: no blood, no injury, no animal being hurt. In this plan the thing that pops out of the grass is the meat (or egg) icon itself.
- **Art.**
  - Master palette, checked with `npx tsx scripts/art/check.ts --palette --size <WxH> <files>`.
  - 1px black outline, transparent background.
  - No faces on food or props.
  - No imitation of existing franchises.
  - Review at 4×.
- **PixelLab.** Use the free monthly quota only. Check `get_balance` before each art step, and stop and ask the owner if `generations_remaining` < 100.
- **Repo rules.**
  - TDD, with each test watched failing first.
  - Coverage stays around 98% (at least 80%).
  - Functions < 50 lines, files < 800 lines.
  - Immutable updates, no `console.log`.
  - UI text in both `public/_locales/ja` and `en`.
- **Commits.** Conventional format, **no attribution trailer** (owner rule). Never push, open a PR or merge without the owner's say-so.
- **Language.** Talk to the owner in Japanese. Code, comments and test names stay in English.

## Review Focus

1. **Old save, first open after the update.** A v1 save with no `kitchen` loads with an empty pantry, and the pet and zukan are unchanged (no reset, no data-reset notice). Tested in Task 2 (`a save without kitchen loads with an empty kitchen and keeps the pet`).
2. **The day rolls over.** All 3 fishing trips are used on 2026-11-04, and the player fishes again just after midnight. The trip is allowed and the count restarts at 1. Tested in Task 4 (`a new local day resets the outing counts`).
3. **A forged or broken score.** A message with score 150, -1, 2.5 or `"100"` is rejected as an invalid request, and nothing changes. Tested in Task 4 (`forage requests with a bad score are rejected`).
4. **A full pantry.** Fish is at 98 and the haul is 3. Fish becomes 99, `gained` reports only what was really added, and a haul that adds nothing still counts the trip. Tested in Task 1 (`addToPantry clamps at 99 and reports only what was added`) and Task 4 (`forage at a full pantry counts the trip and gains nothing`).
5. **The last item fed twice quickly** (a double-click, or two panels). The second feed is refused with `noStock`, and the count never goes below 0. Tested in Task 3 (`feeding the last fish twice refuses the second with noStock`).

---

## File Structure

| File | Responsibility |
|---|---|
| `src/core/types.ts` | ingredient/food ids, `OutingKind`, `Crop`, `Pantry`, `Gained`, `Kitchen`, `FarmOp`, new refuse reasons |
| `src/data/foods.ts` | 11 food defs, `FOOD_IDS`, `ALWAYS_FOODS` |
| `src/data/outings.ts` | `OUTING_KINDS`, `OUTING_YIELDS` |
| `src/core/pantry.ts` (+test) | `stockOf`, `addToPantry`, `takeOne`, `feedFromPantry` |
| `src/core/kitchen.ts` (+test) | `EMPTY_KITCHEN`, `dayKey` |
| `src/core/outings.ts` (+test) | limits and yields: `outingsLeft`, `forageAmount`, `rareChance`, `forage` |
| `src/core/farm.ts` (+test) | `FARM`, `growFarm`, `farmAction` |
| `src/core/advance.ts` | also return `minutes` |
| `src/storage/schema.ts`, `repository.ts` | `kitchen` in the save, with defaults |
| `src/messaging/protocol.ts`, `src/background/engine.ts` | `forage` / `farm` requests, the `gained` response, the farm growing on each tick |
| `src/outings/{types,registry}.ts`, `src/outings/{fishing,hunting,gathering}/{logic,render}.ts` | outing games |
| `src/ui/gameLoop.ts` | the RAF loop, shared by `MiniGameHost` and `OutingHost` |
| `src/ui/components/{OutingPanel,OutingHost,GainedNote}.tsx` | outing UI |
| `src/ui/useOutings.ts` | sends outings and farm work, holds `gained` |
| `src/ui/components/{ActionBar,FoodPanel}.tsx`, `src/entrypoints/popup/App.tsx` | wiring |
| `src/assets/ui/icons/food_{shrimp,egg,nuts,mushroom,fruit}.png`, `src/assets/ui/food/*_bite{1,2}.png`, `src/assets/ui/icons/outing.png`, `src/assets/ui/outing/{float,grass,bush,sprout,can}.png` | art |

---

### Task 1: New ingredients and the pantry rules

**Files:**
- Modify: `src/core/types.ts`, `src/data/foods.ts`, `src/data/data.test.ts`, `src/core/constants.ts`, `public/_locales/{ja,en}/messages.json`, `src/assets/assets.test.ts` (none expected, the lists derive from `FOODS`)
- Create: `src/core/pantry.ts`, `src/core/pantry.test.ts`
- Create: `src/assets/ui/icons/food_{shrimp,egg,nuts,mushroom,fruit}.png` (32×32), `src/assets/ui/food/{shrimp,egg,nuts,mushroom,fruit}_bite{1,2}.png`

**Interfaces:**
- Produces:
  - `type IngredientId = 'fish' | 'shrimp' | 'meat' | 'egg' | 'nuts' | 'mushroom' | 'veggie' | 'fruit'`
  - `type FoodId = 'rice' | 'candy' | 'cake' | IngredientId`
  - `type Pantry = Partial<Record<FoodId, number>>`, and `type Gained = Pantry`
  - `FOOD_IDS` (a readonly tuple, in `FOODS` order), `ALWAYS_FOODS: ReadonlySet<FoodId>` = rice and candy
  - `PANTRY_MAX = 99` (in constants)
  - `stockOf(pantry: Pantry, food: FoodId): number` (Infinity for always foods)
  - `addToPantry(pantry: Pantry, items: Gained): { pantry: Pantry; added: Gained }`
  - `takeOne(pantry: Pantry, food: FoodId): Pantry | null`

- [ ] **Step 1: Write the failing tests** (`pantry.test.ts`):
  - `stockOf is Infinity for rice and candy and the count (or 0) for the rest`
  - `addToPantry clamps at 99 and reports only what was added`: `{ fish: 98 }` + `{ fish: 3, shrimp: 1 }` → pantry `{ fish: 99, shrimp: 1 }`, added `{ fish: 1, shrimp: 1 }`. Adding to a fish already at 99 gives added `{}`.
  - `takeOne removes one, refuses at 0, and leaves always foods alone`: `{ fish: 1 }` → `{ fish: 0 }`; `{}` → null; for rice the same object comes back.
  - `the inputs are not mutated`

  In `data.test.ts`:
  - change the food count to `42 + 11 + 3`;
  - add `test('the new ingredients count as fish, meat, grain, veggie and sweet')`: shrimp→fish, egg→meat, nuts→grain, mushroom→veggie, fruit→sweet; all `kind: 'meal'`.
- [ ] **Step 2:** Run `npx vitest run src/core/pantry.test.ts src/data/data.test.ts`. Expected: FAIL (no module / count 6).
- [ ] **Step 3: Data and rules.**
  - `FOODS` order: rice, candy, fish, shrimp, meat, egg, nuts, mushroom, veggie, fruit, cake. Keep the old defs' values.
  - New defs as `{ hunger, mood, weight, vitality }`:
    - shrimp `30, 5, 1, 3`
    - egg `30, 0, 1, 3`
    - nuts `20, 5, 1, 2`
    - mushroom `20, 0, 0, 5`
    - fruit `20, 10, 0, 3`
  - Messages:
    - `food_shrimp` えび / Shrimp
    - `food_egg` たまご / Egg
    - `food_nuts` きのみ / Nuts
    - `food_mushroom` きのこ / Mushroom
    - `food_fruit` くだもの / Fruit
  - Make the zod `feed` enum in `src/messaging/protocol.ts` use `z.enum(FOOD_IDS)`.
- [ ] **Step 4:** Run the same tests. Expected: PASS. Then run `npx vitest run src/assets`. Expected: FAIL. The 5 new icons and their 10 bitten frames are missing.
- [ ] **Step 5: Art (PixelLab).** Call `get_balance` first. This step uses about 20 generations.
  - Settings: `create_image_pixen(width 32, height 32, no_background true, outline 'single color black outline', detail 'low detail')`, 3–4 candidates each.
  - Prompts: `<thing>, cute pixel food icon, thick black outline, no face`, where `<thing>` is:
    - `a pink shrimp`
    - `a white egg`
    - `three brown nuts`
    - `a red-capped mushroom`
    - `a red apple and a bunch of grapes`
  - Reject any candidate with a face. Snap the picks with `reduce_colors(palette_image=docs/art/palette.png)`.
  - Make the bites with `npx tsx scripts/art/bite.ts <1|2> src/assets/ui/icons/food_<id>.png src/assets/ui/food/<id>_bite<n>.png`.
  - Run `npx tsx scripts/art/check.ts --palette --size 32x32 <new files>`. Expected: exit 0.
- [ ] **Step 6:** Run `npx vitest run src/assets src/core src/data src/ui`. Expected: PASS.
- [ ] **Step 7: Commit:** `feat: add the new ingredients and the pantry rules`

---

### Task 2: The kitchen in the save

**Files:**
- Modify: `src/core/types.ts`, `src/storage/schema.ts`, `src/storage/repository.ts`, their tests, any save fixtures (`src/storage/__fixtures__`, `e2e/` helpers)
- Create: `src/core/kitchen.ts`, `src/core/kitchen.test.ts`
- Modify also: `src/background/engine.test.ts`

**Interfaces:**
- Consumes: `Pantry`, `FOOD_IDS` (Task 1)
- Produces:
  - `type OutingKind = 'fishing' | 'hunting' | 'gathering'`
  - `type Crop = 'veggie' | 'fruit'`
  - `interface OutingLog { day: string; used: Record<OutingKind, number> }`
  - `interface Farm { crop: Crop | null; growMinLeft: number; watered: boolean }`
  - `interface Kitchen { pantry: Pantry; outings: OutingLog; farm: Farm }`
  - `EMPTY_KITCHEN` (day `''`, used all 0, no crop)
  - `dayKey(now: number): string` (the local date, `YYYY-MM-DD`)
  - `SaveV1.kitchen: Kitchen`, and `createFreshSave` includes `EMPTY_KITCHEN`

- [ ] **Step 1: Write the failing tests:**
  - `dayKey gives the local date with zero padding` (2026-01-05 09:00 local → `'2026-01-05'`)
  - in `schema.test.ts`:
    - `a save without kitchen loads with an empty kitchen and keeps the pet`
    - `a kitchen round-trips`
    - `unknown pantry keys are dropped and counts outside 0..99 fail`
    - `growMinLeft must be a non-negative integer`
  - in `repository.test.ts`: `a fresh save has an empty kitchen`
  - in `engine.test.ts`: `a new egg (restart) keeps the kitchen`
- [ ] **Step 2:** Run `npx vitest run src/core/kitchen.test.ts src/storage`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - The schema follows the same pattern as `withDefaultSettings`: a preprocess turns a missing `kitchen` into `EMPTY_KITCHEN`.
  - The pantry is a record, filtered to known `FOOD_IDS` (as `lastNotified` filters notify kinds). Each value is an int 0..`PANTRY_MAX`.
  - Fix every fixture and test helper that builds a `SaveV1`.
- [ ] **Step 4:** Run `npm run typecheck && npx vitest run`. Expected: PASS.
- [ ] **Step 5: Commit:** `feat: keep a kitchen in the save`

---

### Task 3: Feeding from the pantry

**Files:**
- Modify: `src/core/types.ts`, `src/core/pantry.ts`, `src/core/pantry.test.ts`, `src/background/engine.ts`, `src/background/engine.test.ts`, `src/data/data.test.ts`, `public/_locales/{ja,en}/messages.json`

**Interfaces:**
- Consumes: `takeOne`, `stockOf` (Task 1), `SaveV1.kitchen` (Task 2)
- Produces:
  - `RefuseReason` gains `'noStock'`
  - `feedFromPantry(pet: PetState, pantry: Pantry, action: Extract<CareAction, { kind: 'feed' }>): { result: CareResult; pantry: Pantry }`

- [ ] **Step 1: Write the failing tests:**
  - `feeding fish takes one from the pantry`
  - `feeding with no stock refuses with noStock and leaves the pet unchanged`
  - `rice and candy never need stock`
  - `a refused feed (full) keeps the stock`
  - `feeding the last fish twice refuses the second with noStock`
  - engine: `a care feed uses the pantry in the save`
  - data test: add `noStock` to the refuse-reason record.
- [ ] **Step 2:** Run `npx vitest run src/core/pantry.test.ts src/background src/data`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - Check stock first. If it is 0, refuse `noStock` before `applyCare`. Otherwise call `applyCare`, and take one only when the outcome is ok.
  - In the engine's `care` mutator, feed actions go through `feedFromPantry` and write back `kitchen.pantry`. Other care is unchanged.
  - Messages: `refuse_noStock` もっていないよ / You don't have any.
- [ ] **Step 4:** Run `npx vitest run`. Expected: PASS.
- [ ] **Step 5: Commit:** `feat: feed from the pantry; only rice and candy are free`

---

### Task 4: Outing rules and the forage request

**Files:**
- Create: `src/data/outings.ts`, `src/core/outings.ts`, `src/core/outings.test.ts`
- Modify: `src/core/types.ts`, `src/messaging/protocol.ts` (+test), `src/background/engine.ts` (+test), `src/data/data.test.ts`, messages

**Interfaces:**
- Consumes: `Kitchen`, `dayKey`, `addToPantry`
- Produces:
  - `OUTING_KINDS: readonly OutingKind[]` = fishing, hunting, gathering
  - `OUTING_YIELDS: Record<OutingKind, { main: IngredientId; rare: IngredientId }>`: fishing fish/shrimp, hunting meat/egg, gathering nuts/mushroom
  - `OUTING_LIMIT = 3`
  - `outingsLeft(log: OutingLog, kind: OutingKind, now: number): number`
  - `forageAmount(score: number): number` = `1 + Math.floor(score * 3 / 100)` (0→1, 34→2, 67→3, 100→4)
  - `rareChance(score: number): number` = `0.1 + 0.4 * score / 100`
  - `interface KitchenResult { kitchen: Kitchen; gained: Gained; outcome: CareOutcome }`
  - `forage(input: { pet: PetState; kitchen: Kitchen; kind: OutingKind; score: number; now: number; rng: Rng }): KitchenResult`
  - `CareOutcome.action` widens to `CareAction['kind'] | 'forage' | 'farm'`
  - `RefuseReason` gains `'outingLimit'`
  - `EngineRequest` gains `{ type: 'forage'; kind: OutingKind; score: number }`
  - the ok `EngineResponse` gains `gained?: Gained`

- [ ] **Step 1: Write the failing tests** (`outings.test.ts`, using `createRng` and fixed `now` values):
  - `forageAmount maps 0, 33, 34, 66, 67, 100 to 1, 1, 2, 2, 3, 4`
  - `a trip at score 0 still brings at least one main item`
  - `a rare item comes when rng is below rareChance` (stub rng: 0.05 → rare at score 0; 0.2 → none at score 0, rare at score 100)
  - `each kind allows 3 trips a day, then refuses with outingLimit`
  - `a new local day resets the outing counts`
  - `forage at a full pantry counts the trip and gains nothing`
  - `egg, sleeping and departed pets are refused (egg, asleep, notAlive)`
  - `a sick pet may go out`
  - `the pet itself is unchanged by a trip`
  
  Protocol tests:
  - `forage requests with a bad score are rejected` (150, -1, 2.5, `'100'`, missing kind)
  
  Engine tests:
  - `forage adds the haul to the pantry and returns gained`
  - `a refused forage returns the outcome and changes nothing`
- [ ] **Step 2:** Run `npx vitest run src/core/outings.test.ts src/messaging src/background`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - Refusal order: `notAlive`, `egg`, `asleep`, `outingLimit`.
  - On ok:
    - set the log's day to `dayKey(now)`, resetting `used` if the day changed, and add 1 to `used[kind]`;
    - add `forageAmount(score)` of the main item, plus 1 rare item when `rng() < rareChance(score)`;
    - add through `addToPantry`; `gained` is what was added.
  - The engine's `mutatorFor` takes `rng` (`mutatorFor(req, deps.rng)`).
  - `Mutation` gains `gained?`, and `handle` returns it when defined.
  - Messages: `refuse_outingLimit` きょうはもうおしまい / That's enough for today.
- [ ] **Step 4:** Run `npx vitest run`. Expected: PASS.
- [ ] **Step 5: Commit:** `feat: add outing rules and the forage request`

---

### Task 5: The farm

**Files:**
- Create: `src/core/farm.ts`, `src/core/farm.test.ts`
- Modify: `src/core/advance.ts` (+test), `src/core/types.ts`, `src/messaging/protocol.ts` (+test), `src/background/engine.ts` (+test), `src/data/data.test.ts`, messages

**Interfaces:**
- Consumes: `KitchenResult`, `addToPantry`
- Produces:
  - `FARM = { growMin: 240, harvest: 2, waterBonus: 2 }`
  - `type FarmOp = { op: 'plant'; crop: Crop } | { op: 'water' } | { op: 'harvest' }`
  - `growFarm(farm: Farm, minutes: number): Farm`
  - `farmAction(input: { pet: PetState; kitchen: Kitchen; action: FarmOp }): KitchenResult`
  - `RefuseReason` gains `'farmNotReady'`
  - `advanceTime(...)` also returns `minutes: number` (0 when locked or not alive)
  - `EngineRequest` gains `{ type: 'farm'; action: FarmOp }`

- [ ] **Step 1: Write the failing tests:**
  - `planting starts a 240-minute crop`
  - `planting on a busy field is refused with farmNotReady`
  - `the crop grows by the minutes given and stops at 0`
  - `watering works once while growing`
  - `harvest gives 2, or 4 when watered, and empties the field`
  - `harvest before ready is refused`
  - `egg, asleep and notAlive are refused`
  
  Advance and engine tests:
  - `advanceTime reports the minutes it consumed (0 when locked)`
  - `a tick grows the farm by game minutes only` (a gap above `TICK_MAX_GAP_MS` grows nothing)
  - `farm requests return gained on harvest`
- [ ] **Step 2:** Run `npx vitest run src/core/farm.test.ts src/core/advance.test.ts src/background src/messaging`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - In `runOperation`, after `advanceTime`, set `kitchen.farm = growFarm(loaded.kitchen.farm, advanced.minutes)` before the mutation.
  - Message: `refuse_farmNotReady` いまはできないよ / Not now.
- [ ] **Step 4:** Run `npx vitest run`. Expected: PASS.
- [ ] **Step 5: Commit:** `feat: add the farm`

---

### Task 6: Evolution routes stay reachable (spec 7.1)

**Files:**
- Modify: `src/core/balance.test.ts` (and, only if a test fails, `src/data/foods.ts` or `forageAmount`)

**Interfaces:**
- Consumes: `feedFromPantry`, `forage`, `farmAction`, `growFarm`, `dominant`, `weightClass`

- [ ] **Step 1: Write the tests.** Reuse the sparse visit cadence (`SPARSE_INTERVAL = 160`) and a `now` that advances 60 000 ms per awake minute from a fixed midnight.
  - At each visit, the player:
    - goes on every outing still left today, at score 50;
    - harvests if the crop is ready, waters if it can, and plants `fruit` when the field is empty;
    - feeds up to 3 meals: the target route's foods first when in stock, then rice;
    - on the sweet route, also gives at most 1 candy per visit;
    - then plays and cleans as `visit()` does.
  - Tests:
    - `test.each(['meat', 'fish', 'sweet'])('a player who prefers %s ends the child stage with it dominant')`. Check `dominant(pet.history.foodCounts)` on the last child minute.
    - `a rice-only player ends the baby and child stages at normal weight`
    - `a meat-loving player can still end the baby stage heavy`
- [ ] **Step 2:** Run `npx vitest run src/core/balance.test.ts`.
  - Expected: PASS with today's values. These tests guard the balance rather than drive new code.
  - If one fails:
    - tune `forageAmount`, or rice's `weight`;
    - ledger a ruling, keep the existing balance tests green, and keep `OUTING_LIMIT` at 3 (ask the owner otherwise).
- [ ] **Step 3: Commit:** `test: guard the evolution routes under outing limits`

---

### Task 7: Outing button, outing panel and pantry counts

**Files:**
- Create: `src/ui/components/OutingPanel.tsx` (+test), `src/ui/useOutings.ts` (+test), `src/assets/ui/icons/outing.png` (16×16)
- Modify: `src/ui/components/ActionBar.tsx` (+test), `src/ui/components/FoodPanel.tsx` (+test), `src/ui/assets.ts`, `src/entrypoints/popup/App.tsx` (+test), `src/entrypoints/popup/style.css`, messages

**Interfaces:**
- Consumes: `Kitchen`, `outingsLeft`, `stockOf`, `FARM`, `FarmOp`
- Produces:
  - `ActionKind` gains `'outing'`, in this order: feed, play, outing, clean, medicine, lights, zukan, settings (a 4×2 grid)
  - `IconId` gains `'outing'`
  - `OutingPanel(props: { kitchen: Kitchen; now: number; onGo(kind: OutingKind): void; onFarm(action: FarmOp): void; onClose(): void })`
  - `FoodPanel` gains a `pantry: Pantry` prop
  - `useOutings(send: UseGame['send']): { active: OutingKind | null; start(kind: OutingKind): void; finish(score: number): void; cancel(): void; farm(action: FarmOp): void; gained: Gained | null; clearGained(): void }`.
    - `start` sets `active`.
    - `finish` sends `{ type: 'forage', kind: active, score }`, clears `active`, and keeps `r.gained` when the reply is ok with items.
    - `cancel` clears `active` and sends nothing.
    - `farm` sends `{ type: 'farm', action }` and keeps `gained` the same way.
  - in `App`, `Panel` gains `'outing'`. `App` holds `useOutings`, and `MainScreen` gets:
    - `onGo`, which closes the panel, then calls `start`;
    - `onFarm`, which calls `farm`.
  - Task 8 renders the game for `active` and the note for `gained`.

- [ ] **Step 1: Write the failing tests.**
  - ActionBar:
    - `there are 8 buttons and outing is third`
    - `outing is disabled for an egg and while asleep`
  - OutingPanel:
    - `each outing shows the trips left today and is disabled at 0`
    - `an empty field offers to plant veggie or fruit`
    - `a growing field shows the time left and a water button until watered`
    - `a ready field offers harvest`
  - FoodPanel:
    - `rice and candy show ∞`
    - `stocked foods show ×count`
    - `foods at 0 are disabled`
  - useOutings:
    - `finish sends forage with the kind and score and keeps the gained items`
    - `a refused forage keeps gained null`
    - `cancel sends nothing`
    - `farm sends the farm action and keeps a harvest's gained items`
  - App:
    - `the outing button opens the outing panel`
    - `choosing fishing closes the panel and starts the fishing outing`
    - `the food panel shows the pantry counts`
- [ ] **Step 2:** Run `npx vitest run src/ui src/entrypoints`. Expected: FAIL.
- [ ] **Step 3: Implement, and draw the button icon.**
  - Button icon: `create_image_pixen` 16×16, prompt `a small backpack, cute pixel icon, thick black outline, no face`. Snap to the palette and check it.
  - Farm time text: whole hours, rounded up, when ≥ 60 minutes; otherwise minutes.
  - Messages, ja / en:
    - `action_outing` おでかけ / Go out
    - `panel_outing_title` どこへいく？ / Where to?
    - `outing_fishing` つり / Fishing
    - `outing_hunting` かり / Hunting
    - `outing_gathering` さいしゅう / Gathering
    - `outing_farm` はたけ / Farm
    - `outing_left` きょう あと$1$かい / $1$ left today
    - `farm_plant_veggie` やさいをうえる / Plant veggies
    - `farm_plant_fruit` くだものをうえる / Plant fruit
    - `farm_growing_hours` そだちちゅう あと$1$じかん / Growing, $1$ h left
    - `farm_growing_minutes` そだちちゅう あと$1$ふん / Growing, $1$ min left
    - `farm_water` みずやり / Water
    - `farm_harvest` しゅうかく / Harvest
  - Use `placeholders` the way the existing `$1$` messages do.
- [ ] **Step 4:** Run `npx vitest run`. Expected: PASS.
- [ ] **Step 5: Commit:** `feat: add the outing button and panel, and show pantry counts`

---

### Task 8: Outing game framework, host and the haul note

**Files:**
- Create:
  - `src/outings/types.ts`, `src/outings/registry.ts` (+test)
  - `src/ui/gameLoop.ts` (+test)
  - `src/ui/components/OutingHost.tsx` (+test), `src/ui/components/GainedNote.tsx` (+test)
- Modify: `src/ui/components/MiniGameHost.tsx`, `src/ui/sound.ts` (+test), `src/entrypoints/popup/App.tsx` (+test), messages

**Interfaces:**
- Consumes: `useOutings` (Task 7)
- Produces:
  - `interface OutingGame<S> { kind: OutingKind; init(rng: Rng): S; step(s: S, dtMs: number, input: GameInput, rng: Rng): S; isOver(s: S): boolean; score(s: S): number; render(ctx: CanvasRenderingContext2D, s: S, view: OutingView): void; pickFromPointer?(x: number, y: number): number | null }`
  - `type OutingArtId = 'float' | 'grass' | 'bush' | 'sprout' | 'can'`
  - `interface OutingView { player: CanvasImageSource | null; art(id: OutingArtId | \`food_${IngredientId}\`): CanvasImageSource | null }`
  - `OUTING_GAME_MS = 15_000`
  - `OUTING_GAMES: Record<OutingKind, AnyOutingGame>`. Until Tasks 9–11, each entry is a stub that ends at `OUTING_GAME_MS` with score 0.
  - `startLoop<S>(def: { init; step; isOver; render }, ctx, take, view, onOver: (s: S) => void): () => void` in `gameLoop.ts`, used by both hosts
  - `OutingHost(props: { kind: OutingKind; playerUrl?: string; onFinish(score: number): void; onCancel(): void; onResult?(score: number): void })`
  - `GainedNote(props: { gained: Gained | null; onDone(): void })`, which hides after `GAINED_MS = 2500`
  - `SfxName` gains `'get'` (notes `[784, 1047]`, step 0.06)

- [ ] **Step 1: Write the failing tests:**
  - gameLoop: `MiniGameHost still finishes stop` (the existing MiniGameHost tests stay green)
  - OutingHost:
    - `runs the game and calls onFinish with the score after the result pause`
    - `cancel calls onCancel and sends nothing`
  - GainedNote:
    - `lists each gained food with its count`
    - `hides after 2500 ms`
    - `shows nothing for an empty haul`
  - App:
    - `an active outing shows the outing game`
    - `finishing an outing shows what was gained and plays the get sound`
    - `closing the game mid-way sends nothing`
  - sound: `get` is defined.
- [ ] **Step 2:** Run `npx vitest run src/ui src/outings src/entrypoints`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - Move the RAF loop out of `MiniGameHost` into `gameLoop.ts`, keeping its behavior.
  - `OutingHost` mirrors `MiniGameHost`: a canvas with `useGameInput`, a cancel button and a result pause. The result says `outing_done` おしまい！ / Done!
  - Art loads through `assetUrl('ui/outing/<id>')` and `iconUrl('food_<id>')`, and is null while missing.
  - The App layer order puts `activeOuting` right after `activeGame`.
  - `GainedNote` sits in the stage's top overlay. Its title is `gained_title` てにいれた！ / You got:.
  - Messages: `outing_done` (above), `gained_title` (above), `outing_hint_fishing` うきがしずんだらタップ！ / Tap when the float dips!, `outing_hint_hunting` とびだしたらタップ！ / Tap what pops out!, `outing_hint_gathering` ゆれているしげみをさがそう / Find the bushes that shake.
- [ ] **Step 4:** Run `npx vitest run`. Expected: PASS.
- [ ] **Step 5: Commit:** `feat: run outing games and show the haul`

---

Tasks 9–11 each replace one stub in `OUTING_GAMES`.
- **Canvas.** Logical 180×180, like the existing games.
- **Tests.** Logic tests drive `step` directly, using `NO_INPUT` and the `{ ...NO_INPUT, action: true }` / `pick: n` inputs.
- **Render.** `render` draws the pet (`view.player`) somewhere on the canvas, so the pet is the one fishing, hunting or gathering. It draws a shape fallback when `view.player` or `view.art(...)` is null. Its test only checks it runs on a stub 2D context.
- **Hint.** Each game shows its `outing_hint_*` line for the first 2 s. `OutingHost` draws it as DOM text above the canvas, not inside the game.

### Task 9: Fishing

**Files:** Create `src/outings/fishing/{logic,render}.ts`, `logic.test.ts`; modify `registry.ts`.

**Interfaces:**
- Produces: `fishingGame: OutingGame<FishingState>`, with constants `WAIT_MS = [1000, 2500]`, `BITE_MS = 600`, `REEL_MS = 500`, `POINTS_PER_CATCH = 20`

- [ ] **Step 1: Write the failing tests:**
  - `action while the float dips catches a fish`
  - `action before the dip scares it: no catch, and a new wait starts`
  - `a missed dip passes, then a new wait starts`
  - `the game ends at 15 s`
  - `score is 20 per catch, capped at 100, and 0 with no input`
- [ ] **Step 2:** Run `npx vitest run src/outings/fishing`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - Phases: `wait` (a random duration in `WAIT_MS`), then `bite` (`BITE_MS`), then `reel` (`REEL_MS`, which ignores input).
  - Render:
    - water as a blue band in the lower half;
    - the pet on the left bank;
    - the line and the float, which drops 4 logical px during `bite`;
    - the catch count.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5: Commit:** `feat: add the fishing game`

### Task 10: Hunting

**Files:** Create `src/outings/hunting/{logic,render}.ts`, `logic.test.ts`; modify `registry.ts`.

**Interfaces:**
- Produces: `huntingGame: OutingGame<HuntingState>`, with `TUFTS = 5`, `POP_EVERY_MS = 1000`, `POP_MS = [700, 450]` (the window shrinks linearly over the game), `POINTS_PER_CATCH = 10`
- `pickFromPointer` maps x to a tuft index 0..4. Keyboard left/right moves a cursor, and action picks it.

- [ ] **Step 1: Write the failing tests:**
  - `picking the tuft with the pop catches it`
  - `picking another tuft does nothing`
  - `a pop vanishes after its window`
  - `the cursor moves with left/right and action picks it`
  - `ends at 15 s`
  - `score is 10 per catch, capped at 100`
- [ ] **Step 2:** Run `npx vitest run src/outings/hunting`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - The thing that pops up is `food_meat` (20% of pops show `food_egg` instead, as a visual only; the haul is still decided by the engine).
  - A catch shows a small star burst. Nothing is hurt (Global Constraints).
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5: Commit:** `feat: add the hunting game`

### Task 11: Gathering

**Files:** Create `src/outings/gathering/{logic,render}.ts`, `logic.test.ts`; modify `registry.ts`.

**Interfaces:**
- Produces: `gatheringGame: OutingGame<GatheringState>`, with `BUSHES = 9` (3×3), `NUTS = 3`, `FLIPS = 4`, `SHAKE_EVERY_MS = 1200`, `SHAKE_MS = 300`
- `pickFromPointer` maps a tap to a bush 0..8. Keyboard left/right moves a cursor through 0..8 (wrapping), and action flips it.

- [ ] **Step 1: Write the failing tests:**
  - `init hides exactly 3 nuts in 9 bushes`
  - `only nut bushes shake, on the shake beat`
  - `flipping a nut bush finds it`
  - `flipping the same bush twice does not use a flip`
  - `the game ends after 4 flips or 15 s`
  - `score is round(found / 3 * 100)`
- [ ] **Step 2:** Run `npx vitest run src/outings/gathering`. Expected: FAIL.
- [ ] **Step 3: Implement.** A shaking bush is drawn 2 logical px to the side. A found nut shows `food_nuts`.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5: Commit:** `feat: add the gathering game`

---

### Task 12: Outing art and the art gate (Gate F)

**Files:**
- Create: `src/assets/ui/outing/{float,sprout,can}.png` (16×16), `src/assets/ui/outing/{grass,bush}.png` (32×32)
- Modify: `src/ui/assets.ts` (`OUTING_ART_IDS`, `OUTING_ART_SIZE`), `src/assets/assets.test.ts`, `docs/art/style-guide.md`

**Interfaces:**
- Produces: `OUTING_ART_IDS: readonly OutingArtId[]`, checked by the art guard test. `OutingPanel` uses `sprout` while a crop grows and `can` on the water button.

- [ ] **Step 1: Write the failing test.** In `assets.test.ts`, add `test.each(OUTING_ART_IDS)('outing art %s')` with `{ float: 16, sprout: 16, can: 16, grass: 32, bush: 32 }`, and add the files to `checkedPngs()`.
- [ ] **Step 2:** Run `npx vitest run src/assets`. Expected: FAIL (the files are missing).
- [ ] **Step 3: Art.** Call `get_balance` first; this step uses about 15 generations. Use `create_image_pixen`, 3 candidates each, with these prompts:
  - `a red and white fishing float, cute pixel icon, thick black outline, no face`
  - `a tuft of tall green grass, cute pixel art, thick black outline, no face`
  - `a round green bush, cute pixel art, thick black outline, no face`
  - `a small green sprout in soil, cute pixel icon, thick black outline, no face`
  - `a small blue watering can, cute pixel icon, thick black outline, no face`
  
  Snap the picks to the palette and check them.
- [ ] **Step 4:** Run `npx vitest run`. Expected: PASS.
- [ ] **Step 5: Gate F (blocking).** Show the owner, in Japanese, all new art at 4× on the companion page. That means the 5 ingredients, their bites, the outing icon and these 5 pieces. Apply what they ask for, keeping the tests green.
- [ ] **Step 6:** Add a "Pantry and outings" section to the style guide, with the prompts, the no-face rule and the sizes.
- [ ] **Step 7: Commit:** `feat(art): add the outing art` (plus `fix(art):` commits for the gate changes)

---

### Task 13: Real-extension tests and the play gate (Gate G)

**Files:**
- Modify: `e2e/popup.spec.ts` (and `e2e/fixtures.ts` if a seeding helper needs the kitchen)

- [ ] **Step 1: Write the e2e tests:**
  - `fishing to the end puts fish in the pantry`
    - open the outing panel and choose fishing;
    - wait out the 15 s game without input;
    - the gained note shows おさかな / Fish;
    - the food panel shows fish ×1 or more;
    - feeding fish lowers the count by 1.
  - `a ready farm can be harvested`: seed a save whose farm has veggie with `growMinLeft: 0`, harvest it, and see veggie ×2.
  - `fish is disabled in the food panel with an empty pantry`
- [ ] **Step 2:** Run `npx wxt build --mode e2e && npx playwright test`. Expected: all pass.
- [ ] **Step 3: Full check:** `npm run lint && npm run typecheck && npm run test:coverage`. Expected: all pass, with coverage about where it was.
- [ ] **Step 4: Gate G (blocking).**
  - Record GIFs from the e2e build, the way the care-effects gate did: fishing, hunting, gathering, planting → watering → harvesting (seeded), and the food panel with counts.
  - Show them to the owner in Japanese, apply what they ask for, and keep everything green.
- [ ] **Step 5: Commit:** `test: cover outings and the pantry in the real extension` (plus any `fix:` tuning commits)
