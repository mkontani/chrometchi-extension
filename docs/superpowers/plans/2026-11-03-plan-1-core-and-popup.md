# Chrometchi Rebuild — Plan 1: Game Core, Background & Popup

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the v0.0.2 vanilla-JS extension with a WXT + TypeScript + Preact rebuild that implements the full new gameplay (time model, care, 42-form evolution, warnings/death rule, zukan, settings, three mini-games, notifications) using placeholder art.

**Architecture:** All game rules live in `src/core/` as pure, immutable functions with injected time and RNG. The MV3 service worker owns the save: every mutation (alarm tick or popup request) runs through one serialized engine in `src/background/`. The Preact popup only renders the save and sends typed requests. Art is resolved through one asset registry with placeholder fallback, so Plan 2 can drop real PNGs in without code changes.

**Tech Stack:** WXT 0.21, TypeScript 6.0, Preact 10, Zod 4, Vitest 5 (+ happy-dom, @testing-library/preact, WxtVitest fake-browser), Playwright 1.64, ESLint 10 + typescript-eslint 8, @fontsource/dotgothic16.

**Spec:** `docs/superpowers/specs/2026-11-03-chrometchi-rebuild-design.md`

**Sibling plans:** Plan 2 (`2026-11-03-plan-2-art.md`) produces the art and depends on Task 2 here (cast data). Plan 3 (roaming) will be written later.

## Global Constraints

- Chrome Manifest V3. No remote code, no remote fonts or images. Everything is bundled.
- Permissions are exactly `storage`, `alarms`, `notifications`, `idle`. Add no host permissions in this plan.
- Extension version `1.0.0`. It ships as an update to the existing store listing.
- The popup is about 360×560 (the Chrome maximum is 800×600).
- Sprites are 32×32 PNGs. They are shown at integer scale (4× = 128px) with `image-rendering: pixelated`.
- UI text is Japanese and English via `chrome.i18n` (`public/_locales/{ja,en}`), with `default_locale: "en"`. Never hardcode user-facing strings in components.
- Character names must be original. No `-tchi`/`-っち` suffix and no names from existing franchises.
- The font is DotGothic16, bundled via `@fontsource/dotgothic16`.
- Sound effects default to OFF.
- Legacy storage keys are `chrometchiState`, `chrometchiCatalog`, `chrometchiSettings`. When found, delete them and show the renewal notice once. Do not migrate them.
- Time only advances while Chrome is running and the screen is not locked. A gap over 3 minutes between ticks counts as 0 minutes.
- Death happens only after the critical warning has been displayed in the popup, plus 60 more awake minutes without recovery.
- Rules: immutable updates only (return new objects). Functions under 50 lines, files under 800 lines. No `console.log` in shipped code. Tests come first in every task (TDD). Coverage is at least 80% (lines, branches, functions, statements) over `src/` excluding `src/entrypoints/**`, `src/games/*/render.ts`, `**/__fixtures__/**`.
- Unit tests run with `TZ=UTC` (set in `vitest.config.ts`).
- Commit messages use conventional format (`feat:`, `test:`, `chore:` …).

## Review Focus

1. **System clock jumps backwards or far forward.** For example, DST, a manual clock change, or waking from sleep. The tick must count 0 minutes and must not throw or produce negative stats. Test: Task 3 `consumeElapsed` cases `now < lastTickAt` and `gap > 3min`.
2. **Sleep windows that do or don't cross midnight, and start == end.** 22:00–07:00, 01:00–06:00, and equal values. Equal values mean "never sleeps" and are a valid setting (the schema accepts any integers 0..1439). Test: Task 3 `isSleepTime` table.
3. **Popup action and alarm tick arriving at the same time.** No lost update: both effects must be in the final save. Test: Task 11 `engine serializes concurrent requests`.
4. **Corrupted, partial, or future-version save.** For example `version: 2`, missing fields, or a string where a number belongs. Load must reset to a fresh save with `showDataReset: true` and must not throw. Test: Task 10 repository cases.
5. **Malformed or foreign runtime messages.** Unknown `type`, wrong field types, or a sender that isn't this extension. These must be rejected with `{ ok: false }` and leave the save unchanged. Test: Task 11 `parseEngineRequest` and Task 12 sender check.

---

## File Structure

```
wxt.config.ts                 WXT config (srcDir, manifest, preact plugin)
vitest.config.ts              unit tests, TZ=UTC, coverage thresholds
playwright.config.ts          e2e config
eslint.config.js              flat config
tsconfig.json                 extends .wxt/tsconfig.json, preact JSX
public/_locales/{ja,en}/messages.json
public/icon/{16,48,128}.png   moved from src/assets/icons
src/core/                     pure game rules (no browser APIs)
  types.ts constants.ts rng.ts clock.ts factory.ts warnings.ts
  needs.ts hygiene.ts sleep.ts vitality.ts evolution.ts growth.ts
  step.ts advance.ts care.ts lifecycle.ts
  __fixtures__/pet.ts         makePet()/makeGame() test helpers
src/data/                     tables: forms.ts foods.ts games.ts
src/storage/                  schema.ts repository.ts
src/messaging/protocol.ts     EngineRequest/Response + zod parsing
src/background/               queue.ts engine.ts notifier.ts badge.ts
src/entrypoints/background.ts wiring to real browser APIs
src/entrypoints/popup/        index.html main.tsx App.tsx style.css
src/i18n/t.ts
src/ui/                       api.ts useGame.ts assets.ts sound.ts components/*.tsx
src/games/                    types.ts {catch,cups,stop}/{logic,render}.ts
src/assets/sprites/_placeholder/idle0.png
e2e/                          fixtures.ts popup.spec.ts
```

Delete: `manifest.json`, `.eslintrc.json`, `src/background.js`, `src/logic/`, `src/popup/`, `src/test/`, `src/assets/sprites/*.svg`, `src/assets/icons/` (after moving).

---

### Task 1: Scaffold WXT project and remove legacy code

**Files:**
- Create: `wxt.config.ts`, `vitest.config.ts`, `eslint.config.js`, `tsconfig.json`, `src/entrypoints/background.ts` (stub), `src/entrypoints/popup/{index.html,main.tsx,App.tsx}` (stub "Chrometchi"), `public/_locales/{ja,en}/messages.json` (`appName`, `appDescription`), `src/core/smoke.test.ts`
- Move: `src/assets/icons/icon{16,48,128}.png` → `public/icon/{16,48,128}.png`
- Modify: `package.json` (version `1.0.0`, `"type": "module"`, scripts, deps), `.gitignore` (add `.output/`, `.wxt/`, `coverage/`, `test-results/`, `playwright-report/`)
- Delete: legacy files listed above

**Interfaces:**
- Produces: npm scripts `dev`, `build` (`wxt build`), `zip` (`wxt zip`), `postinstall` (`wxt prepare`), `typecheck` (`tsc --noEmit`), `lint` (`eslint .`), `test` (`vitest run`), `test:coverage` (`vitest run --coverage`), `e2e` (`playwright test`).

- [ ] **Step 1: Install dependencies**

```bash
npm pkg set version=1.0.0 type=module
npm i preact@^10.29.8 zod@^4.6.7 @fontsource/dotgothic16@^5.3.1
npm i -D wxt@^0.21.5 vite@^8.3.5 @preact/preset-vite@^2.10.6 @babel/core@^7 typescript@~6.0.3 \
  vitest@^5.1.0 @vitest/coverage-v8@^5.1.0 happy-dom@^21.0.4 @testing-library/preact@^3.2.6 \
  @playwright/test@^1.64.1 eslint@^10.14.0 typescript-eslint@^8.72.1 @types/node
npm uninstall eslint@8 2>/dev/null || true
```

- [ ] **Step 2: Write configs**

`wxt.config.ts`: `srcDir: 'src'`, `vite: () => ({ plugins: [preact()] })`, `manifest: { name: '__MSG_appName__', description: '__MSG_appDescription__', default_locale: 'en', permissions: ['storage','alarms','notifications','idle'], action: { default_title: '__MSG_appName__' } }`.
`vitest.config.ts`: set `process.env.TZ = 'UTC'` at the top. Use `plugins: [WxtVitest()]` (from `wxt/testing/vitest-plugin`) and `test.environment: 'happy-dom'`. Set coverage `provider: 'v8'`, with include/exclude from Global Constraints and thresholds of 80 for all four metrics.
`tsconfig.json`: extend `./.wxt/tsconfig.json` and add `"jsx": "react-jsx", "jsxImportSource": "preact", "strict": true`.
`eslint.config.js`: use `typescript-eslint` `recommended`, add the rule `no-console: error`, and ignore `.output`, `.wxt`, `coverage`.

- [ ] **Step 3: Write smoke test** `src/core/smoke.test.ts`: `expect(new Date(0).getTimezoneOffset()).toBe(0)` (this proves TZ=UTC).

- [ ] **Step 4: Verify**

Run: `npm run lint && npm run typecheck && npm test && npm run build && node -e "const m=require('./.output/chrome-mv3/manifest.json');console.log(m.version,m.permissions.join(','),m.action.default_popup)"`
Expected: all pass, and the last line prints `1.0.0 storage,alarms,notifications,idle popup.html`.

- [ ] **Step 5: Commit** — `chore: scaffold WXT + TypeScript + Preact project and remove legacy code`

---

### Task 2: Core types, constants, data tables, i18n names

**Files:**
- Create: `src/core/types.ts`, `src/core/constants.ts`, `src/data/{forms,foods,games}.ts`, `src/core/__fixtures__/pet.ts`, `src/data/data.test.ts`
- Modify: `public/_locales/{ja,en}/messages.json`

**Interfaces — Produces (all later tasks use these names exactly):**

```ts
// src/core/types.ts
export type Stage = 'egg' | 'baby' | 'child' | 'young' | 'adult';
export type FormId = string;
export type FoodId = 'rice' | 'meat' | 'fish' | 'veggie' | 'cake' | 'candy';
export type FoodTag = 'grain' | 'meat' | 'fish' | 'veggie' | 'sweet';
export type GameId = 'catch' | 'cups' | 'stop';
export type Family = 'none' | 'solar' | 'lunar' | 'earth' | 'water' | 'wind' | 'metal' | 'ether' | 'heavy';
export type Lifecycle = 'alive' | 'dead' | 'departed';
export type WarningLevel = 'none' | 'notice' | 'danger' | 'critical';
export type Pose = 'idle0' | 'idle1' | 'happy' | 'eat' | 'sick' | 'sleep' | 'sad';
export type IdleState = 'active' | 'idle' | 'locked';
export type MistakeReason = 'hunger' | 'mood' | 'poop' | 'lights';
export type Rng = () => number; // [0,1)

export interface Stats { hunger: number; mood: number; vitality: number; weight: number } // 0..100 except weight ≥1
export interface Episodes { hungerZeroMin: number; moodZeroMin: number; poopMin: number; lightsOnAsleepMin: number;
  hungerMistakeTaken: boolean; moodMistakeTaken: boolean; lightsMistakeTaken: boolean }
export interface CareHistory { totalMistakes: number; stageMistakes: number;
  foodCounts: Record<FoodTag, number>; gameCounts: Record<GameId, number> } // counts are per stage
export interface PetState {
  formId: FormId; stage: Stage; lifecycle: Lifecycle; stats: Stats;
  awakeMinutes: number; stageMinutes: number;
  poops: number; poopTimers: number[]; sick: boolean; medicineNeeded: number;
  sugar: number; sugarDecayMin: number;
  asleep: boolean; lightsOn: boolean;
  lastPetAt: number | null; criticalSeenAt: number | null; // both in awakeMinutes
  episodes: Episodes; history: CareHistory; path: FormId[];
}
export interface GameState { pet: PetState; generation: number; lastTickAt: number }
export interface Settings { notifications: boolean; sound: boolean; sleepStartMin: number; sleepEndMin: number }
export interface Memory { generation: number; finalForm: FormId; path: FormId[]; awakeMinutes: number; ending: 'dead' | 'departed'; endedAt: number }
export interface Zukan { discovered: FormId[]; memories: Memory[] }
export type GameEvent =
  | { type: 'hatched'; to: FormId } | { type: 'evolved'; from: FormId; to: FormId }
  | { type: 'hungry' } | { type: 'unhappy' } | { type: 'pooped' } | { type: 'sick' }
  | { type: 'warning'; level: WarningLevel } | { type: 'mistake'; reason: MistakeReason }
  | { type: 'fellAsleep' } | { type: 'wokeUp' } | { type: 'died' } | { type: 'departed' };
export interface StepResult { pet: PetState; events: GameEvent[] }
export interface EvolutionCondition {
  minStageMistakes?: number; maxStageMistakes?: number; maxTotalMistakes?: number;
  dominantFood?: FoodTag[]; dominantGame?: GameId; weight?: 'light' | 'normal' | 'heavy';
  hours?: [number, number]; chance?: number; // hours: local [start,end)
}
export interface FormDef { id: FormId; stage: Stage; family: Family; from: FormId[]; when: EvolutionCondition; priority: number; motif: string }
export interface FoodDef { id: FoodId; tag: FoodTag; kind: 'meal' | 'snack'; hunger: number; mood: number; weight: number; vitality: number }
export type CareAction =
  | { kind: 'feed'; food: FoodId } | { kind: 'play'; game: GameId; won: boolean }
  | { kind: 'clean' } | { kind: 'medicine' } | { kind: 'lights'; on: boolean } | { kind: 'pet' };
export type RefuseReason = 'full' | 'notSick' | 'asleep' | 'notAlive' | 'egg' | 'cooldown' | 'noPoop';
export interface CareOutcome { action: CareAction['kind']; result: 'ok' | 'refused'; reason?: RefuseReason }
export interface CareResult { pet: PetState; outcome: CareOutcome; events: GameEvent[] }
```

`src/core/constants.ts` (starting values; balance test in Task 8 must pass with them):

| Name | Value |
|---|---|
| `TICK_MAX_GAP_MS` | `3 * 60_000` |
| `STAGE_MINUTES` | `{ egg: 30, baby: 120, child: 360, young: 900, adult: 1440 }` (adult value = minutes until departure) |
| `HUNGER_DECAY` | `{ egg: 0, baby: 0.8, child: 0.5, young: 0.4, adult: 0.35 }` per awake minute |
| `MOOD_DECAY` | `{ egg: 0, baby: 0.6, child: 0.4, young: 0.35, adult: 0.3 }` |
| `VITALITY` | `{ zeroNeedLoss: 0.5, sickLoss: 0.5, recover: 0.2, recoverAbove: 50 }` |
| `MISTAKE_AFTER_MIN` | `15` |
| `POOP` | `{ delayMin: 30, max: 4, sickAfterMin: 120 }` |
| `SUGAR` | `{ sickAt: 3, decayEveryMin: 60 }` |
| `MEDICINE_DOSES` | `2` |
| `PET_ACTION` | `{ cooldownMin: 10, mood: 5 }` |
| `PLAY` | `{ winMood: 30, loseMood: 10, weightLoss: 1 }` |
| `EVOLVE_MOOD_BONUS` | `20` |
| `WARNING` | `{ danger: 50, critical: 25 }` (vitality ≤) |
| `DEATH_GRACE_MIN` | `60` |
| `LIGHTS_MISTAKE_MOOD` | `10` |
| `BASE_WEIGHT` | `{ egg: 1, baby: 5, child: 10, young: 20, adult: 30 }`; heavy ≥ base×1.5, light ≤ base×0.8 |
| `DEFAULT_SETTINGS` | `{ notifications: true, sound: false, sleepStartMin: 1320, sleepEndMin: 420 }` |
| `NOTIFY_THROTTLE_MS` | `30 * 60_000` |

`src/data/foods.ts` — `FOODS: readonly FoodDef[]`:

| id | tag | kind | hunger | mood | weight | vitality |
|---|---|---|---|---|---|---|
| rice | grain | meal | 35 | 0 | 1 | 0 |
| meat | meat | meal | 40 | 5 | 2 | 0 |
| fish | fish | meal | 35 | 0 | 1 | 3 |
| veggie | veggie | meal | 25 | -5 | 0 | 5 |
| cake | sweet | snack | 10 | 30 | 3 | 0 |
| candy | sweet | snack | 5 | 20 | 1 | 0 |

`src/data/games.ts` — `GAMES: readonly GameId[] = ['catch','cups','stop']`.

`src/data/forms.ts` — `FORMS: readonly FormDef[]`, 42 entries. `motif` is the English creature description that Plan 2 uses in prompts. Write one short phrase that fits the family. Conditions (`{}` = fallback):

| id | stage | family | from | when | priority |
|---|---|---|---|---|---|
| egg | egg | none | – | {} | 0 |
| baby_puni | baby | none | egg | {} | 0 |
| child_kemu | child | lunar | baby_puni | minStageMistakes 3 | 90 |
| child_dango | child | heavy | baby_puni | weight heavy | 80 |
| child_hoshi | child | ether | baby_puni | maxStageMistakes 0 | 70 |
| child_mochi | child | none | baby_puni | {} | 0 |
| young_kirari | young | ether | child_hoshi | maxStageMistakes 0 | 100 |
| young_kage | young | lunar | child_mochi, child_kemu, child_dango | minStageMistakes 3 | 90 |
| young_poyo | young | heavy | child_dango, child_mochi | weight heavy | 80 |
| young_hinoko | young | solar | child_hoshi, child_mochi, child_dango | dominantFood [meat] | 50 |
| young_shizuku | young | water | child_hoshi, child_mochi, child_kemu | dominantFood [fish] | 50 |
| young_mebuki | young | earth | child_mochi, child_kemu, child_dango | dominantFood [veggie, grain] | 50 |
| young_fuwari | young | wind | child_hoshi, child_mochi | dominantFood [sweet] | 50 |
| young_gear | young | metal | child_hoshi, child_mochi, child_kemu, child_dango | {} | 0 |

Adults: each young has three adults. The first matches `dominantGame: 'catch'` (priority 50), the second matches `dominantGame: 'cups'` (priority 50), and the third is the `{}` fallback (priority 0). Hidden adults use priority 100.

| young | catch | cups | fallback | hidden (condition) |
|---|---|---|---|---|
| young_hinoko | adult_dragon | adult_beast | adult_salamander | adult_phoenix (maxStageMistakes 0, chance 0.3) |
| young_shizuku | adult_serpent | adult_turtle | adult_kraken | – |
| young_mebuki | adult_golem | adult_mole | adult_tree | – |
| young_fuwari | adult_griffin | adult_owl | adult_pegasus | – |
| young_gear | adult_robot | adult_ufo | adult_cyborg | – |
| young_kage | adult_ghost | adult_alien | adult_bat | adult_vampire (minStageMistakes 6, hours [18,22]) |
| young_kirari | adult_unicorn | adult_comet | adult_nexus | adult_astra (maxTotalMistakes 0) |
| young_poyo | adult_bear | adult_hippo | adult_slime | adult_kingslime (weight heavy, chance 0.3) |

Adults inherit their young's family. `messages.json` (ja and en) gains `form_<id>` for all 42 forms (original names; see Global Constraints), plus `food_<id>` ×6 and `game_<id>` ×3.

`src/core/__fixtures__/pet.ts`: `makePet(overrides?: Partial<PetState> & { stats?: Partial<Stats> }): PetState` (an alive `baby_puni` with full stats, awake, lights on, empty counters) and `makeGame(overrides?: Partial<GameState>): GameState`.

- [ ] **Step 1: Write failing tests** `src/data/data.test.ts`:

```ts
test('form ids are unique and there are 42 forms', () => { expect(new Set(FORMS.map(f => f.id)).size).toBe(42) })
test('every non-adult form has ≥2 children and exactly one {} fallback', ...)
test('every `from` id refers to an existing form of the previous stage', ...)
test('4 hidden adults have priority 100', () => expect(FORMS.filter(f => f.priority === 100 && f.stage === 'adult')).toHaveLength(4))
test('ja and en messages have identical key sets', ...)            // read both JSON files
test('every form, food and game has a message in both locales', ...)
test('no form name ends with っち or tchi', ...)
```

- [ ] **Step 2: Run** `npm test -- src/data` and confirm it fails (modules not found).
- [ ] **Step 3: Implement** types, constants, tables, fixtures and messages as specified.
- [ ] **Step 4: Run** `npm test -- src/data && npm run typecheck` and confirm PASS.
- [ ] **Step 5: Commit** — `feat: add core types, tuning constants and 42-form cast data`

---

### Task 3: RNG and clock

**Files:** Create `src/core/rng.ts`, `src/core/clock.ts`, `src/core/clock.test.ts`, `src/core/rng.test.ts`

**Interfaces — Produces:**
- `createRng(seed: number): Rng` (mulberry32; same seed → same sequence)
- `consumeElapsed(lastTickAt: number, now: number, maxGapMs: number): { minutes: number; nextTickAt: number }`
- `minuteOfDay(ms: number): number` (local time, 0..1439)
- `isSleepTime(minute: number, startMin: number, endMin: number): boolean`

- [ ] **Step 1: Write failing tests**

```ts
test('consumes whole minutes and keeps the remainder', () =>
  expect(consumeElapsed(0, 150_000, 180_000)).toEqual({ minutes: 2, nextTickAt: 120_000 }))
test('gap above max counts as zero', () =>
  expect(consumeElapsed(0, 180_001, 180_000)).toEqual({ minutes: 0, nextTickAt: 180_001 }))
test('clock moved backwards counts as zero', () =>
  expect(consumeElapsed(500_000, 100_000, 180_000)).toEqual({ minutes: 0, nextTickAt: 100_000 }))
test.each([
  [1320, 1320, 420, true], [1439, 1320, 420, true], [0, 1320, 420, true], [419, 1320, 420, true],
  [420, 1320, 420, false], [720, 1320, 420, false],
  [60, 60, 360, true], [360, 60, 360, false], [30, 60, 360, false],
  [500, 600, 600, false],                    // start == end → never asleep
])('isSleepTime(%i, %i, %i) = %s', (m, s, e, want) => expect(isSleepTime(m, s, e)).toBe(want))
test('createRng is deterministic and in [0,1)', ...)
```

- [ ] **Step 2: Run** `npm test -- src/core/clock src/core/rng` and confirm FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the same command and confirm PASS.
- [ ] **Step 5: Commit** — `feat: add deterministic rng and active-time clock helpers`

---

### Task 4: Needs — decay, care-mistake episodes, warnings

**Files:** Create `src/core/needs.ts`, `src/core/warnings.ts`, `src/core/needs.test.ts`, `src/core/warnings.test.ts`, `src/core/factory.ts`, `src/core/factory.test.ts`

**Interfaces:**
- Consumes: types and constants (Task 2).
- Produces:
  - `stepNeeds(pet: PetState): StepResult` — one awake minute: hunger and mood decay by stage, then the zero-episode counters.
  - `deriveWarning(pet: PetState): WarningLevel`
  - `acknowledgeCritical(pet: PetState): PetState`
  - `createEgg(): PetState`, `createGame(now: number, generation?: number): GameState`, `createZukan(): Zukan` (`discovered: ['egg']`)

- [ ] **Step 1: Write failing tests**

```ts
test('adult hunger and mood decay by stage rates', () => {
  const r = stepNeeds(makePet({ stage: 'adult' }))
  expect(r.pet.stats.hunger).toBeCloseTo(99.65); expect(r.pet.stats.mood).toBeCloseTo(99.7)
})
test('emits hungry once when hunger reaches 0', ...)            // from 0.5 → 0: events contain {type:'hungry'}; next minute does not
test('hunger at 0 for 15 minutes is one mistake, not more', ...) // 30 minutes at 0 → totalMistakes 1, stageMistakes 1
test('recovering hunger resets the episode', ...)
test('egg does not decay', ...)
test('stats never go below 0', ...)
test.each([[100,100,100,0,false,'none'],[0,100,100,0,false,'notice'],[100,100,100,1,false,'notice'],
           [100,100,100,0,true,'notice'],[100,100,50,0,false,'danger'],[100,100,25,0,false,'critical']])
  ('deriveWarning(hunger=%i mood=%i vit=%i poops=%i sick=%s) = %s', ...)
test('acknowledgeCritical stamps awakeMinutes only when critical and unstamped', ...)
test('createEgg is an alive egg with path [egg] and full stats', ...)
```

- [ ] **Step 2: Run** and confirm FAIL. **Step 3: Implement.** **Step 4: Run** and confirm PASS.
- [ ] **Step 5: Commit** — `feat: add needs decay, mistake episodes and warning levels`

---

### Task 5: Hygiene — poop, sugar, sickness

**Files:** Create `src/core/hygiene.ts`, `src/core/hygiene.test.ts`

**Interfaces — Produces:** `stepHygiene(pet: PetState): StepResult` (one awake minute).

Rules (spec §4.2):
- Each `poopTimers` entry counts down 1 per minute. At ≤0, `poops = min(POOP.max, poops+1)` and emit `pooped`.
- While `poops > 0`, `poopMin` increments. At `POOP.sickAfterMin` it adds a `poop` mistake, makes the pet sick (if not already), and resets `poopMin` to 0.
- `sugar` decreases by 1 every `SUGAR.decayEveryMin` minutes (and never goes below 0).
- Sickness: on entering sick, set `sick=true`, set `medicineNeeded=MEDICINE_DOSES`, and emit `sick`.

- [ ] **Step 1: Write failing tests**

```ts
test('scheduled poop appears when its timer runs out', ...)  // poopTimers [1] → poops 1, timers [], event pooped
test('poops cap at 4', ...)
test('poop left 120 minutes causes one poop mistake and sickness', ...)
test('sugar decays by 1 every 60 minutes', ...)
test('already-sick pet does not re-emit sick', ...)
```

- [ ] **Steps 2–4:** run and confirm FAIL, implement, run and confirm PASS.
- [ ] **Step 5: Commit** — `feat: add poop, sugar and sickness rules`

---

### Task 6: Sleep, lights, vitality and the death rule

**Files:** Create `src/core/sleep.ts`, `src/core/vitality.ts`, `src/core/sleep.test.ts`, `src/core/vitality.test.ts`

**Interfaces — Produces:**
- `stepSleep(pet: PetState, asleepNow: boolean): StepResult` — handles transitions. Falling asleep emits `fellAsleep`. Waking emits `wokeUp`, sets `lightsOn = true`, and resets the lights episode. While asleep with the lights on, `lightsOnAsleepMin` increments. At 15 it adds one `lights` mistake per night and lowers mood by `LIGHTS_MISTAKE_MOOD`.
- `stepVitality(pet: PetState): StepResult` — one awake minute. Lose `zeroNeedLoss` for each of hunger==0 and mood==0, and lose `sickLoss` if sick. Otherwise, if hunger and mood are both > `recoverAbove` and the pet is not sick, gain `recover` (cap 100). Then apply the floor/death rule:

```
if vitality > WARNING.critical: criticalSeenAt = null
if vitality <= 0:
  if criticalSeenAt !== null && awakeMinutes - criticalSeenAt >= DEATH_GRACE_MIN → lifecycle 'dead', vitality 0, emit died
  else vitality = 1
```

- [ ] **Step 1: Write failing tests**

```ts
test('starving and unhappy loses 1 vitality per minute', ...)
test('healthy needs recover 0.2 per minute up to 100', ...)
test('without an acknowledged warning the pet never dies (floors at 1)', () => {
  let p = makePet({ stats: { hunger: 0, mood: 0, vitality: 2 } })
  for (let i = 0; i < 500; i++) p = stepVitality({ ...p, awakeMinutes: p.awakeMinutes + 1 }).pet
  expect(p.lifecycle).toBe('alive'); expect(p.stats.vitality).toBe(1)
})
test('dies only after 60 awake minutes past acknowledgement', ...) // criticalSeenAt=100; at awake 159 alive, at 160 dead + died event
test('recovering above 25 clears criticalSeenAt', ...)
test('lights left on while asleep: one mistake per night and mood -10', ...)
test('waking turns the lights on and emits wokeUp', ...)
```

- [ ] **Steps 2–4:** run and confirm FAIL, implement, run and confirm PASS.
- [ ] **Step 5: Commit** — `feat: add sleep, lights, vitality and warned-death rule`

---

### Task 7: Evolution selection

**Files:** Create `src/core/evolution.ts`, `src/core/evolution.test.ts`

**Interfaces — Produces:**
- `dominant<K extends string>(counts: Record<K, number>): K | undefined` — the unique maximum. Ties, or all zeros, give `undefined`.
- `weightClass(pet: PetState): 'light' | 'normal' | 'heavy'`
- `matches(cond: EvolutionCondition, pet: PetState, ctx: { rng: Rng; hour: number }): boolean` — evaluate `chance` last, so RNG is consumed only when every other field matches.
- `selectNextForm(pet: PetState, forms: readonly FormDef[], ctx: { rng: Rng; hour: number }): FormDef` — candidates are `from.includes(pet.formId)`. Sort by priority descending (ties keep table order) and take the first match. Throw `Error('no evolution for <id>')` if nothing matches (data tests guarantee a fallback).

- [ ] **Step 1: Write failing tests** (use the real `FORMS`):

```ts
test('baby with 3+ stage mistakes becomes child_kemu', ...)
test('heavy baby becomes child_dango; perfect baby becomes child_hoshi; otherwise child_mochi', ...)
test('meat-dominant child_mochi becomes young_hinoko', ...)
test('tied food counts fall back to young_gear', ...)
test('young_hinoko with catch-dominant play becomes adult_dragon', ...)
test('phoenix needs 0 stage mistakes AND rng < 0.3', ...)  // rng stub returning 0.1 → phoenix; 0.5 → dragon/beast/salamander
test('vampire only between 18:00 and 22:00', ...)
test('astra requires 0 total mistakes over the whole life', ...)
test('property: every reachable form always resolves to a child', () => {
  // for each non-adult form × 200 random pets (createRng(i)) → selectNextForm does not throw
})
```

- [ ] **Steps 2–4:** run and confirm FAIL, implement, run and confirm PASS.
- [ ] **Step 5: Commit** — `feat: add data-driven evolution selection`

---

### Task 8: Growth, minute step, and balance simulation

**Files:** Create `src/core/growth.ts`, `src/core/step.ts`, `src/core/growth.test.ts`, `src/core/step.test.ts`, `src/core/balance.test.ts`

**Interfaces — Produces:**
- `stepGrowth(pet: PetState, ctx: { rng: Rng; hour: number }): StepResult` — one awake minute: `awakeMinutes++` and `stageMinutes++`. When `stageMinutes >= STAGE_MINUTES[stage]`:
  - **adult:** set `lifecycle='departed'` and emit `departed`.
  - **egg:** hatch to `baby_puni` and emit `hatched`.
  - **otherwise:** evolve via `selectNextForm` and emit `evolved`.

  Evolving or hatching resets `stageMinutes`, `stageMistakes`, `foodCounts` and `gameCounts`. It appends to `path`, sets `weight = newBase + max(0, weight - oldBase)`, and adds `EVOLVE_MOOD_BONUS` to mood (cap 100).
- `stepMinute(pet: PetState, ctx: { asleep: boolean; rng: Rng; hour: number }): StepResult` — non-alive pets are unchanged. Order: `stepSleep`. If awake: `stepNeeds` → `stepHygiene` → `stepVitality` → (if still alive) `stepGrowth`. Eggs skip needs, hygiene and vitality. Concatenate the events, and append `{type:'warning', level}` when `deriveWarning` rises compared with the start of the minute.

- [ ] **Step 1: Write failing tests**

```ts
test('egg hatches into baby_puni after 30 awake minutes', ...)
test('adult departs after 1440 awake minutes in stage', ...)
test('asleep minutes do not age or decay the pet', ...)
test('warning event fires when level rises to danger', ...)
// balance.test.ts — simulates care with direct stat edits (applyCare arrives in Task 9):
test('cared-for pet reaches adult at awake minute 1410 with no mistakes', () => {
  // start createEgg(); loop stepMinute(awake). Every 120 awake minutes after hatch:
  // set hunger=min(100,hunger+80), mood=min(100,mood+60), poops=0, poopMin=0, sick=false
  // expect stage at minute 1410 === 'adult', totalMistakes === 0, vitality === 100
})
test('neglected pet floors at vitality 1 and is still alive after 3000 awake minutes', ...)
```

- [ ] **Steps 2–4:** run and confirm FAIL, implement, run and confirm PASS. If a balance assertion fails, adjust only the `HUNGER_DECAY`/`MOOD_DECAY` values in `constants.ts`, and note the change in the commit body.
- [ ] **Step 5: Commit** — `feat: add growth, per-minute step and balance simulation`

---

### Task 9: Care actions, time advance, lifecycle bookkeeping

**Files:** Create `src/core/care.ts`, `src/core/advance.ts`, `src/core/lifecycle.ts` and their `*.test.ts`

**Interfaces — Produces:**
- `applyCare(pet: PetState, action: CareAction): CareResult`
- `advanceTime(game: GameState, input: { now: number; settings: Settings; idle: IdleState; rng: Rng }): { game: GameState; events: GameEvent[] }`
- `unlockFromEvents(zukan: Zukan, events: GameEvent[]): Zukan` — adds `to` from `hatched`/`evolved` (no duplicates)
- `recordEnding(zukan: Zukan, game: GameState, now: number): Zukan` — appends a `Memory` (with `ending` from `pet.lifecycle`)
- `startNextGeneration(game: GameState, now: number): GameState` — creates a new egg, `generation+1`, `lastTickAt=now`

`applyCare` rules (spec §4.2):

| action | refused when | effect |
|---|---|---|
| any | `lifecycle!=='alive'` → `notAlive`; stage egg → `egg` (except `lights`) | — |
| feed | asleep → `asleep`; meal with hunger ≥ 100 → `full` | apply the FoodDef deltas (clamp 0..100, weight ≥1). `foodCounts[tag]++`. A meal pushes `POOP.delayMin` onto `poopTimers`. A snack does `sugar++`, and when sugar ≥ `SUGAR.sickAt` the pet gets sick and sugar resets to 0 |
| play | asleep → `asleep` | mood + (`won` ? winMood : loseMood). Weight − `weightLoss` (min base×0.5). `gameCounts[game]++` |
| clean | poops == 0 → `noPoop` | poops 0, poopMin 0 |
| medicine | not sick → `notSick` | medicineNeeded−1. At 0, sick=false |
| lights | never | lightsOn = `on` |
| pet | asleep → `asleep`; `awakeMinutes - lastPetAt < cooldownMin` → `cooldown` | mood + 5, lastPetAt = awakeMinutes |

`advanceTime`:
- If `idle === 'locked'` or the pet is not alive, return `lastTickAt = now` and no events.
- Otherwise use `consumeElapsed(lastTickAt, now, TICK_MAX_GAP_MS)`. For each minute i (timestamp `lastTickAt + (i+1)*60_000`), call `stepMinute` with `asleep = isSleepTime(minuteOfDay(ts), settings.sleepStartMin, settings.sleepEndMin)` and `hour = new Date(ts).getHours()`.

- [ ] **Step 1: Write failing tests** — one test per row of the care table (ok and refused cases), plus:

```ts
test('three snacks make the pet sick', ...)
test('advanceTime steps 2 minutes for 150s elapsed and keeps remainder', ...)
test('advanceTime does nothing while screen is locked but moves lastTickAt', ...)
test('advanceTime at 23:00 UTC with default settings keeps pet asleep and unchanged stats', ...)
test('unlockFromEvents adds hatched/evolved targets once', ...)
test('recordEnding stores path, finalForm and ending', ...)
test('startNextGeneration creates egg with generation+1', ...)
```

- [ ] **Steps 2–4:** run and confirm FAIL, implement, run and confirm PASS.
- [ ] **Step 5: Commit** — `feat: add care actions, time advance and lifecycle bookkeeping`

---

### Task 10: Save schema and repository

**Files:** Create `src/storage/schema.ts`, `src/storage/repository.ts`, `src/storage/repository.test.ts`

**Interfaces — Produces:**

```ts
export type NotifyKind = 'hungry'|'unhappy'|'pooped'|'sick'|'danger'|'critical'|'hatched'|'evolved'|'died'|'departed';
export interface SaveMeta { lastNotified: Partial<Record<NotifyKind, number>>; showRenewal: boolean; showDataReset: boolean }
export interface SaveV1 { version: 1; game: GameState; zukan: Zukan; settings: Settings; meta: SaveMeta }
export const saveSchema: z.ZodType<SaveV1>
export const SAVE_KEY = 'chrometchi:v1'
export const LEGACY_KEYS = ['chrometchiState', 'chrometchiCatalog', 'chrometchiSettings'] as const
export interface KeyValueArea { get(keys: string[]): Promise<Record<string, unknown>>; set(items: Record<string, unknown>): Promise<void>; remove(keys: string[]): Promise<void> }
export interface SaveRepository { load(): Promise<SaveV1>; save(s: SaveV1): Promise<void> }
export function createFreshSave(now: number, flags?: Partial<SaveMeta>): SaveV1
export function createSaveRepository(area: KeyValueArea, now: () => number): SaveRepository
```

`load()` rules:
- **Valid save:** return it.
- **No save, legacy keys present:** remove the legacy keys, then save and return a fresh save with `showRenewal: true`.
- **No save, nothing else:** save and return a fresh save.
- **Invalid save:** save and return a fresh save with `showDataReset: true`.

Settings schema: `sleepStartMin`/`sleepEndMin` are integers 0..1439.

- [ ] **Step 1: Write failing tests** with an in-memory `KeyValueArea`:

```ts
test('first run creates and persists a fresh save', ...)
test('legacy keys are removed and renewal notice is flagged', ...)
test.each([{ version: 2 }, { version: 1, game: 'x' }, 'garbage', { version: 1 }])('invalid save %j resets with showDataReset', ...)
test('valid save round-trips unchanged', ...)
```

- [ ] **Steps 2–4:** run and confirm FAIL, implement, run and confirm PASS.
- [ ] **Step 5: Commit** — `feat: add validated save schema and repository with legacy reset`

---

### Task 11: Message protocol and serialized engine

**Files:** Create `src/messaging/protocol.ts`, `src/background/queue.ts`, `src/background/engine.ts` and their `*.test.ts`

**Interfaces — Produces:**

```ts
// protocol.ts
export type EngineRequest =
  | { type: 'sync' } | { type: 'care'; action: CareAction } | { type: 'ackCritical' }
  | { type: 'updateSettings'; patch: Partial<Settings> } | { type: 'restart' } | { type: 'startNewEgg' }
  | { type: 'dismissNotice'; notice: 'renewal' | 'dataReset' };
export type EngineResponse = { ok: true; save: SaveV1; outcome?: CareOutcome } | { ok: false; error: string };
export function parseEngineRequest(raw: unknown): EngineRequest | null   // zod
// queue.ts
export function createSerialQueue(): <T>(job: () => Promise<T>) => Promise<T>
// engine.ts
export interface Notifier { notify(events: GameEvent[], ctx: { settings: Settings; asleep: boolean; now: number; lastNotified: SaveMeta['lastNotified'] }): Promise<SaveMeta['lastNotified']> }
export interface Badge { update(level: WarningLevel): Promise<void> }
export interface EngineDeps { repo: SaveRepository; now: () => number; rng: Rng; queryIdle: () => Promise<IdleState>; notifier: Notifier; badge: Badge }
export interface Engine { tick(): Promise<SaveV1>; handle(raw: unknown): Promise<EngineResponse> }
export function createEngine(deps: EngineDeps): Engine
```

Engine behavior. Every operation runs inside the serial queue: `load → advance → mutate → bookkeeping → save`.
- **Bookkeeping:**
  - `unlockFromEvents`.
  - On a `died`/`departed` event, `recordEnding`.
  - `notifier.notify` updates `meta.lastNotified`.
  - `badge.update(deriveWarning(pet))`.
- **Requests:**
  - `sync`: a tick, then return the save.
  - `care`: a tick, then `applyCare` (with the outcome in the response).
  - `ackCritical`: `acknowledgeCritical`.
  - `updateSettings`: merge the patch, then re-validate with zod. If invalid, reply `ok:false`.
  - `restart`: `startNextGeneration` without recording a memory.
  - `startNewEgg`: allowed only when the pet is not alive; otherwise reply `ok:false`.
  - `dismissNotice`: clear the flag.
- **Failures:** a request that fails `parseEngineRequest` returns `{ ok:false, error:'invalid request' }`. Any thrown error returns `{ ok:false, error }` and does not save.

- [ ] **Step 1: Write failing tests** with fakes (in-memory repo, `now` stub, `createRng(1)`, spy notifier/badge):

```ts
test('parseEngineRequest rejects unknown type and bad field types', ...)
test('engine serializes concurrent requests', async () => {
  // fire handle(care feed rice) and tick() together without awaiting between; final save has the rice in foodCounts AND lastTickAt advanced
})
test('care returns outcome and persists', ...)
test('ackCritical stamps criticalSeenAt', ...)
test('evolution event unlocks zukan entry', ...)
test('death records a memory and startNewEgg begins generation+1', ...)
test('startNewEgg is refused while pet is alive', ...)
test('badge is updated with the current warning level after every operation', ...)
test('invalid settings patch is rejected and save unchanged', ...)
```

- [ ] **Steps 2–4:** run and confirm FAIL, implement, run and confirm PASS.
- [ ] **Step 5: Commit** — `feat: add typed message protocol and serialized game engine`

---

### Task 12: Notifier, badge, i18n helper and background wiring

**Files:** Create `src/i18n/t.ts`, `src/background/notifier.ts`, `src/background/badge.ts` and tests. Modify `src/entrypoints/background.ts`. Add message keys `notify_<kind>` to both locales.

**Interfaces — Produces:**
- `t(key: string, subs?: string | string[]): string` — `browser.i18n.getMessage`. Returns `key` when the message is missing.
- `createNotifier(api: { create(id: string, opts: { type: 'basic'; iconUrl: string; title: string; message: string }): Promise<unknown> }, translate: typeof t, iconUrl: string): Notifier`
  - Events map to kinds: `hungry`, `unhappy`, `pooped`, `sick`, `warning{danger}`→`danger`, `warning{critical}`→`critical`, `hatched`, `evolved`, `died`, `departed`.
  - Skip everything when `settings.notifications` is false or `asleep`.
  - Throttle each kind to `NOTIFY_THROTTLE_MS`.
- `createBadge(api: { setBadgeText(d: { text: string }): Promise<void>; setBadgeBackgroundColor(d: { color: string }): Promise<void> }): Badge` — for `critical`, text `'!'` and color `'#e53935'`; otherwise text `''`.
- `background.ts`: `defineBackground(() => { ... })`.
  - On `runtime.onInstalled` and `onStartup`: `alarms.create('tick', { periodInMinutes: 1 })`.
  - On `alarms.onAlarm('tick')`: `engine.tick()`.
  - On `runtime.onMessage((msg, sender) => …)`: if `sender.id !== browser.runtime.id`, return `{ ok:false, error:'forbidden' }`; otherwise return `engine.handle(msg)`.
  - Dependencies: `queryIdle = () => browser.idle.queryState(60)`, `rng = Math.random`, and the repo over `browser.storage.local`.

- [ ] **Step 1: Write failing tests**

```ts
test('notifier sends hungry once per 30 minutes', ...)
test('notifier sends nothing when disabled or asleep', ...)
test('critical warning maps to critical notification', ...)
test('badge shows red ! only for critical', ...)
test('t falls back to key when message missing', ...)       // stub browser.i18n.getMessage via vi.spyOn
```

- [ ] **Steps 2–4:** run and confirm FAIL, implement, run and confirm PASS. Then run `npm run build`; the build must succeed.
- [ ] **Step 5: Commit** — `feat: wire background alarms, notifications, badge and messaging`

---

### Task 13: Popup data layer and asset registry

**Files:** Create `src/ui/api.ts`, `src/ui/useGame.ts`, `src/ui/assets.ts` and tests, and `src/assets/sprites/_placeholder/idle0.png` (copy `docs/superpowers/specs/assets/style-a-baby.png`).

**Interfaces — Produces:**
- `requestEngine(req: EngineRequest): Promise<EngineResponse>` — `browser.runtime.sendMessage`. If the call rejects, resolve `{ ok:false, error }`.
- `useGame(): { save: SaveV1 | null; outcome: CareOutcome | null; error: string | null; send(req: EngineRequest): Promise<void> }`.
  - On mount it sends `sync`, and re-syncs every 60 s while mounted.
  - It applies `storage.onChanged[SAVE_KEY]` after `saveSchema.safeParse`.
  - `error` holds the last `ok:false` message.
- `type IconId = 'feed'|'play'|'clean'|'medicine'|'lights'|'zukan'|'settings'|'heart_full'|'heart_half'|'heart_empty'|'back'|`food_${FoodId}`|`game_${GameId}``
- `type EffectId = 'poop'|'zzz'|'sweat'|'sparkle'|'note'|'skull'|'pill'`
- `type BackgroundId = 'room_day'|'room_night'`
- `ICON_IDS: readonly IconId[]`, `EFFECT_IDS: readonly EffectId[]`, `BACKGROUND_IDS: readonly BackgroundId[]` (every id, for Plan 2's completeness test)
- `spriteUrl(formId: FormId, pose: Pose): string` — fallback order: `<formId>/<pose>`, then `<formId>/idle0`, then `_placeholder/idle0`.
- `iconUrl(id: IconId): string | null`, `effectUrl(id: EffectId): string | null`, `backgroundUrl(id: BackgroundId): string | null` — `null` means "render the placeholder/label".
- Registry source: `import.meta.glob('/src/assets/**/*.png', { eager: true, query: '?url', import: 'default' })`, with paths `src/assets/sprites/<formId>/<pose>.png`, `src/assets/ui/icons/<IconId>.png`, `src/assets/ui/effects/<EffectId>.png`, `src/assets/ui/bg/<BackgroundId>.png`.

- [ ] **Step 1: Write failing tests**

```ts
test('spriteUrl falls back to placeholder for unknown forms', ...)
test('iconUrl returns null when the icon file does not exist', ...)
test('useGame syncs on mount and exposes the save', ...)            // vi.mock('@/ui/api')
test('useGame surfaces engine errors', ...)
```

- [ ] **Steps 2–4:** run and confirm FAIL, implement, run and confirm PASS.
- [ ] **Step 5: Commit** — `feat: add popup engine client, useGame hook and asset registry`

---

### Task 14: Main popup screen — status, stage, action bar

**Files:** Create `src/ui/components/{StatusBar,PetStage,ActionBar,IconButton}.tsx` with tests. Modify `src/entrypoints/popup/{App.tsx,style.css,main.tsx}` (import `@fontsource/dotgothic16`).

**Interfaces:**
- Consumes: `useGame`, the asset registry, `deriveWarning`, `t`.
- Produces:
  - `StatusBar({ pet })` — 4 hearts each for おなか and ごきげん (25 points per heart, half at ≥12.5), げんき as hearts, and a weight number.
  - `PetStage({ pet, reaction })` — background `room_night` when `pet.asleep`, else `room_day`.
    - Pet sprite pose: `reaction` (`'eat'|'happy'|null`, shown for 1 s after an ok outcome) wins. Otherwise `sleep` when asleep, `sick` when sick, `sad` at warning ≥ danger, else `idle0`/`idle1` alternating every 500 ms with a 2px CSS bounce.
    - Poops are rendered with `effectUrl('poop')`.
    - Overlay effects: `zzz` when asleep, `sweat` when sick, `sparkle` with the `happy` reaction, `note` while the `happy` reaction comes from play. When an effect URL is `null`, render nothing.
  - `ActionBar({ pet, onSelect(kind: 'feed'|'play'|'clean'|'medicine'|'lights'|'zukan'|'settings') })` — disables feed/play while asleep or for an egg, clean when `poops==0`, and medicine when not sick.
- Layout: header 48px, stage 352×272 (background 88×68 at 4×), action bar at the bottom. Body is 360×560.

- [ ] **Step 1: Write failing tests** (@testing-library/preact):

```ts
test('status bar renders 4 hearts per need with half hearts', ...)  // hunger 60 → 2 full, 1 half, 1 empty
test('pet uses sleep pose when asleep', ...)
test('action bar disables clean without poop and medicine when healthy', ...)
test('action bar disables feed and play for an egg', ...)
```

- [ ] **Steps 2–4:** run and confirm FAIL, implement, run and confirm PASS.
- [ ] **Step 5: Commit** — `feat: add main popup screen with status, stage and actions`

---

### Task 15: Care panels, outcomes and pet interaction

**Files:** Create `src/ui/components/{FoodPanel,PlayPanel,OutcomeToast}.tsx` with tests. Modify `App.tsx`.

**Interfaces:**
- `FoodPanel({ onPick(food: FoodId), onClose })` — lists all 6 `FOODS` with icon and name, and marks each as meal or snack.
- `PlayPanel({ onPick(game: GameId), onClose })` — lists the 3 `GAMES`.
- `OutcomeToast({ outcome })` — shows `t('refuse_<reason>')` for refused outcomes. Add `refuse_*` keys to the locales.
- Clicking the pet sprite sends `{ kind: 'pet' }`. The lights button toggles `{ kind:'lights', on: !pet.lightsOn }`. While asleep with the lights off, the stage is dimmed.

- [ ] **Step 1: Write failing tests**

```ts
test('choosing a food sends care feed with that food', ...)
test('refused outcome shows localized reason', ...)
test('clicking the pet sends pet action', ...)
test('lights button sends the opposite state', ...)
test('ok feed outcome shows the eat pose for 1s', ...)        // vi.useFakeTimers
```

- [ ] **Steps 2–4:** run and confirm FAIL, implement, run and confirm PASS.
- [ ] **Step 5: Commit** — `feat: add food and play panels, outcomes and petting`

---

### Task 16: Mini-game framework and "catch" game

**Files:** Create `src/games/types.ts`, `src/games/catch/{logic,render}.ts`, `src/games/catch/logic.test.ts`, `src/ui/components/MiniGameHost.tsx`, `src/ui/components/MiniGameHost.test.tsx`

**Interfaces — Produces:**

```ts
export interface GameInput { left: boolean; right: boolean; action: boolean; pick: number | null } // pick: lane/cup index tapped
export interface MiniGame<S> {
  id: GameId; init(rng: Rng): S; step(s: S, dtMs: number, input: GameInput, rng: Rng): S;
  isOver(s: S): boolean; won(s: S): boolean; render(ctx: CanvasRenderingContext2D, s: S): void;
}
export const MINI_GAMES: Record<GameId, MiniGame<unknown>>   // filled as games land; Task 16 registers catch
```

- `catch` rules:
  - Lasts 30 000 ms. There are 5 lanes, and the player starts in lane 2.
  - Each `left`/`right` edge moves one lane; `pick` jumps to a lane.
  - An item spawns every 800 ms in a random lane, good with probability 0.7, and takes 1 500 ms to fall.
  - An item is caught when it lands in the player's lane.
  - `won` = caughtGood ≥ 0.6 × spawnedGood and caughtBad ≤ 2.
- `MiniGameHost({ game: GameId, onFinish(won: boolean) })`:
  - A 180×180 canvas rendered at 2×. The loop uses `requestAnimationFrame`.
  - Input: keyboard ←/→/Space, and pointer taps mapped to `pick`.
  - When the game ends, show the result for 1 500 ms, then call `onFinish`.
  - The App sends `{ kind:'play', game, won }`.

- [ ] **Step 1: Write failing tests**

```ts
test('catch spawns an item every 800ms', ...)
test('catching good items in lane counts them; missing does not', ...)
test('game ends at 30s and win threshold is applied', ...)
test('host calls onFinish with won after the result delay', ...)   // vi.useFakeTimers + stub game
```

- [ ] **Steps 2–4:** run and confirm FAIL, implement, run and confirm PASS.
- [ ] **Step 5: Commit** — `feat: add mini-game host and catch game`

---

### Task 17: "cups" and "stop" games

**Files:** Create `src/games/{cups,stop}/{logic,render}.ts` and `logic.test.ts` for each. Register both in `MINI_GAMES`.

- `cups` rules:
  - 5 rounds, 3 cups. The treat starts under a random cup.
  - Each round: phases `show` (800 ms) → `shuffle` (round r makes `3 + r` swaps of 400 − 40r ms each, taking the swap pairs from `rng`) → `pick` (wait for `pick`) → `reveal` (700 ms).
  - `won` = correct ≥ 3.
- `stop` rules:
  - 5 tries. A marker moves 0..1 back and forth at speed `0.8 + 0.2 × try` units/s.
  - The target zone is centered at a random position, with width `0.22 − 0.03 × try`.
  - `action` stops the marker; a hit means it is inside the zone. There is a 600 ms pause between tries.
  - `won` = hits ≥ 3.

- [ ] **Step 1: Write failing tests**

```ts
test('cups: shuffles move the treat with the cup', ...)
test('cups: picking the treat cup counts as correct; 3 of 5 wins', ...)
test('stop: hit inside the zone, miss outside', ...)
test('stop: zone narrows each try and game ends after 5 tries', ...)
```

- [ ] **Steps 2–4:** run and confirm FAIL, implement, run and confirm PASS.
- [ ] **Step 5: Commit** — `feat: add cups and stop mini-games`

---

### Task 18: Zukan, settings, dialogs and life-event screens

**Files:** Create `src/ui/components/{ZukanView,SettingsView,ConfirmDialog,CriticalBanner,EndingView,NoticeDialog}.tsx` with tests. Modify `App.tsx` and the locales.

**Interfaces / behavior:**
- `ZukanView({ zukan })`:
  - A grid of all 42 forms in table order. Discovered forms show `spriteUrl(id,'idle0')` and the name. Undiscovered forms show a silhouette (CSS `filter: brightness(0)`) and `???`.
  - If a parent of an undiscovered form is discovered, show `t('hint_<id>')`, a vague one-liner. Add 40 `hint_*` keys (no hint for egg or baby).
  - Below the grid: the memories list (newest first).
- `SettingsView({ settings, onChange(patch), onRestart })`:
  - Toggles for notifications and sound.
  - Hour selects (0–23) for sleep start and end, stored as `hour*60`.
  - A "はじめからやり直す" button that opens `ConfirmDialog` (styled, no `window.confirm`). Confirming sends `restart`.
- `CriticalBanner` renders when `deriveWarning(pet)==='critical'`. In `useEffect`, if `pet.criticalSeenAt === null`, send `ackCritical` once.
- `EndingView({ pet, memory })` is shown when the pet is not alive:
  - For `dead`, a grave (the `skull` effect) and the life summary.
  - For `departed`, a farewell and the summary.
  - The button "新しいたまご" sends `startNewEgg`.
- `NoticeDialog` appears for `meta.showRenewal` (text: 新しくなりました。新しい卵から育てましょう) or `showDataReset`. Its OK button sends `dismissNotice`.

- [ ] **Step 1: Write failing tests**

```ts
test('zukan shows ??? and a hint for undiscovered child of discovered parent', ...)
test('restart requires confirmation in the styled dialog', ...)
test('sleep hour select sends minutes', ...)
test('critical banner acknowledges once', ...)
test('ending view starts a new egg', ...)
test('renewal notice dismisses', ...)
```

- [ ] **Steps 2–4:** run and confirm FAIL, implement, run and confirm PASS.
- [ ] **Step 5: Commit** — `feat: add zukan, settings, confirm dialog and life-event screens`

---

### Task 19: Sound effects

**Files:** Create `src/ui/sound.ts` and `src/ui/sound.test.ts`. Modify `App.tsx` to play effects on outcomes and game results.

**Interfaces — Produces:** `type SfxName = 'select'|'eat'|'happy'|'win'|'lose'|'alert'` and `createSfx(enabled: () => boolean, makeContext: () => AudioContext): { play(name: SfxName): void }`. Each effect is synthesized: a square-wave `OscillatorNode` plays a 2–4 note sequence of ≤ 400 ms in total. The context is created lazily on the first enabled play.

- [ ] **Step 1: Write failing tests**

```ts
test('does not create an AudioContext while sound is disabled', ...)
test('plays a short oscillator sequence when enabled', ...)
```

- [ ] **Steps 2–4:** run and confirm FAIL, implement, run and confirm PASS.
- [ ] **Step 5: Commit** — `feat: add synthesized chiptune sound effects (default off)`

---

### Task 20: E2E tests, CI/release, README

**Files:** Create `playwright.config.ts`, `e2e/fixtures.ts`, `e2e/popup.spec.ts`. Modify `.github/workflows/ci.yml`, `.github/workflows/release.yml`, `README.md`.

- `e2e/fixtures.ts`:
  - `chromium.launchPersistentContext('', { channel: 'chromium', args: ['--disable-extensions-except=<abs .output/chrome-mv3>', '--load-extension=<same>'] })`.
  - Get the `extensionId` from the service worker URL.
  - `seedSave(context, save: SaveV1)` runs `serviceWorker.evaluate(s => chrome.storage.local.set({ 'chrometchi:v1': s }), save)`.
  - Build seeds with `createFreshSave` and `makePet`.
- `playwright.config.ts`: `globalSetup` runs `npm run build` once.
- CI (`ci.yml`): Node 24, `npm ci`, `npm run lint`, `npm run typecheck`, `npm run test:coverage`, `npm run build`, `npx playwright install --with-deps chromium`, `npm run e2e`.
- Release (`release.yml`): Node 24, `npm ci`, `npm run zip`, then upload `.output/*-chrome.zip` with `softprops/action-gh-release`.
- README: new features, development commands, and the art credit (PixelLab). Remove the SVG image links; Plan 2 adds new screenshots.

- [ ] **Step 1: Write e2e specs**

```ts
test('fresh install shows an egg', ...)                       // sprite img has alt = localized form_egg
test('egg hatches when its last minute elapses', ...)         // seed egg stageMinutes 29, lastTickAt now-61s → open popup → baby
test('feeding rice increases hunger hearts', ...)             // seed baby hunger 20 → feed → more full hearts
test('stop mini-game can be played to completion', ...)       // press Space 5× with waits → gameCounts.stop === 1 in storage
test('zukan opens and lists discovered forms', ...)
test('restart asks for confirmation', ...)
test('critical state shows banner and stamps criticalSeenAt', ...)  // read storage via serviceWorker.evaluate
test('legacy save shows renewal notice', ...)                 // set chrometchiState, remove chrometchi:v1, then open popup
```

- [ ] **Step 2: Run** `npm run e2e` and confirm all pass. (These tests cover behavior already built, so a red result here means a bug — fix the implementation.)
- [ ] **Step 3: Run the full gate** `npm run lint && npm run typecheck && npm run test:coverage && npm run build && npm run e2e` and confirm all green with coverage ≥ 80%.
- [ ] **Step 4: Commit** — `test: add extension e2e tests; ci: build, test and zip with WXT`
