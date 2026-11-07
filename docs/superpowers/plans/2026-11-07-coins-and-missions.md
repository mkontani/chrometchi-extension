# Coins and Missions Implementation Plan (stage 1 of 5)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The pet earns coins. Coins come from the end of each generation, from zukan milestones and from three-step missions. The player can also sell ingredients in a new おみせ screen. The coin count shows under the weight. A new ミッション tab in the zukan lists the missions and the recent rewards, and the zukan button gets a dot when a reward arrives.

**Architecture:**
- **One new save section.** `progress` sits next to `kitchen`. It holds the coins, the mission counts, the rewards already claimed, the recent rewards and the unseen flag. Like the kitchen, it survives a new egg and a restart.
- **Pure rules.** `src/data/economy.ts` holds every number. `src/core/progress.ts` holds coins, missions and rewards. `src/core/shop.ts` holds selling.
- **Engine.** Each mutator reports which mission an `ok` action counts toward. After every operation (ticks included), `bookkeepProgress` does three things:
  - it pays for any ending;
  - it counts the mission;
  - it claims every reward that is now due.
  Claiming checks the claimed list, so it can run every time. That is also how an old save gets its zukan rewards on the first tick after the update.
- **Popup.**
  - The action bar becomes 5 columns. The もようがえ slot stays empty until stage 2.
  - A new おみせ button opens a full-screen overlay, like the zukan.
  - The status bar shows the coins.
  - The zukan gets a third tab.

**Tech Stack:** Preact, TypeScript, Zod 4, Vitest + @testing-library/preact (happy-dom), Playwright e2e, PixelLab MCP, pngjs art scripts.

**Spec:** `docs/superpowers/specs/2026-11-07-home-shop-and-new-forms-design.md`. This plan covers chapter 3 (stage 1), chapter 5, 11.1, 11.3 (the うる tab only), 11.4, and the stage-1 parts of 12 and 15.

**Later stages (not this plan):**
- Stage 2 (rooms) gives rooms from the same rewards.
- **Do not add room fields now.** Stage 2 works out the owned rooms from `progress.claimed` plus `zukan.memories.length > 0` (the first ending). That way the rooms reach players who already met a condition, as spec 3 requires.
- The 20–30 generation balance test (spec 5.2) needs the shop prices, so it is written in stage 3.

## Global Constraints

- **Coins.**
  - Integers from 0 to 99999 (`COINS_MAX`). Anything above the cap is lost.
  - Never negative.
  - Survives a new egg and a restart.
  - The status bar shows a coin icon and the number under the weight.
- **Rewards (spec 5.2, values verbatim):**
  - End of a generation: departed 100, died 30. Paid every generation. A restart pays nothing.
  - Zukan discoveries of 10, 20, 30, 40 and 50 pay 50 each. 60, 70 and 80 pay 100 each. `zukan.discovered.length` counts the egg and the baby too.
  - Each zukan or mission reward is paid once, ever.
- **Missions (spec appendix E, values verbatim):**

  | kind | tier 1 | tier 2 | tier 3 |
  |---|---|---|---|
  | clean | 10 → 30 | 30 → 80 | 100 → 200 |
  | play | 10 → 30 | 30 → 80 | 100 → 200 |
  | feed | 20 → 30 | 60 → 80 | 200 → 200 |
  | outing | 5 → 30 | 20 → 80 | 50 → 200 |
  | harvest | 3 → 30 | 10 → 80 | 30 → 200 |
  | cook | 5 → 30 | 20 → 80 | 50 → 200 |

  ("target count → coins")
  - **What counts.** Only results of `ok`:
    - care `clean` counts as clean;
    - care `play` (won or lost) counts as play;
    - care `feed`, any food, counts as feed;
    - `forage` counts as outing;
    - farm `harvest` counts as harvest;
    - `cook`, the mystery dish included, counts as cook.
  - Refused actions never count. Counts are lifetime counts.
- **Selling.**
  - Only the 8 ingredients can be sold, at these prices: nuts 1, mushroom 1, egg 1, fish 2, veggie 2, fruit 2, meat 3, shrimp 3.
  - Rice, candy and dishes are never sellable.
  - "1つうる" sells 1 and "ぜんぶうる" sells the whole stock.
  - There is no confirm dialog.
  - Selling works while the pet is asleep or an egg.
  - Asking to sell more than the stock is refused with `noStock`, and nothing changes.
- **The reward dot.**
  - Any paid reward (ending, zukan or mission) sets `unseen`.
  - Opening the ミッション tab clears it.
  - The tab lists up to 5 recent rewards, newest first.
- **Action bar (spec 11.1).**
  - 5 columns, 2 rows: `feed, play, outing, clean, [もようがえ — empty in stage 1] / medicine, lights, zukan, shop, settings`.
  - The popup stays 360×462.
- **Save format.**
  - Keep `version: 1` and `SAVE_KEY`.
  - A save without `progress` loads with empty progress, and nothing else changes (no data-reset notice).
  - Unknown claimed or recent ids are dropped.
- **Requests.** New requests are `sell` and `seenRewards`, both validated with zod. The popup never sets coins directly.
- **Art.**
  - The master palette, checked with `npx tsx scripts/art/check.ts --palette --size 16x16 <files>`.
  - A 1px black outline and a transparent background.
  - No faces on props, and no imitation of existing franchises.
  - Review at 4×.
- **PixelLab.** Use the free monthly quota only. Check `get_balance` first, and stop and ask the owner if `generations_remaining` < 100.
- **Repo rules.**
  - TDD, with each test watched failing first.
  - Coverage stays around where it is (at least 80%).
  - Functions < 50 lines, files < 800 lines.
  - Immutable updates, and no `console.log`.
  - UI text goes in both `public/_locales/ja` and `en`.
- **Commits.** Conventional format, **no attribution trailer** (owner rule). Never push, open a PR or merge without the owner's say-so.
- **Language.** Talk to the owner in Japanese. Code, comments and test names stay in English.

## Review Focus

1. **A reward claimed twice.** A tick and a request run back to back, or two popups are open.
   - Expected: each zukan or mission reward is paid exactly once.
   - Tested in Task 1 (`settleRewards pays each reward once`) and Task 3 (`a zukan milestone is paid once across a tick and a request`).
2. **A stale "ぜんぶうる".** Two popups are open, or the stock dropped after the screen drew.
   - Expected: the engine refuses with `noStock`, no coins change, and no count goes below 0.
   - Tested in Task 1 (`selling more than the stock is refused and changes nothing`) and Task 3 (`sell requests that are not a positive whole amount of an ingredient are rejected`).
3. **An old save on its first open after the update.** It has no `progress`, and it already has 23 discoveries and 2 memories.
   - Expected: it loads with no data-reset notice.
   - Expected: the first tick pays 50 + 50 coins (for 10 and 20) and sets the dot.
   - Expected: no ending is paid for the old memories.
   - Tested in Task 2 (`a save without progress loads with empty progress and keeps everything else`) and Task 3 (`an old save gets its zukan rewards on the first tick, once`).
4. **Coins at the cap.** The player has 99999 coins and sells a shrimp.
   - Expected: the coins stay 99999 and the shrimp is gone.
   - Tested in Task 1 (`coins never pass 99999 or go below 0`).
5. **A refused action.** The player cleans a clean floor, or feeds a full pet.
   - Expected: the mission count does not move.
   - Tested in Task 3 (`refused care does not count toward a mission`).

## File Structure

| File | Responsibility |
|---|---|
| `src/core/types.ts` | `MissionKind`, `RewardId`, `RecentReason`, `RecentReward`, `Progress`, the `sell` outcome |
| `src/data/economy.ts` (+ `src/data/data.test.ts`) | `COINS_MAX`, `RECENT_MAX`, `ENDING_COINS`, `ZUKAN_MILESTONES`, `MISSION_KINDS`, `MISSIONS`, `SELL_PRICE`, reward id helpers |
| `src/core/progress.ts` (+test) | `EMPTY_PROGRESS`, `addCoins`, `countMission`, `settleRewards`, `rewardEnding`, `markSeen`, `missionStatus` |
| `src/core/shop.ts` (+test) | `sellFood` |
| `src/storage/schema.ts`, `src/storage/repository.ts` (+tests) | `progress` in the save, with a default |
| `src/background/progress.ts` (+test), `src/background/engine.ts` (+test) | `bookkeepProgress`, mission reporting from mutators, the `sell` and `seenRewards` mutators |
| `src/messaging/protocol.ts` (+test) | the `sell` and `seenRewards` requests |
| `src/assets/ui/icons/{coin,shop}.png`, `src/ui/assets.ts` (+test) | the two new icons |
| `src/ui/components/{StatusBar,ActionBar,IconButton}.tsx` (+tests), `src/entrypoints/popup/style.css` | the coins, the 5-column bar, the dot |
| `src/ui/components/ShopView.tsx` (+test), `src/entrypoints/popup/App.tsx` (+test) | the おみせ overlay |
| `src/ui/components/MissionList.tsx` (+test), `src/entrypoints/popup/App.tsx` | the ミッション tab |
| `e2e/popup.spec.ts`, `README.md`, store screenshots | real-extension tests, docs |

---

### Task 1: Coins, missions, rewards and selling (pure rules)

**Files:**
- Modify: `src/core/types.ts`, `src/data/data.test.ts`
- Create: `src/data/economy.ts`, `src/core/progress.ts`, `src/core/progress.test.ts`, `src/core/shop.ts`, `src/core/shop.test.ts`

**Interfaces:**
- Produces (types, in `src/core/types.ts`):
  - `type MissionKind = 'clean' | 'play' | 'feed' | 'outing' | 'harvest' | 'cook'`
  - `type MissionTierNo = 1 | 2 | 3`
  - `type RewardId = \`zukan:${number}\` | \`mission:${MissionKind}:${MissionTierNo}\``
  - `type RecentReason = RewardId | 'ending:departed' | 'ending:dead'`
  - `interface RecentReward { reason: RecentReason; coins: number; at: number }`
  - `interface Progress { coins: number; counts: Record<MissionKind, number>; claimed: RewardId[]; recent: RecentReward[]; unseen: boolean }`. `recent` is newest first, at most `RECENT_MAX`.
  - `CareOutcome['action']` gains `'sell'`.
- Produces (`src/data/economy.ts`):
  - `COINS_MAX = 99999` and `RECENT_MAX = 5`
  - `ENDING_COINS = { departed: 100, dead: 30 } as const`
  - `ZUKAN_MILESTONES: readonly { count: number; coins: number }[]`, ascending
  - `MISSION_KINDS: readonly MissionKind[]`, in the table order
  - `MISSIONS: Readonly<Record<MissionKind, readonly { target: number; coins: number }[]>>`, 3 tiers each
  - `SELL_PRICE: Readonly<Record<IngredientId, number>>`
  - `zukanRewardId(count: number): RewardId`, `missionRewardId(kind: MissionKind, tier: MissionTierNo): RewardId`, and `REWARD_IDS: readonly RewardId[]` (every known one, zukan first, then the missions in kind and tier order)
- Produces (`src/core/progress.ts`):
  - `EMPTY_PROGRESS: Progress` (0 coins, all counts 0, empty lists, `unseen: false`)
  - `addCoins(p: Progress, n: number): Progress`, clamped to `[0, COINS_MAX]`
  - `countMission(p: Progress, kind: MissionKind): Progress` (+1)
  - `settleRewards(p: Progress, discovered: number, now: number): Progress`. It pays every reward that is due and not yet in `claimed`: zukan milestones in ascending order, then missions in `MISSION_KINDS` order and tier order. Each one adds coins, is pushed onto `recent`, and sets `unseen`. If nothing is due it returns `p` itself, the same object.
  - `rewardEnding(p: Progress, ending: 'departed' | 'dead', now: number): Progress`
  - `markSeen(p: Progress): Progress`
  - `missionStatus(p: Progress, kind: MissionKind): { count: number; tier: MissionTierNo | null; target: number; coins: number }`. `tier` is the next unclaimed tier, or null when all 3 are claimed. When it is null, `target` and `coins` are those of tier 3.
- Produces (`src/core/shop.ts`):
  - `sellFood(input: { pantry: Pantry; progress: Progress; food: IngredientId; amount: number }): { pantry: Pantry; progress: Progress; outcome: CareOutcome }`
  - The outcome is `{ action: 'sell', result: 'ok' }`, or `refused` with `noStock` when the stock is below `amount`.

- [ ] **Step 1: Write the failing tests.**
  - `src/data/data.test.ts`:
    - `the economy numbers match the spec`: the mission table above, `ZUKAN_MILESTONES` = [10:50, 20:50, 30:50, 40:50, 50:50, 60:100, 70:100, 80:100], `ENDING_COINS`, `COINS_MAX` and `RECENT_MAX`.
    - `only the 8 ingredients have a sell price, from 1 to 3`: keys equal `INGREDIENT_IDS`, and the exact prices above.
    - `REWARD_IDS lists 8 zukan and 18 mission rewards, without repeats`
  - `src/core/progress.test.ts`:
    - `coins never pass 99999 or go below 0`: `addCoins` at 99990 + 50 gives 99999, and 10 − 50 gives 0.
    - `settleRewards pays each reward once`: with `discovered` 23 → 100 coins, 2 recent, `claimed` has `zukan:10` and `zukan:20`, and `unseen` is true. Settling again with 23 returns the same object.
    - `a mission tier is paid when the count reaches its target`: clean ×9 → nothing. ×10 → 30 coins and `mission:clean:1`. ×30 → 80 more.
    - `a count past two targets pays both tiers in one settle`: counts `{ clean: 30 }` from empty → 110 coins, `mission:clean:1` and `:2`, 2 recent entries.
    - `recent keeps the 5 newest, newest first`: seven rewards in a row, and `recent[0]` is the last one paid.
    - `an ending pays 100 for departed and 30 for dead, every time`: two departures → 200, `recent[0].reason` is `'ending:departed'`, and nothing is added to `claimed`.
    - `markSeen clears unseen and keeps everything else`
    - `missionStatus shows the next tier, then null when all are done`: feed at 25 → tier 2, target 60, coins 80. All 3 claimed → tier null, target 200.
  - `src/core/shop.test.ts`:
    - `selling one fish adds 2 coins and takes one fish`
    - `selling all 4 shrimp adds 12 coins and empties the shrimp`
    - `selling more than the stock is refused and changes nothing`: `noStock`, and the same pantry and progress objects come back.
    - `selling at the coin cap still takes the item`
- [ ] **Step 2: Run** `npx vitest run src/data src/core/progress src/core/shop`. Expected: FAIL (missing modules and exports).
- [ ] **Step 3: Implement** the types, `economy.ts`, `progress.ts` and `shop.ts` with the signatures above. `sellFood` uses `stockOf` from `src/core/pantry.ts`. A count that reaches 0 removes the key, the way the pantry does today.
- [ ] **Step 4: Run** `npx vitest run && npm run typecheck`. Expected: all pass.
- [ ] **Step 5: Commit** `feat: add coins, missions, rewards and selling rules`

### Task 2: Progress in the save

**Files:**
- Modify: `src/storage/schema.ts`, `src/storage/schema.test.ts`, `src/storage/repository.ts`, `src/storage/repository.test.ts`

**Interfaces:**
- Consumes: `Progress`, `EMPTY_PROGRESS`, `REWARD_IDS`, `MISSION_KINDS` and `COINS_MAX` (Task 1).
- Produces: `SaveV1.progress: Progress`. `createFreshSave` sets it to `EMPTY_PROGRESS`.

- [ ] **Step 1: Write the failing tests.**
  - `schema.test.ts`:
    - `a save without progress loads with empty progress and keeps everything else`: parse a full save object with no `progress` key. The result has `EMPTY_PROGRESS`, and `game`, `zukan`, `kitchen` and `meta` are unchanged.
    - `progress with a missing mission count gets 0 for it`: `counts: { clean: 4 }` → clean 4, the rest 0.
    - `unknown claimed and recent ids are dropped`: `claimed: ['zukan:10', 'room:moon']`, and a recent `{ reason: 'mission:clean:9', … }` → only `zukan:10` is left and `recent` is empty.
    - `coins outside 0..99999 or not whole fail the progress parse`. A bad `progress` falls back the way a bad kitchen does today; follow the schema's existing pattern for that, and test the outcome the schema actually produces.
  - `repository.test.ts`: `a fresh save starts with empty progress`
- [ ] **Step 2: Run** `npx vitest run src/storage`. Expected: FAIL.
- [ ] **Step 3: Implement** the `progressSchema` with `z.preprocess` defaulting to `EMPTY_PROGRESS`, the same way `withEmptyKitchen` works.
  - `counts`: each kind defaults to 0.
  - `claimed`: drop unknown ids and repeats, and keep the first of each.
  - `recent`: drop entries with unknown reasons, and cut to `RECENT_MAX`.
  - Add it to `saveSchema`, `SaveV1` and `createFreshSave`.
  - Fix the call sites that build a `SaveV1` by hand: `npm run typecheck` lists them.
- [ ] **Step 4: Run** `npx vitest run && npm run typecheck`. Expected: all pass.
- [ ] **Step 5: Commit** `feat: keep coins and missions in the save`

### Task 3: The engine pays rewards, counts missions and sells

**Files:**
- Create: `src/background/progress.ts`, `src/background/progress.test.ts`
- Modify: `src/background/engine.ts`, `src/background/engine.test.ts`, `src/messaging/protocol.ts`, `src/messaging/protocol.test.ts`

**Interfaces:**
- Consumes: Task 1's rules and Task 2's `SaveV1.progress`.
- Produces:
  - `bookkeepProgress(save: SaveV1, input: { events: GameEvent[]; mission?: MissionKind; now: number }): SaveV1` in `src/background/progress.ts`. It applies these in order:
    - `rewardEnding` for each `died` (→ `'dead'`) or `departed` event;
    - `countMission`, if `mission` is set;
    - `settleRewards(progress, save.zukan.discovered.length, now)`.
    It returns `save` itself when nothing changed.
  - `Mutation` (in the engine) gains `mission?: MissionKind`. It is set only when the outcome is `ok`:
    - care `clean` → `'clean'`;
    - care `play` → `'play'`;
    - `feedMutator` → `'feed'`;
    - `forageMutator` → `'outing'`;
    - `farmMutator` with `op: 'harvest'` → `'harvest'`;
    - `cookMutator` → `'cook'`.
  - `runOperation` calls `bookkeepProgress(withZukan, { events, mission: mutation.mission, now })` after `unlockOnly`. `events` here means the advance events plus the mutation events. Save that result.
  - New requests:
    - `{ type: 'sell'; food: IngredientId; amount: number }`, where `food` is `z.enum(INGREDIENT_IDS)` and `amount` is `z.number().int().min(1).max(PANTRY_MAX)`. Its mutator calls `sellFood`, writes the kitchen pantry and the progress, and returns the outcome.
    - `{ type: 'seenRewards' }`. Its mutator calls `markSeen`.

- [ ] **Step 1: Write the failing tests.**
  - `src/background/progress.test.ts`:
    - `a departure pays 100 and sets the dot`
    - `a counted mission that reaches its target is paid in the same call`
    - `an old save gets its zukan rewards on the first tick, once`: 23 discovered and 2 memories, with `EMPTY_PROGRESS`, gives 100 coins. A second call with no events changes nothing. No ending is paid.
  - `engine.test.ts`:
    - `cleaning counts toward the clean mission`
    - `refused care does not count toward a mission`: a clean on a clean floor, and a feed when the pet is full.
    - `a harvest counts, planting does not`
    - `a forage and a cook each count once`
    - `a zukan milestone is paid once across a tick and a request`
    - `a pet that dies during a tick earns 30 coins once`. Reuse the existing death test setup in `engine.test.ts` or `advance.test.ts`.
    - `a restart pays nothing and keeps the coins`
    - `selling returns the outcome and saves the coins and the pantry`
    - `seenRewards clears the dot`
  - `protocol.test.ts`: `sell requests that are not a positive whole amount of an ingredient are rejected`. It covers `amount` 0, −1, 1.5 and 100, and `food` set to `rice`, `candy`, `steak` and `'gold'`.
- [ ] **Step 2: Run** `npx vitest run src/background src/messaging`. Expected: FAIL.
- [ ] **Step 3: Implement** as in the Interfaces block. Keep `engine.ts` under 300 lines: `bookkeepProgress` lives in `src/background/progress.ts`, and the new mutators are small functions like the existing ones.
- [ ] **Step 4: Run** `npx vitest run && npm run typecheck && npm run lint`. Expected: all pass.
- [ ] **Step 5: Commit** `feat: pay rewards, count missions and sell in the engine`

### Task 4: The coin and shop icons (Gate J)

**Files:**
- Create: `src/assets/ui/icons/coin.png`, `src/assets/ui/icons/shop.png` (16×16)
- Modify: `src/ui/assets.ts`, `src/ui/assets.test.ts`, `docs/art/style-guide.md`

**Interfaces:**
- Produces: `IconId` gains `'coin' | 'shop'`, and `ICON_IDS` lists both.

- [ ] **Step 1: Write the failing test.** Add both ids to `ICON_IDS`. The existing `every UI id resolves to a shipped file` test then fails.
- [ ] **Step 2: Run** `npx vitest run src/ui/assets`. Expected: FAIL (missing files).
- [ ] **Step 3: Make the art.**
  - Call PixelLab `get_balance` first.
  - Use `create_image_pixen` at 16×16 with `no_background true`, `outline 'single color black outline'` and `detail 'low detail'`. Make 3 candidates (seeds 1–3).
  - Prompts:
    - coin: `a shiny round gold coin with a small star stamped in the middle, cute pixel icon, thick black outline, simple, front view, no face`
    - shop: `a tiny market stall with a pink and white striped awning, cute pixel icon, thick black outline, simple, front view, no face`
  - Read every candidate at 4× next to today's `feed`, `zukan` and `settings` icons.
  - Reject faces, unreadable shapes at 16px, and anything off-style.
  - Snap the pick with `reduce_colors` and `docs/art/palette.png`, and fix any non-black edge pixel by hand.
  - Verify: `npx tsx scripts/art/check.ts --palette --size 16x16 src/assets/ui/icons/coin.png src/assets/ui/icons/shop.png` exits 0.
- [ ] **Step 4: Run** `npx vitest run`. Expected: all pass.
- [ ] **Step 5: Style guide.** Add a "Coins and shop" section with the prompts, the seeds that were picked, and any hand fixes.
- [ ] **Step 6: Commit** `feat: add the coin and shop icons`
- [ ] **Step 7: Gate J (blocking; run by the controller).**
  - Show the owner the two icons at 4× beside the 8 current action icons.
  - Apply what they ask for, and keep everything green.

### Task 5: Coins in the status bar, the 5-column action bar and the dot

**Files:**
- Modify: `src/ui/components/StatusBar.tsx`, `src/ui/components/ActionBar.tsx`, `src/ui/components/IconButton.tsx` (+ their tests, or create `StatusBar.test.tsx` / `ActionBar.test.tsx` where they are missing), `src/entrypoints/popup/App.tsx`, `src/entrypoints/popup/style.css`, `public/_locales/{ja,en}/messages.json`

**Interfaces:**
- Consumes: `SaveV1.progress` (Task 2) and `iconUrl('coin' | 'shop')` (Task 4).
- Produces:
  - `StatusBar({ pet, coins }: { pet: PetState; coins: number })`
  - `type ActionKind = … | 'shop'`
  - `ActionBar({ pet, badge, onSelect }: { pet: PetState; badge: boolean; onSelect(kind: ActionKind): void })`
  - `IconButton` gains `badge?: boolean`. It draws a small dot, and the aria-label becomes `` `${label} ${t('new_rewards')}` ``.
- Messages (ja / en):
  - `action_shop`: おみせ / Shop
  - `stat_coins`: コイン / Coins
  - `new_rewards`: あたらしいごほうび / New rewards

- [ ] **Step 1: Write the failing tests.**
  - `StatusBar shows the coins under the weight`: the number, an element labelled `stat_coins`, and the coin icon.
  - `the action bar has 5 columns with an empty slot for the stage-2 button`: the button labels in order are feed, play, outing, clean, medicine, lights, zukan, shop, settings. The slot between clean and medicine is an `aria-hidden` spacer.
  - `the shop button is never disabled`: asleep, egg.
  - `the zukan button shows a dot when there are new rewards`: `badge` true → dot and the longer aria-label. false → neither.
- [ ] **Step 2: Run** `npx vitest run src/ui/components`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - `ActionBar` renders a slot list `['feed','play','outing','clean',null,'medicine','lights','zukan','shop','settings']`. `null` is a spacer.
  - CSS: `.action-bar { grid-template-columns: repeat(5, 1fr); }`. Add a coin row under `.status-weight`, and a 6px pink dot with an ink border in the top-right corner of `.icon-button`.
  - `MainScreen` passes `coins={save.progress.coins}` and `badge={save.progress.unseen}`.
  - The bar must not change the popup height: two rows of 56px, as today.
- [ ] **Step 4: Run** `npx vitest run && npm run typecheck && npm run lint`. Expected: all pass.
- [ ] **Step 5: Commit** `feat: show coins and add the shop button`

### Task 6: The おみせ overlay (selling)

**Files:**
- Create: `src/ui/components/ShopView.tsx`, `src/ui/components/ShopView.test.tsx`
- Modify: `src/entrypoints/popup/App.tsx`, `src/entrypoints/popup/App.test.tsx`, `src/entrypoints/popup/style.css`, `public/_locales/{ja,en}/messages.json`

**Interfaces:**
- Consumes: `SELL_PRICE` and `INGREDIENT_IDS`, the `sell` request (Task 3), and `countLabel` from `src/ui/components/foodGrid.tsx`.
- Produces:
  - `ShopView({ pantry, coins, onSell }: { pantry: Pantry; coins: number; onSell(food: IngredientId, amount: number): void })`
  - `Panel` gains `'shop'`, and the `InfoOverlay` kind gains `'shop'`.
- Messages (ja / en):
  - `shop_title`: おみせ / Shop
  - `shop_sell`: うる / Sell (the section heading; stage 3 turns it into a tab)
  - `shop_coins`: もっているコイン $1 / Coins: $1
  - `shop_sell_one`: 1つうる / Sell 1
  - `shop_sell_all`: ぜんぶうる / Sell all
  - `coins_aria`: $1コイン / Coins: $1 (the screen-reader text for a coin icon + number)

- [ ] **Step 1: Write the failing tests** (`ShopView.test.tsx`):
  - `lists the 8 ingredients with their stock and price`: a row per ingredient, in `INGREDIENT_IDS` order, showing the icon, the name, `×n` and the price as the coin icon + number.
  - `"1つうる" sends one, "ぜんぶうる" sends the whole stock`: fish ×4 → `onSell('fish', 1)`, then `onSell('fish', 4)`.
  - `an ingredient with no stock cannot be sold`: both buttons are disabled.
  - `shows the coins the player has`
  - In `App.test.tsx`: `the shop button opens the shop overlay and selling sends a sell request`
- [ ] **Step 2: Run** `npx vitest run src/ui/components/ShopView src/entrypoints`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - A full-screen `Overlay` titled `shop_title`, with the coins line and then the rows.
  - The list scrolls inside the overlay, like the recipe book.
  - Stage 1 has no tabs. Stage 3 adds かぐ and アクセサリー in front of うる.
  - A refused sell shows nothing extra. The rows redraw from the returned save.
- [ ] **Step 4: Run** `npx vitest run && npm run typecheck && npm run lint`. Expected: all pass.
- [ ] **Step 5: Commit** `feat: sell ingredients in the shop`

### Task 7: The ミッション tab

**Files:**
- Create: `src/ui/components/MissionList.tsx`, `src/ui/components/MissionList.test.tsx`
- Modify: `src/entrypoints/popup/App.tsx`, `src/entrypoints/popup/App.test.tsx`, `src/entrypoints/popup/style.css`, `public/_locales/{ja,en}/messages.json`

**Interfaces:**
- Consumes: `missionStatus`, `MISSION_KINDS` and `MISSIONS` (Task 1), and the `seenRewards` request (Task 3).
- Produces:
  - `MissionList({ progress }: { progress: Progress })`
  - `rewardReasonText(reason: RecentReason): string` (exported for tests)
  - `ZukanTab` gains `'missions'`.
- Messages (ja / en):
  - `zukan_tab_missions`: ミッション / Missions
  - `mission_clean` そうじ / Clean; `mission_play` あそぶ / Play; `mission_feed` ごはん / Feed; `mission_outing` おでかけ / Go out; `mission_harvest` しゅうかく / Harvest; `mission_cook` りょうり / Cook
  - `mission_progress`: $1 / $2かい / $1 / $2
  - `mission_done`: ぜんぶ たっせい / All done
  - `rewards_recent`: さいきんの ごほうび / Recent rewards
  - `reward_departed`: たびだちの ごほうび / A happy send-off
  - `reward_dead`: おわかれの ごほうび / A farewell
  - `reward_zukan`: ずかんで $1たい / $1 in the zukan
  - `reward_mission`: $1 $2かい / $1 ×$2

- [ ] **Step 1: Write the failing tests.**
  - `MissionList.test.tsx`:
    - `each mission shows its next target and reward`: clean at 12 → `12 / 30かい` (in the test locale's form) and the coin icon + 80.
    - `a finished mission says all done`
    - `recent rewards are listed newest first, and the section is hidden when empty`
    - `rewardReasonText names each kind of reward`: `zukan:10`, `mission:feed:2` (uses target 60), `ending:departed`, `ending:dead`.
  - `App.test.tsx`:
    - `opening the missions tab sends seenRewards when there is a dot`
    - `opening the missions tab sends nothing when there is no dot`
- [ ] **Step 2: Run** `npx vitest run src/ui/components/MissionList src/entrypoints`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - The tab order is ペット, レシピ, ミッション.
  - `ZukanTabs` takes `send` and sends `seenRewards` when switching to `missions` while `save.progress.unseen` is true.
  - Rows: name, progress, reward. They use the recipe book's row style.
- [ ] **Step 4: Run** `npx vitest run && npm run typecheck && npm run lint`. Expected: all pass.
- [ ] **Step 5: Commit** `feat: add the missions tab to the zukan`

### Task 8: Real-extension tests, the play gate (Gate K) and docs

**Files:**
- Modify: `e2e/popup.spec.ts` (and `e2e/fixtures.ts` if a seeding helper helps), `README.md`, and the store screenshots that `npm run screenshots` writes

- [ ] **Step 1: Write the e2e tests.**
  - `selling a fish in the shop adds 2 coins`:
    - Seed a pantry of `{ fish: 2 }`.
    - Open おみせ, then tap 1つうる on fish.
    - The fish shows ×1, and the coins line shows 2.
    - After closing, the status bar shows 2.
  - `the tenth clean pays the first clean reward and lights the dot`:
    - Seed `progress.counts.clean = 9` and a pet with a poop.
    - Clean.
    - The status bar shows 30 and the zukan button has the dot.
    - The ミッション tab lists the reward.
    - After the tab is opened, the dot is gone.
  - `an old save without progress gets its zukan coins`:
    - Seed a save with no `progress` key and 12 discoveries.
    - Open the popup.
    - The status bar shows 50 and the dot is lit.
- [ ] **Step 2: Run** `npx wxt build --mode e2e && npx playwright test`. Expected: all pass.
- [ ] **Step 3: Full check:** `npm run lint && npm run typecheck && npm run test:coverage`. Expected: all pass, with coverage about where it was.
- [ ] **Step 4: README.** In Features:
  - Add after the Cooking bullet: `**Coins and missions**: coins come from each generation's send-off, zukan milestones, missions (cleaning, playing, feeding, outings, harvests, cooking) and selling ingredients in the shop.`
  - Change the Zukan bullet so it ends `…, your recipe book and your missions.`
- [ ] **Step 5: Screenshots.**
  - Run `npm run screenshots` and read every image it writes.
  - Each one shows the 5-column bar, the coin count, and the empty slot.
- [ ] **Step 6: Gate K (blocking; run by the controller).**
  - Record GIFs in ja from the e2e build:
    - selling one and all;
    - the tenth clean paying out, with the dot appearing and clearing;
    - an old save's first open.
  - Also show the new bar at 1× (360px wide).
  - Show them to the owner, apply what they ask for, and keep everything green.
- [ ] **Step 7: Commit** `test: cover coins and missions in the real extension` and `docs: describe coins and missions, refresh the store screenshots` (plus any `fix:` commits from the gates)
