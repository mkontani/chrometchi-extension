# Chrometchi art style guide

Style A: retro pop, 32×32, thick black outline, flat colors. Everything in the popup (characters, UI and backgrounds) uses this one style.

## Approved anchors (Gate A)

![anchors](anchors.png)

From left: `baby_puni`, then the egg patterns `plain`, `dots`, `zigzag` and `stars`.

- `src/assets/sprites/baby_puni/idle0.png` is the reference for every character. New sprites should match its outline weight, eye size and level of shading.
- `src/assets/sprites/egg/<pattern>/idle0.png`: all four patterns were adopted. The egg shows `EGG_PATTERNS[(generation - 1) % 4]` (`src/data/eggs.ts`), so each new egg has a different shell.

## Palette

![palette](palette.png)

There are 32 colors, listed in `src/assets/palette.json`. Every sprite is snapped to this palette with `reduce_colors(palette_image=docs/art/palette.png)`, and `npx tsx scripts/art/check.ts --palette <files>` must pass.

## Characters

Generation params: `create_image_pixen(width 32, height 32, no_background true, outline 'single color black outline', detail 'low detail', direction 'south', view 'side')`.

Prompt template (fill `{motif}` from `FORMS`):

```
cute {motif}, chibi virtual pet creature, round simple body, big sparkly eyes, rosy cheeks, front view, full body, centered, thick black outline
```

Poses come from `edit_image_pixen` on the approved `idle0` (seed 1, retry with 2 and 3). Snap the character's `idle0` and its 5 poses to the palette together in one `reduce_colors` call.

`idle1` is made in code, not by AI (Gate C): `npx tsx scripts/art/idle1.ts squash <idle0> <idle1>`. It removes the most redundant row in the lower body, so the top sinks 1px while the feet stay put. AI-made `idle1` frames came out either the same as `idle0` or with a different silhouette, which flickers when the frames alternate every 500ms.

| pose | description |
|---|---|
| happy | same character overjoyed, eyes closed as happy arcs, mouth open smiling, arms up |
| eat | same character eating, mouth wide open chewing |
| sick | same character sick, pale tint, swirly dizzy eyes, sweat drop |
| sleep | same character asleep, eyes closed lines, relaxed, slightly slumped |
| sad | same character sad, teary eyes, frowning, drooping |

## Roaming (Plan 3)

Every form except the egg has `side.png` (right-facing profile) and `walk0`–`walk7` (an 8-frame loop). The roaming view mirrors them when the pet heads left, and turns the pet to face front (`idle0`/`idle1`) when it stops.

- **Move the way the body works** (owner feedback at the walk gate). Each form has a gait in `src/roam/gait.ts`, and its loop is drawn in that gait:
  - walk: on two feet;
  - trot: on all fours (forms whose hands touch the ground);
  - hop: round bodies;
  - crawl: legless forms on the ground;
  - float: legless or winged forms.
- **Loops stay in place.** The code moves the sprite across the page and adds float lift, bob and hop height. Art that travels inside its frame drifts off the edge and gets cut.
- Side view: `edit_image_pixen` on `idle0` (seed 1, retry with 2 and 3), posed for the gait (on all fours, wings spread with legs tucked, no legs and low on the ground…). Name the signature parts (horns, crown, shell, halo) so they survive.
- Loop: `animate_image_pixminimax(frame_count 8, direction 'east', view 'side')` from the side view. Describe the body's motion only, never travel: "slithering forward" and "oozing forward" drifted out of the frame on two seeds, while "undulating in place … no forward movement" stayed put. For winged flyers, "the body stays level and upright … no turning, no spinning" stopped them tumbling.
- Snap `idle0`, `side` and the 8 frames to the palette together in one `reduce_colors` call. Never write `idle0` back.
- Other tested loop wording:
  - trot: `trotting in place on all four legs, legs moving in a diagonal walking gait, … staying centered in the frame like on a treadmill`;
  - hop: `squashing and stretching in place as if hopping … staying on the ground in the center of the frame`;
  - float, legless: `floating in place, hovering with a gentle up and down bob …, no legs, no walking`.

## Effects (care)

Effects play on the popup stage after feed, clean, medicine and lights (`src/ui/effects/`). The owner approved all of them at Gate E (2026-11-04).

- **Timing** lives in one pure timeline per care: `src/ui/effects/{feed,clean,medicine,lights}.ts`. Each one says what the stage shows at a given millisecond. Positions on the stage are in `src/ui/effects/layout.ts`.
- **Every effect moves in whole display pixels.** Props sit on even x and y, scale only by whole numbers, and step instead of gliding. The pet only shakes by ±4px. `src/ui/effects/timeline.test.ts` checks this for every effect.
- **Reused art:** the 6 foods, `pill`, `sparkle`, `sweat`, the `lights` button as the switch, and the `clean` button at 4× as the broom.

- **Bitten foods** come from a script, never from AI: `npx tsx scripts/art/bite.ts <1|2> src/assets/ui/icons/food_<id>.png src/assets/ui/food/<id>_bite<n>.png`.
  - It cuts round bites from the right side and drops any piece the bite leaves floating.
  - It outlines the new edge in `#000000`.
  - A new food only needs the script run twice.
- **Crumbs, dust and star** (`crumb`, `dust0`–`dust2`, `star`, 16×16) are drawn as exact pixel maps on the palette, not by AI.
  - The prompt `cute pixel … effect` gave even crumbs and dust a face on 9 of 9 tries.
  - The dust puffs are unions of circles, with a 1px black outline, a white highlight on the upper left and `#8d9191` shade on the lower right.

## Pantry and outings

Art for the pantry, the outing games and the farm row (`src/assets/ui/outing/`, shown at 2x or more; the owner reviews it at Gate F).

- **No faces on food or props.** `create_image_pixen` gave the round bush a face on 3 of 3 tries, so the bush is drawn by hand (below). The fruit icon (an apple in front of a bunch of grapes) is hand-drawn on the palette, because PixelLab gave the apple a face on 3 of 3 tries; the owner picked it after Gate F. The egg food was hand-drawn (Task 1).
- **Settings for every piece:** `no_background true`, `outline 'single color black outline'`, `detail 'low detail'`, 3 candidates each. Snap the pick with `reduce_colors` and `docs/art/palette.png`, then run `npx tsx scripts/art/check.ts --palette --size <WxH> <files>`.
- **Pieces, sizes and prompts:**
  - `float` (16x16): `a red and white fishing float, cute pixel icon, thick black outline, no face`
  - `grass` (32x32): `a tuft of tall green grass, cute pixel art, thick black outline, no face`
  - `bush` (32x32): prompt `a round green bush, cute pixel art, thick black outline, no face`; all 3 results had faces or were trees, so the final art is a hand-drawn pixel map on the palette (union of circles, 1px black outline, `#86e7b0` light upper left, `#317352` shade lower right).
  - `sprout` (16x16): `a small green sprout in soil, cute pixel icon, thick black outline, no face`
  - `can` (16x16): `a small blue watering can, cute pixel icon, thick black outline, no face`
  - `boar` (24x24): `a cute round baby wild boar, side view, cute pixel art, thick black outline, simple` (pick: seed 33 of 3)
  - `chicken` (24x24): `a cute round white hen chicken, side view, cute pixel art, thick black outline, simple` (pick: seed 11 of 3)
  - `hud_fish`, `hud_meat`, `hud_nuts`, `hud_bush` (16x16, counter icons in the outing games): not AI. Each is the 32x32 food icon (or `bush`) halved by a script (a 2x2 block is kept when 2 of its 4 pixels are opaque, takes its most common non-black color, then the outline is redrawn as a clean 1px `#000000` line), so the black outline stays intact at native size.
- **Hunting pop is a cute animal, never hurt.** A small round boar (meat) or hen (egg) pops out of the grass tuft (owner decision at Gate G). Animals may have eyes (they are creatures, not food or props), but never look scary: no sharp tusks, no angry face, no blood, no injury. Catching one just sends it back into the grass with the star burst; never draw it falling, hurt, crying or dropping meat. Art is drawn at native size (24x24 in a 24x24 box); do not scale it.
- **Where they show:** `float`, `grass`, `bush`, `boar` and `chicken` in the games, `hud_*` in their counters (`src/outings/*/render.ts`); `sprout` while a crop grows and `can` on the water button in `OutingPanel`.

## Eggs

- **Eggs never have a face** (no eyes, mouth or cheeks). This is owner feedback from Gate A.
- Do not use the character template for eggs, because it adds eyes and cheeks. Even with "no face" in the prompt, `create_image_pixen` still drew a face on 4 out of 4 tries. Make egg variants with `edit_image_pixen` starting from `egg/plain/idle0.png`, with instructions like "add …, keep the same egg shape, … No face."
- `idle1` (the wobble frame) is also made in code: `npx tsx scripts/art/idle1.ts nudge <idle0> <idle1>` moves the whole shell 1px right. Shifting only part of the shell leaves a kink in the outline.

## Do / don't

- Do keep a 1px black outline around the whole silhouette, flat fills with at most one shade step, and a transparent background (`check.ts` rejects opaque corners and half-transparent pixels).
- Do review every candidate at 4× (128px, as in the popup) before approving it.
- Don't draw faces on eggs.
- Don't copy or closely imitate characters or names from existing franchises. Renamed examples: Akubiba, Horimo, Custa.
- Don't use fine detail or soft gradients. The old art looked coarse and cheap, and the goal is a simple, clean, cute Tamagotchi-like look.
