# Care Effects Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Play a short pixel-art effect on the popup stage for feed, clean, medicine and lights (eating that empties the food, a broom that sweeps the poop away, a pill that cures, a room that goes dark with stars).

**Architecture:** Each effect is a pure timeline: `frame(effect, elapsedMs, reduced)` returns what the stage draws at that moment (pet pose, shake, props, poops, darkness, flash), and `cues()` lists its sounds. A hook (`useCareEffect`) clocks the running effect every 50 ms and fires the sound cues. `PetStage` draws a frame over its usual picture. The game engine and save format do not change. The UI builds the effect from the action it sent and the pet before and after the action.

**Tech Stack:** Preact, TypeScript, Vitest + @testing-library/preact (happy-dom), Playwright e2e, pngjs (art scripts), PixelLab MCP (new small effect art).

**Spec:** `docs/superpowers/specs/2026-11-03-care-effects-design.md` (parent spec: `docs/superpowers/specs/2026-11-03-chrometchi-rebuild-design.md`)

## Global Constraints

- Every effect lasts at most 3000 ms. With `prefers-reduced-motion: reduce`, it lasts at most 1000 ms and has no movement and no flash.
- Movement goes in whole display-pixel steps:
  - every prop `x` and `y` is even;
  - the pet's sideways shake (`petDx`) is one of -4, 0 or 4;
  - props are drawn at integer scale with `image-rendering: pixelated`.
- The care result is decided and saved when the button is pressed. The effect is display only. Do not change `src/core` or the save schema.
- Popup only. Roaming, play and pet stay as they are; play and pet keep the `happy` reaction from `useReaction`. Refused care shows only the existing toast.
- A new successful care replaces the running effect. A refused care does not stop it.
- When the effect ends, the stage shows the saved state.
- Art rules:
  - snap to the master palette and pass `npx tsx scripts/art/check.ts --palette --size <WxH> <files>`;
  - 1px black (`#000000`) outline;
  - transparent background;
  - no imitation of existing franchises.
- PixelLab: use the free monthly quota only, never paid credits. Check `get_balance` first, and stop and ask the owner if `generations_remaining` < 100.
- Repo rules:
  - TDD, with each test watched failing first;
  - coverage ≥ 80% (the project is at ~98%; keep it there);
  - functions < 50 lines, files < 800 lines;
  - immutable updates;
  - no `console.log`.
- Commits use the conventional format (`feat:`, `fix:`, `test:`, `docs:` …) with **no attribution trailer** (owner rule). Never push, open a PR or merge without the owner's say-so.
- Talk to the owner in Japanese. Code, comments and test names stay in English like the rest of the repo.

## Review Focus

1. **Rapid repeat feeding** (pressing a food again mid-effect, or several times in a row): each ok result restarts the effect from 0. It must not leave two clocks running, play a stale pose, or fire old sound cues. Tested in Task 6 (`playing again restarts…`).
2. **A sync during an effect** (the 60 s sync, or a storage change, sets `outcome` to null and swaps in a new save): the running effect keeps going. Tested in Task 8 (`a sync during the feed effect keeps the food on stage`).
3. **The main screen unmounts mid-effect** (zukan or settings opens while the care request is still in flight): a `play()` after unmount does nothing and leaves no timers. Tested in Task 6.
4. **Edge poop counts:** clean with 0 poops, and with the maximum `POOP.max = 4`. Every slot sits on the stage, all are swept, and the broom still crosses. Tested in Task 4.
5. **The egg and the lights:** an egg can have its lights turned off. Stars, darkness and the lights-on wiggle all work with the egg sprite. Tested in Task 7 (`stars show for a sleeping egg…`).

## File Structure

| File | Responsibility |
|---|---|
| `scripts/art/frames.ts` (+test) | add `bite()`: cut bite marks out of a food icon |
| `scripts/art/bite.ts` | CLI around `bite()` |
| `src/assets/ui/food/<food>_bite{1,2}.png` | bitten foods (12 files, generated) |
| `src/assets/ui/effects/{crumb,dust0,dust1,dust2,star}.png` | new 16×16 effect art |
| `src/ui/assets.ts` (+test) | new `EffectId`s, `foodUrl()` |
| `src/ui/effects/types.ts` | `CareEffect`, `EffectFrame`, `Prop`, `Timeline` … |
| `src/ui/effects/layout.ts` (+test) | stage geometry shared by the timelines (mirrors `style.css`) |
| `src/ui/effects/{feed,clean,medicine,lights}.ts` (+tests) | one timeline each |
| `src/ui/effects/timeline.ts` (+test) | dispatch by kind, `cuesBetween`, the global invariants |
| `src/ui/effects/effectFor.ts` (+test) | care action and pet before/after → `CareEffect` |
| `src/ui/useCareEffect.ts` (+test) | clock, replacement, cues, cleanup |
| `src/ui/useReducedMotion.ts` (+test) | `prefers-reduced-motion` as a hook |
| `src/ui/components/EffectLayer.tsx` (+test) | draws `frame.props` and the flash |
| `src/ui/components/PetStage.tsx` (+test) | applies a frame: pose, shake, poops, darkness, stars |
| `src/entrypoints/popup/App.tsx` (+test), `style.css` | wiring, sounds, CSS |
| `src/ui/useGame.ts` (+test) | `send` resolves to the engine response |
| `src/ui/useReaction.ts` (+test) | drop the feed reaction (the effect replaces it) |
| `src/ui/sound.ts` (+test) | new sounds: `sweep`, `gulp`, `click` (Task 3) |
| `e2e/popup.spec.ts` | the feeding effect in the real extension |
| `docs/art/style-guide.md` | effect art and the bite script |

---

### Task 1: Bitten food art

**Files:**
- Modify: `scripts/art/frames.ts`, `scripts/art/frames.test.ts`, `src/ui/assets.ts`, `src/ui/assets.test.ts`, `docs/art/style-guide.md`
- Create: `scripts/art/bite.ts`, `src/assets/ui/food/{rice,meat,fish,veggie,cake,candy}_bite{1,2}.png`

**Interfaces:**
- Produces:
  - `bite(png: PngData, bites: 1 | 2, outline: readonly [number, number, number]): PngData` (frames.ts).
  - `foodUrl(food: FoodId, bites: 0 | 1 | 2): string | null` (assets.ts). Bites 0 is the icon `food_<id>`; 1 and 2 are `ui/food/<id>_bite<n>`.

- [ ] **Step 1: Write the failing tests** in `scripts/art/frames.test.ts`.
  - Fixture: a 32×32 image, transparent everywhere except a filled square at x, y ∈ [4, 27]. The square has a 1px `#000000` border and a red `#c7405d` fill.
  - `visible(p)` counts the alpha-255 pixels.

```ts
const BLACK = [0, 0, 0] as const;
test('bite 1 takes a bite from the right side', () => {
  const out = bite(square, 1, BLACK);
  const lost = 1 - visible(out) / visible(square);
  expect(lost).toBeGreaterThan(0.1);
  expect(lost).toBeLessThan(0.45);
  expect(removedXs(square, out).every((x) => x >= 16)).toBe(true); // right half only
});
test('bite 2 takes more than bite 1 and leaves the left third', () => {
  const lost2 = 1 - visible(bite(square, 2, BLACK)) / visible(square);
  expect(lost2).toBeGreaterThan(1 - visible(bite(square, 1, BLACK)) / visible(square));
  expect(lost2).toBeLessThan(0.75);
  expect(removedXs(square, bite(square, 2, BLACK)).every((x) => x >= 12)).toBe(true);
});
test('the bitten edge is outlined', () => {
  // every visible pixel that 4-touches a pixel removed by the bite is #000000
});
test('keeps the size, uses only 0/255 alpha and only colors already in the image', () => { /* … */ });
```

- [ ] **Step 2:** Run `npx vitest run scripts/art/frames.test.ts`. Expected: FAIL, because `bite` is not exported.
- [ ] **Step 3: Implement `bite`.**
  - Take the visible bounding box `x0..x1, y0..y1` (w, h) and the radius `r = ceil(w / 3)`.
  - Remove the pixels inside `bites` circles:
    - bite 1: center `(x1, y0 + h/3)`;
    - bite 2: also a circle centered at `(x1 - r/2, y0 + 2h/3)`.
  - Then repaint every remaining visible pixel that 4-touches a removed pixel with `outline`.
  - Return a new image; never mutate the input.
- [ ] **Step 4:** Run the test. Expected: PASS.
- [ ] **Step 5: Write `scripts/art/bite.ts`.**
  - Usage: `tsx scripts/art/bite.ts <1|2> <in.png> <out.png>`. Mirror `idle1.ts` and use outline `[0, 0, 0]`.
  - Generate all 12 files from `src/assets/ui/icons/food_<id>.png`.
  - Run `npx tsx scripts/art/check.ts --palette --size 32x32 src/assets/ui/food/*.png`. Expected: no output, exit 0.
- [ ] **Step 6: Write the failing test** in `src/ui/assets.test.ts`.

```ts
test('every food has a whole and two bitten pictures', () => {
  for (const f of FOODS) {
    expect(foodUrl(f.id, 0)).toBe(iconUrl(`food_${f.id}`));
    expect(foodUrl(f.id, 1), f.id).toContain(`/ui/food/${f.id}_bite1`);
    expect(foodUrl(f.id, 2), f.id).toContain(`/ui/food/${f.id}_bite2`);
  }
});
```

- [ ] **Step 7:** Run it. Expected: FAIL, because `foodUrl` is not exported. Implement `foodUrl`, then run `npx vitest run src/ui/assets.test.ts`. Expected: PASS.
- [ ] **Step 8:** Add an "Effects (care)" section to `docs/art/style-guide.md`: bitten foods are made by `scripts/art/bite.ts`, never by AI, and new foods only need the script run.
- [ ] **Step 9: Commit:** `feat(art): add bitten food pictures made by a bite script`

---

### Task 2: New effect art (crumb, dust, star)

**Files:**
- Create: `src/assets/ui/effects/{crumb,dust0,dust1,dust2,star}.png` (16×16)
- Modify: `src/ui/assets.ts`, `src/ui/assets.test.ts`, `docs/art/style-guide.md`

**Interfaces:**
- Produces: `EffectId` gains `'crumb' | 'dust0' | 'dust1' | 'dust2' | 'star'`, and `EFFECT_IDS` lists all 12.

- [ ] **Step 1: Write the failing test.** In `assets.test.ts`, change the expectation to `expect(EFFECT_IDS).toHaveLength(12)` and add `expect(EFFECT_IDS).toEqual(expect.arrayContaining(['crumb', 'dust0', 'dust1', 'dust2', 'star']))`.
- [ ] **Step 2:** Run `npx vitest run src/ui/assets.test.ts`. Expected: FAIL, because the length is 7.
- [ ] **Step 3: Check the balance.** Call `get_balance`. This task uses about 15 generations. Stop and ask the owner if `generations_remaining` < 100.
- [ ] **Step 4: Generate 3 candidates per piece.**
  - Settings: `create_image_pixen(width 16, height 16, no_background true, outline 'single color black outline', detail 'low detail')`.
  - Prompts:
    - crumb: `a few tiny food crumbs scattering, cute pixel effect, thick black outline`
    - dust0: `small round puff of light gray dust cloud, cute pixel effect, thick black outline`
    - star: `tiny twinkling yellow star, cute pixel effect, thick black outline`
  - `dust1` and `dust2` come from `edit_image_pixen` on the chosen `dust0`:
    - dust1: `same dust puff, bigger and breaking apart into smaller puffs`
    - dust2: `same dust puff almost gone, only a few small wisps left`
- [ ] **Step 5: Snap to the palette.** Run `reduce_colors(palette_image=docs/art/palette.png)` on the picks. Snap the 3 dust frames together in one call. Then run `npx tsx scripts/art/check.ts --palette --size 16x16 src/assets/ui/effects/*.png`. Expected: exit 0.
- [ ] **Step 6:** Extend `EffectId` and `EFFECT_IDS`. Run the test. Expected: PASS.
- [ ] **Step 7:** In the style guide's "Effects (care)" section, record the prompts and add a link to the generated pieces.
- [ ] **Step 8: Commit:** `feat(art): add crumb, dust and star effects`

---

### Task 3: Effect model and the feed timeline

**Files:**
- Create: `src/ui/effects/types.ts`, `src/ui/effects/layout.ts`, `src/ui/effects/layout.test.ts`, `src/ui/effects/feed.ts`, `src/ui/effects/feed.test.ts`
- Modify: `src/ui/sound.ts`, `src/ui/sound.test.ts`

**Interfaces:**
- Consumes: `EffectId` (Task 2), `SfxName` (type only, from `@/ui/sound`).
- Produces (`sound.ts`): `SfxName` gains three sounds, so the later timelines type-check:
  - `sweep`: notes `[330, 262]`, 0.05 s;
  - `gulp`: notes `[392, 262]`, 0.07 s;
  - `click`: notes `[1318]`, 0.03 s.
- Produces (`types.ts`):

```ts
export type CareEffect =
  | { readonly kind: 'feed'; readonly food: FoodId }
  | { readonly kind: 'clean'; readonly poops: number }
  | { readonly kind: 'medicine'; readonly cured: boolean }
  | { readonly kind: 'lights'; readonly on: boolean };
export type EffectOf<K extends CareEffect['kind']> = Extract<CareEffect, { kind: K }>;
export type PropArt =
  | { readonly kind: 'food'; readonly food: FoodId; readonly bites: 0 | 1 | 2 }
  | { readonly kind: 'effect'; readonly id: EffectId }
  | { readonly kind: 'icon'; readonly id: 'clean' | 'lights' };
/** One picture on the stage: top-left in stage px, drawn at `scale` × the art's own size. */
export interface Prop { readonly key: string; readonly art: PropArt; readonly x: number; readonly y: number; readonly scale: number }
export type PoopLook = 'poop' | 'dust0' | 'dust1' | 'dust2' | 'gone';
export interface PoopView { readonly look: PoopLook; readonly dx: number }
export interface EffectFrame {
  readonly pose: Pose | null;               // null = the usual pose
  readonly petDx: number;                   // -4 | 0 | 4
  readonly poops: readonly PoopView[] | null; // null = the saved poops
  readonly dim: number | null;              // 0..1 darkness, null = the saved lights
  readonly flash: boolean;
  readonly props: readonly Prop[];
}
export const BASE_FRAME: EffectFrame; // pose null, petDx 0, poops null, dim null, flash false, props []
export interface SfxCue { readonly atMs: number; readonly sfx: SfxName }
export interface Timeline<E extends CareEffect> {
  durationMs(effect: E, reduced: boolean): number;
  frame(effect: E, elapsedMs: number, reduced: boolean): EffectFrame;
  cues(effect: E, reduced: boolean): readonly SfxCue[];
}
```

- Produces (`layout.ts`): the stage geometry. All values are starting points the owner gate may tune, but they must mirror `style.css`.
  - `STAGE = { w: 352, h: 272 }`
  - `PET = { x: 112, y: 100, size: 128 }`
  - `FOOD_AT = { x: 208, y: 148 }` (64 px food)
  - `MOUTH_AT = { x: 160, y: 164 }` (32 px pill)
  - `PILL_FROM = { x: 248, y: 84 }`
  - `SWEAT_AT = { x: 110, y: 90 }` (same as `.effect--sweat`)
  - `SWITCH_AT = { x: 292, y: 12 }` (48 px switch)
  - `BROOM = { y: 200, scale: 4 }`
  - `POOP_ROW = { size: 32, gap: 4, right: 8, bottom: 8 }`
  - `poopSlotLeft(i: number, n: number): number`, the left x of poop `i` of `n`, matching the right-aligned flex row in `.poops`.
- Produces (`feed.ts`): `FEED: Timeline<EffectOf<'feed'>>`.

Feed timing (normal, 2600 ms):

| time | what is shown |
|---|---|
| 0–300 | pose `idle0`, whole food |
| bite k = 0, 1, 2 (starts at 300 + 600k) | first 300 ms: pose `eat`; next 300 ms: pose `idle0` |
| each bite's mouth-close | the food loses a piece (bites 1, 2, then gone); crumbs fly for 300 ms; cue `eat` |
| 2100–2600 | pose `happy`, sparkle |

With reduced motion (800 ms): 0–400 shows pose `eat` and the whole food; 400–800 shows pose `happy` and no food. One `eat` cue at 400.

- [ ] **Step 1: Write the failing tests.** In `sound.test.ts`, check that `sweep`, `gulp` and `click` play their notes. Then:

```ts
// layout.test.ts
test('poop slots line up from the right like the .poops row', () => {
  expect(poopSlotLeft(0, 1)).toBe(312);
  expect([poopSlotLeft(0, 2), poopSlotLeft(1, 2)]).toEqual([276, 312]);
  expect(poopSlotLeft(0, 4)).toBe(204);
});
// feed.test.ts
const rice = { kind: 'feed', food: 'rice' } as const;
const at = (t: number, reduced = false) => FEED.frame(rice, t, reduced);
const food = (f: EffectFrame) => f.props.find((p) => p.art.kind === 'food');
const has = (f: EffectFrame, id: EffectId) => f.props.some((p) => p.art.kind === 'effect' && p.art.id === id);
test('the food appears whole at the mouth', () => {
  expect(food(at(0))).toMatchObject({ art: { kind: 'food', food: 'rice', bites: 0 }, ...FOOD_AT, scale: 2 });
});
test('the pet opens and closes its mouth three times', () => {
  expect([300, 600, 900, 1200, 1500, 1800].map((t) => at(t).pose)).toEqual(['eat', 'idle0', 'eat', 'idle0', 'eat', 'idle0']);
});
test('each bite takes a piece: whole, 2/3, 1/3, gone', () => {
  expect(food(at(599))?.art).toMatchObject({ bites: 0 });
  expect(food(at(600))?.art).toMatchObject({ bites: 1 });
  expect(food(at(1200))?.art).toMatchObject({ bites: 2 });
  expect(food(at(1800))).toBeUndefined();
});
test('crumbs fly only just after a bite', () => {
  expect(has(at(500), 'crumb')).toBe(false);
  expect(has(at(650), 'crumb')).toBe(true);
  expect(has(at(950), 'crumb')).toBe(false);
});
test('it ends happy with a sparkle', () => {
  expect(at(2200).pose).toBe('happy');
  expect(has(at(2200), 'sparkle')).toBe(true);
});
test('it lasts 2600 ms, and 800 ms with reduced motion', () => {
  expect(FEED.durationMs(rice, false)).toBe(2600);
  expect(FEED.durationMs(rice, true)).toBe(800);
});
test('each bite sounds', () => {
  expect(FEED.cues(rice, false)).toEqual([600, 1200, 1800].map((atMs) => ({ atMs, sfx: 'eat' })));
});
test('reduced: eat with the whole food, then happy without it', () => {
  expect(at(0, true).pose).toBe('eat');
  expect(food(at(0, true))?.art).toMatchObject({ bites: 0 });
  expect(at(400, true).pose).toBe('happy');
  expect(food(at(400, true))).toBeUndefined();
  expect(FEED.cues(rice, true)).toEqual([{ atMs: 400, sfx: 'eat' }]);
});
test('feeding never touches the lights or the poops', () => {
  for (let t = 0; t < 2600; t += 50) expect(at(t)).toMatchObject({ dim: null, poops: null, flash: false, petDx: 0 });
});
```

- [ ] **Step 2:** Run `npx vitest run src/ui/effects src/ui/sound.test.ts`. Expected: FAIL, because the modules and sounds are missing.
- [ ] **Step 3: Implement** the three sounds, then `types.ts` (with `BASE_FRAME`), `layout.ts` and `feed.ts`.
  - Crumbs: one `crumb` prop at scale 2. It starts at the food's left edge and moves down-left 4 px every 100 ms.
  - Sparkle: one `sparkle` at scale 2, at the pet's upper right (the same place as `.effect--sparkle`).
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5: Commit:** `feat: add the effect model and the feeding timeline`

---

### Task 4: Clean timeline

**Files:**
- Create: `src/ui/effects/clean.ts`, `src/ui/effects/clean.test.ts`

**Interfaces:**
- Consumes: `types.ts` and `layout.ts` (Task 3).
- Produces: `CLEAN: Timeline<EffectOf<'clean'>>`.

Clean timing (normal, 2200 ms):
- **The broom:** `icon:clean` at scale 4, key `broom`, at `y = BROOM.y`.
  - Its base x goes from 352 to -64 over 0–1800 ms in 4 px steps.
  - On top of that it makes sweeping strokes: +8 px on every other 150 ms slice.
  - There is no broom prop from 1800.
- **Each poop**, from the first frame where the broom's x ≤ its slot's right edge (`poopSlotLeft + 32`):
  1. it slides (dx 0 → -4 → -8, 100 ms each);
  2. it puffs (`dust0`, `dust1`, `dust2`, 100 ms each);
  3. it is `gone`.
- A `sweep` cue fires when each poop starts sliding.
- **1800–2200:** pose `happy` and a `sparkle` (scale 2) on the floor, centered over the old poop row (or at the row's right end when there were no poops).
- **With reduced motion (600 ms):**
  - the broom stands still at x = `poopSlotLeft(0, n) - 64`;
  - 0–300: the poops are shown;
  - 300–600: every poop is `gone`, with pose `happy` and the sparkle;
  - one `sweep` cue at 300 when n > 0.

- [ ] **Step 1: Write the failing tests.**

```ts
const clean = (poops: number) => ({ kind: 'clean', poops }) as const;
const at = (n: number, t: number, reduced = false) => CLEAN.frame(clean(n), t, reduced);
const broom = (f: EffectFrame) => f.props.find((p) => p.key === 'broom');
const RANK: Record<PoopLook, number> = { poop: 0, dust0: 1, dust1: 2, dust2: 3, gone: 4 };
const times = (end: number) => Array.from({ length: end / 50 }, (_, i) => i * 50);
test('starts with the poops from before cleaning and the broom at the right edge', () => {
  expect(at(3, 0).poops).toEqual(Array(3).fill({ look: 'poop', dx: 0 }));
  expect(broom(at(3, 0))?.x).toBeGreaterThanOrEqual(336);
});
test('a poop moves only once the broom has reached it', () => {
  for (const n of [1, 2, 4]) for (let i = 0; i < n; i++) {
    const t = times(2200).find((t) => { const p = at(n, t).poops?.[i]; return p?.look !== 'poop' || p.dx !== 0; });
    expect(t, `${n}/${i}`).toBeDefined();
    expect(broom(at(n, t!))!.x).toBeLessThanOrEqual(poopSlotLeft(i, n) + 32);
  }
});
test('each poop slides, puffs and is gone, never going back', () => {
  for (let i = 0; i < 4; i++) {
    const looks = times(2200).map((t) => at(4, t).poops![i]!);
    looks.slice(1).forEach((p, k) => expect(RANK[p.look]).toBeGreaterThanOrEqual(RANK[looks[k]!.look]));
    expect(Math.min(...looks.map((p) => p.dx))).toBe(-8);
  }
});
test('the broom sweeps back and forth while crossing', () => {
  const xs = times(1800).map((t) => broom(at(2, t))!.x);
  expect(xs.slice(1).filter((x, k) => x > xs[k]!).length).toBeGreaterThanOrEqual(2);
});
test('by 1800 every poop is gone, the broom has left, the floor sparkles and the pet is happy', () => {
  for (const n of [0, 1, 4]) {
    const f = at(n, 1800);
    expect(f.poops).toEqual(Array(n).fill({ look: 'gone', dx: 0 }));
    expect(broom(f)).toBeUndefined();
    expect(f.pose).toBe('happy');
    expect(f.props.some((p) => p.art.kind === 'effect' && p.art.id === 'sparkle')).toBe(true);
  }
});
test('the most poops there can be all fit on the stage', () => {
  expect(poopSlotLeft(0, POOP_MAX)).toBeGreaterThanOrEqual(0); // POOP.max from @/core/constants
});
test('one sweep sound per poop, while the broom is crossing', () => {
  const cues = CLEAN.cues(clean(3), false);
  expect(cues.map((c) => c.sfx)).toEqual(['sweep', 'sweep', 'sweep']);
  expect(cues.every((c) => c.atMs > 0 && c.atMs < 1800)).toBe(true);
  expect(CLEAN.cues(clean(0), false)).toEqual([]);
});
test('it lasts 2200 ms; reduced: the broom stands still and the poops vanish at 300', () => {
  expect(CLEAN.durationMs(clean(2), false)).toBe(2200);
  expect(CLEAN.durationMs(clean(2), true)).toBe(600);
  expect(broom(at(2, 0, true))?.x).toBe(broom(at(2, 550, true))?.x);
  expect(at(2, 299, true).poops?.[0]?.look).toBe('poop');
  expect(at(2, 300, true)).toMatchObject({ pose: 'happy', poops: [{ look: 'gone', dx: 0 }, { look: 'gone', dx: 0 }] });
  expect(CLEAN.cues(clean(2), true)).toEqual([{ atMs: 300, sfx: 'sweep' }]);
});
```

- [ ] **Step 2:** Run `npx vitest run src/ui/effects/clean.test.ts`. Expected: FAIL, because the module is missing.
- [ ] **Step 3:** Implement `clean.ts`. Derive each poop's swept time once from the broom's path, as a small helper, and build both `frame` and `cues` from it so they cannot disagree.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5: Commit:** `feat: add the cleaning timeline`

---

### Task 5: Medicine and lights timelines, and the dispatcher

**Files:**
- Create: `src/ui/effects/medicine.ts`, `medicine.test.ts`, `lights.ts`, `lights.test.ts`, `timeline.ts`, `timeline.test.ts` (all in `src/ui/effects/`)

**Interfaces:**
- Consumes: Tasks 3 and 4.
- Produces:
  - `MEDICINE: Timeline<EffectOf<'medicine'>>`
  - `LIGHTS: Timeline<EffectOf<'lights'>>`
  - from `timeline.ts`:
    - `effectDurationMs(effect: CareEffect, reduced: boolean): number`
    - `effectFrame(effect: CareEffect, elapsedMs: number, reduced: boolean): EffectFrame`
    - `cuesBetween(effect: CareEffect, reduced: boolean, fromMs: number, toMs: number): SfxName[]`, the cues with `fromMs < atMs <= toMs`, in order
    - `MAX_EFFECT_MS = 3000`, `MAX_REDUCED_MS = 1000`

**Medicine** (normal, 2000 ms):
- **0–600:** pose `sick`. The `pill` (scale 2) moves from `PILL_FROM` to `MOUTH_AT` in 6 steps of 100 ms.
- **600–900:** pose `eat` and no pill. Cue `gulp` at 600.
- **Not cured:**
  - 900–1500: pose `sick`, and `petDx` alternates 4 and -4 every 100 ms.
  - 1500–2000: pose `sick` and one `sparkle` at scale 1.
  - There is never a sweat prop; the saved sickness keeps the usual sweat.
- **Cured:**
  - 0–900: a `sweat` prop (scale 2) at `SWEAT_AT`.
  - 900–1300: the sweat moves up-left 8 px every 100 ms.
  - From 1300: pose `happy` and 4 `sparkle` props (scale 2) that spread out from the pet's center. Cue `happy` at 1300.
- **Reduced (800 ms):**
  - 0–400: the pill stands still at `MOUTH_AT`, with pose `eat`. If cured, the sweat also stands still at `SWEAT_AT`.
  - 400–800:
    - cured: pose `happy` and one `sparkle` at scale 2;
    - not cured: pose `sick` and one `sparkle` at scale 1.
  - Cues: `gulp` at 0, plus `happy` at 400 if cured.

**Lights off** (normal, 1000 ms):
- The `icon:lights` switch (scale 3, key `switch`) sits at `SWITCH_AT` throughout. It is 4 px lower from 200 ("pressed").
- `dim` is 0 at 0, then 0.25, 0.5, 0.75 and 1 at 200, 400, 600 and 800.
- Cue `click` at 200.

**Lights on** (normal, 800 ms):
- The switch is pressed from 100.
- `dim` is 1 in 0–100 and 0 from 100.
- `flash` is true only in 100–200.
- In 200–800, `petDx` alternates 4 and -4 every 100 ms. The pose stays null, so the sleeping pose shows.
- Cue `click` at 100.

**Lights, reduced** (300 ms, both): the switch stands still, `dim` is final from 0 (off: 1, on: 0), there is no flash and no shake, and cue `click` is at 0.

- [ ] **Step 1: Write the failing tests.**
  - `medicine.test.ts` and `lights.test.ts`: one test per bullet above, in the style of Task 3. For example:

```ts
test('lights off: the room darkens in four steps after the click', () => {
  expect([0, 200, 400, 600, 800].map((t) => LIGHTS.frame({ kind: 'lights', on: false }, t, false).dim)).toEqual([0, 0.25, 0.5, 0.75, 1]);
});
test('lights on: one flash frame, then a sleepy wiggle', () => {
  const at = (t: number) => LIGHTS.frame({ kind: 'lights', on: true }, t, false);
  expect([50, 150, 250].map((t) => at(t).flash)).toEqual([false, true, false]);
  expect([250, 350].map((t) => at(t).petDx)).toEqual([4, -4]);
});
test('cured medicine: the sweat flies off and never comes back', () => { /* sweat at SWEAT_AT at 0, y decreasing 900–1300, absent from 1300 to 2000 */ });
```

  - `timeline.test.ts`: the global invariants over every effect. The effects are every food; clean with 0 to 4 poops; medicine cured and not cured; lights on and off. Each is checked both with and without reduced motion, sampling every 50 ms.

```ts
test('every effect is short enough', () => { /* durationMs ≤ 3000, and ≤ 1000 when reduced */ });
test('everything moves in whole display pixels', () => { /* every prop x, y even; scale an integer ≥ 1; petDx in {-4, 0, 4} */ });
test('reduced motion has no movement and no flash', () => { /* petDx 0, flash false, every prop key keeps one x, y for the whole effect */ });
test('cuesBetween returns the cues in (from, to]', () => {
  const feed = { kind: 'feed', food: 'rice' } as const;
  expect(cuesBetween(feed, false, -1, 600)).toEqual(['eat']);
  expect(cuesBetween(feed, false, 600, 1199)).toEqual([]);
  expect(cuesBetween({ kind: 'lights', on: false }, true, -1, 0)).toEqual(['click']);
});
```

- [ ] **Step 2:** Run `npx vitest run src/ui/effects`. Expected: FAIL, because the modules are missing.
- [ ] **Step 3:** Implement `medicine.ts`, `lights.ts` and `timeline.ts`. The dispatcher switches on `effect.kind`, with no casts.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5: Commit:** `feat: add the medicine and lights timelines`

---

### Task 6: From care to a running effect (effectFor, send result, hooks)

**Files:**
- Create: `src/ui/effects/effectFor.ts` (+test), `src/ui/useReducedMotion.ts` (+test), `src/ui/useCareEffect.ts` (+test)
- Modify: `src/ui/useGame.ts`, `src/ui/useGame.test.ts`

**Interfaces:**
- Consumes: `effectDurationMs`, `effectFrame`, `cuesBetween` (Task 5).
- Produces:
  - `effectFor(action: CareAction, before: PetState, after: PetState): CareEffect | null`. Call it only for an `ok` outcome.
    - feed → `{ kind: 'feed', food: action.food }`
    - clean → `{ kind: 'clean', poops: before.poops }`
    - medicine → `{ kind: 'medicine', cured: !after.sick }`
    - lights → `{ kind: 'lights', on: action.on }`
    - play and pet → `null`
  - `useReducedMotion(): boolean`. It follows `matchMedia('(prefers-reduced-motion: reduce)')`, including its `change` event, and returns false when `matchMedia` is missing.
  - `useCareEffect(opts: { reduced: boolean; onCue(sfx: SfxName): void }): CareEffectPlayer`:
    - `CareEffectPlayer` is `{ readonly frame: EffectFrame | null; play(effect: CareEffect | null): void }`.
    - `play(null)` stops the running effect.
    - The clock ticks every `EFFECT_TICK_MS = 50`, and `reduced` is captured when `play` is called.
  - `UseGame.send(req): Promise<EngineResponse>`. It resolves to the engine's response, and the state updates are unchanged.

- [ ] **Step 1: Write the failing tests.**
  - `effectFor.test.ts`: one test per mapping above. For medicine, test both `after.sick: true` (not cured) and `false` (cured). The clean case uses `before.poops = 3` with `after.poops = 0`, which proves it reads the pet from before.
  - `useReducedMotion.test.ts`:
    - it is true when the stubbed `matchMedia` matches;
    - it flips on a `change` event;
    - it is false when `matchMedia` is undefined;
    - it removes its listener on unmount.
  - `useCareEffect.test.ts` (fake timers):

```ts
const feed = { kind: 'feed', food: 'rice' } as const;
test('a played effect shows at once and ends after its duration', () => {
  const { result } = renderHook(() => useCareEffect({ reduced: false, onCue }));
  act(() => result.current.play(feed));
  expect(result.current.frame?.props.some((p) => p.art.kind === 'food')).toBe(true);
  act(() => void vi.advanceTimersByTime(2600));
  expect(result.current.frame).toBeNull();
  expect(vi.getTimerCount()).toBe(0);
});
test('sound cues fire once each, when their time comes', () => {
  /* onCue: nothing at 550; ['eat'] by 600; ['eat','eat','eat'] by 2600 */
});
test('playing again restarts the effect and drops the old cues', () => {
  /* play feed; at 500 play clean(2): the frame has a broom and no food; no 'eat' fires afterwards; exactly one interval */
});
test('play(null) stops the effect', () => { /* frame null, no timers */ });
test('reduced motion is taken when play is called', () => { /* reduced: true → frame null after 800 */ });
test('play after unmount does nothing', () => { /* unmount, then play(feed): no throw, timer count 0 */ });
```

  - `useGame.test.ts`: `send` resolves to the engine response (`{ ok: true, save, outcome }`), and to the error response when the engine fails.
- [ ] **Step 2:** Run `npx vitest run src/ui`. Expected: FAIL, because the modules are missing and `send` resolves to undefined.
- [ ] **Step 3:** Implement the three modules, and make `send` return the response.
- [ ] **Step 4:** Run `npx vitest run src/ui && npm run typecheck`. Expected: PASS. Every existing `void send(...)` caller still compiles.
- [ ] **Step 5: Commit:** `feat: turn successful care into a playing effect`

---

### Task 7: Drawing a frame on the stage

**Files:**
- Create: `src/ui/components/EffectLayer.tsx` (+test)
- Modify: `src/ui/components/PetStage.tsx`, `src/ui/components/PetStage.test.tsx`, `src/entrypoints/popup/style.css`

**Interfaces:**
- Consumes: `EffectFrame`, `Prop`, `PoopView` (Task 3); `foodUrl`, `effectUrl` and `iconUrl` (Tasks 1 and 2).
- Produces:
  - `EffectLayer({ props, flash }: { props: readonly Prop[]; flash: boolean })`:
    - each prop is an `<img class="fx-prop fx-prop--<art.kind>" alt="">`;
    - its `left`/`top` are `x`/`y` in px;
    - its width and height are the art size (food 32, effect 16, icon 16) × `scale`;
    - a prop whose URL is missing is skipped;
    - `flash` draws `<div class="stage__flash">`.
  - `PetStage` gains the prop `effect?: EffectFrame | null`:
    - pose: `effect?.pose ?? choosePose(...)`;
    - the pet image gets `transform: translateX(<petDx>px)` when `petDx` ≠ 0;
    - poops: `effect?.poops` (when not null) replaces the saved count. A `gone` slot keeps its width (`visibility: hidden`), and `dust0`–`dust2` show the dust art;
    - darkness level: `effect?.dim ?? (asleep && !lightsOn ? 1 : 0)`:
      - level > 0 draws `.stage__dim` with the style `--dim: <level>`;
      - `stage--dark` and the stars show only at level 1;
      - the stars are three `star` effect images (`.effect--star`), drawn above the darkness.
- CSS:
  - `.stage__dim` darkens from the edges: `box-shadow: inset 0 0 0 calc(var(--dim) * 180px) rgba(8, 8, 32, 0.55)`, with no background;
  - `.stage__flash`: a white overlay at 0.7 opacity;
  - `.effect--star`: twinkles with `steps(2)`;
  - `@media (prefers-reduced-motion: reduce)` turns off the star twinkle and `.pet--bounce`.

- [ ] **Step 1: Write the failing tests.**
  - `EffectLayer.test.tsx`:
    - a food prop at scale 2 renders 64×64 at its x/y, with the bitten URL;
    - an icon prop at scale 4 renders 64×64;
    - a missing URL renders nothing;
    - `flash` renders `.stage__flash`.
  - `PetStage.test.tsx`:

```ts
test('an effect pose wins over the usual pose', () => { /* sick pet + effect pose 'eat' → sprite-eat */ });
test('the pet shakes by petDx', () => { /* petDx 4 → style transform translateX(4px) */ });
test('effect poops replace the saved count and keep gone slots', () => {
  /* pet.poops 0 + effect poops [poop, dust1, gone] → 3 slots; the 2nd shows fx-dust1; the 3rd is .poop--gone */
});
test('the room darkens to the effect level, and stars come only when fully dark', () => {
  /* dim 0.5 → .stage__dim with --dim 0.5, no .effect--star, no stage--dark; dim 1 → stars and stage--dark */
});
test('stars show for a sleeping egg with the lights off and no effect', () => { /* egg, asleep, lightsOn false → 3 .effect--star */ });
test('with no effect the stage shows the saved state', () => { /* effect null → existing behavior; the existing tests stay green */ });
```

- [ ] **Step 2:** Run `npx vitest run src/ui/components`. Expected: FAIL.
- [ ] **Step 3:** Implement `EffectLayer`, then the `PetStage` changes. Split `Poops`, the dim layer and `Stars` into small components so each function stays under 50 lines. Then add the CSS.
- [ ] **Step 4:** Run `npx vitest run src/ui/components`. Expected: PASS.
- [ ] **Step 5: Commit:** `feat: draw care effects on the stage`

---

### Task 8: Wiring, sounds and the real-extension test

**Files:**
- Modify:
  - `src/entrypoints/popup/App.tsx`, `src/entrypoints/popup/App.test.tsx`
  - `src/ui/useReaction.ts`, `src/ui/useReaction.test.ts`
  - `e2e/popup.spec.ts`

**Interfaces:**
- Consumes: Tasks 6 and 7, and the sounds from Task 3.
- Produces:
  - `sfxFor(outcome): SfxName | null`:
    - refused → `alert`;
    - play and pet → `happy`;
    - ok feed, clean, medicine and lights → `null`, because the effect's cues make their sounds.
  - `MainScreen` gets a new prop, `playSfx(name: SfxName): void`, and its care flow:

```ts
const care = (action: CareAction) => {
  const before = pet;
  void send({ type: 'care', action }).then((r) => {
    if (r.ok && r.outcome?.result === 'ok') effects.play(effectFor(action, before, r.save.game.pet));
  });
};
```

  - `useReaction` no longer reacts to feed (it handles only play and pet).

- [ ] **Step 1: Write the failing tests.**
  - `useReaction.test.ts`: replace "feed gives eat…" with "feed gives no reaction (the effect shows eating)".
  - `App.test.tsx`: the `send` mocks now resolve to `{ ok: true, save: <after>, outcome }`.

```ts
test('an ok feed plays the eating effect, then the stage returns to normal', async () => {
  /* click feed → rice; await the send promise; the stage has an img.fx-prop--food and sprite-eat at 300 ms;
     after 2600 ms there is no .fx-prop and the pose is the usual one */
});
test('an ok clean sweeps the old poops with the broom', async () => { /* before.poops 2, after 0 → 2 poop slots and a broom at start */ });
test('a refused care keeps the running effect and only shows the toast', async () => { /* … */ });
test('a sync during the feed effect keeps the food on stage', async () => {
  /* at 500 ms, rerender with outcome null and a new save (hunger changed): .fx-prop--food is still there */
});
test('effect cues play sounds when sound is on', async () => { /* feed → AudioContext sees 523, 659 at 600 ms */ });
test('pet and play still show the happy reaction', () => { /* existing */ });
```

  - Replace `'ok feed outcome shows the eat pose for 1s'` and `'an ok feed outcome plays the eat sound…'` with the tests above.
  - `e2e/popup.spec.ts`:

```ts
test('feeding shows the food being eaten on the stage', async ({ context, extensionId, msg }) => {
  const page = await seedAndOpen(context, extensionId, seed({ stats: { hunger: 20 } }));
  await page.getByRole('button', { name: msg('action_feed'), exact: true }).click();
  await page.locator('.panel__item').first().click();
  await expect(page.locator('.fx-prop--food')).toBeVisible();
  await expect(page.locator('.fx-prop--food')).toHaveCount(0, { timeout: 4000 });
});
```

- [ ] **Step 2:** Run `npx vitest run src/entrypoints src/ui`. Expected: FAIL.
- [ ] **Step 3:** Implement the wiring:
  - `useReducedMotion` and `useCareEffect` go in `MainScreen`, and `PetStage` gets `effect={effects.frame}`;
  - `App` passes `playSfx={sfx.play}` and plays `sfxFor(outcome)` only when it is not null;
  - drop feed from `useReaction`.
- [ ] **Step 4:** Run `npm run lint && npm run typecheck && npm run test:coverage`. Expected: all pass, with coverage ≥ 98% on statements.
- [ ] **Step 5:** Run `npx wxt build --mode e2e && npx playwright test`. Expected: every e2e test passes, including the new one.
- [ ] **Step 6: Commit:** `feat: play care effects in the popup`

---

### Task 9: Owner gate and docs

**Files:**
- Modify: `docs/art/style-guide.md`. Also adjust `layout.ts`, the timelines and `style.css` if the owner asks for tuning.

- [ ] **Step 1: Record the effects in the real extension.**
  - Use the e2e build and Playwright (`page.video` or a screenshot every 100 ms, stitched into a GIF).
  - Record these cases:
    - feed rice;
    - feed cake;
    - clean with 1 poop;
    - clean with 3 poops;
    - medicine 1st dose (not cured);
    - medicine 2nd dose (cured);
    - lights off;
    - lights on.
  - Put the recordings on one review page through the brainstorm companion (flat filenames under `/files/`).
- [ ] **Step 2:** Ask the owner for approval in Japanese (Gate E: お世話の演出). Apply what they ask for. Every change keeps its tests green, and a change to timing updates the timeline tests in the same commit.
- [ ] **Step 3:** If the broom (the 16×16 icon at 4×) looks poor to the owner, generate a 32×32 broom:
  - `create_image_pixen`: `cute pixel broom for sweeping, thick black outline`, 3 candidates;
  - same quota rule as Task 2;
  - set `BROOM.scale` to 2 and `PropArt` icon → a new effect id `broom`.
- [ ] **Step 4:** Update `docs/art/style-guide.md` ("Effects (care)") with:
  - the approved pieces;
  - the timing table location (`src/ui/effects/*.ts`);
  - the rule that effect art moves in whole display pixels.
- [ ] **Step 5:** Run `npm run lint && npm run typecheck && npm run test:coverage && npx wxt build --mode e2e && npx playwright test`. Expected: all pass.
- [ ] **Step 6: Commit:** `docs: record the care effects in the style guide`. Also `fix:`/`feat:` commits for any tuning.
