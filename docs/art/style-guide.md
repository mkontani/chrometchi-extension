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
- **The side view keeps the front's shape** (owner review of all 41 forms). `child_mochi`, `adult_unicorn` and `adult_nexus` were remade:
  - `child_mochi` had become a sitting cat. Its new side view says "round like a ball (not a cat, not sitting)".
  - `adult_nexus` had lost its ring and grown feet. Its new side view names the ring and says "no legs, no feet".
  - `adult_unicorn` had a small head and long legs, unlike its chibi front. Editing `idle0` stood it on two legs. Editing the old `side.png` ("make it a cute chibi baby pony: a much bigger round head as big as the body … still standing on all four legs") kept all four legs.
  - Round bodies (mochi, poyo) got a dark vertical line down the middle of the body on every seed. A second `edit_image_pixen` on the side view removed it: "remove the dark vertical line in the middle of the body so the body is one smooth round … ball, keep the tiny feet at the very bottom".
  - Hop loops can still drift: one of two poyo seeds slid out of the frame, and one mochi seed lost its ear mid-hop. Make 2–3 loops and pick one.

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
  - `sprout_wet` (16x16): not AI. `sprout` with every color mapped by a script to the next darker shade of the master palette (leaves `#fbe974` to `#edc24c`, soil `#b4794d` to `#7a4a2a` and `#7a4a2a` to `#441c21`), so it reads as wet soil. Outline and transparency are untouched.
  - `can` (16x16): `a small blue watering can, cute pixel icon, thick black outline, no face`
  - `boar` (24x24): `a cute round baby wild boar, side view, cute pixel art, thick black outline, simple` (pick: seed 33 of 3)
  - `chicken` (24x24): `a cute round white hen chicken, side view, cute pixel art, thick black outline, simple` (pick: seed 11 of 3)
  - `hud_fish`, `hud_meat`, `hud_nuts`, `hud_bush` (16x16, counter icons in the outing games): not AI. Each is the 32x32 food icon (or `bush`) halved by a script (a 2x2 block is kept when 2 of its 4 pixels are opaque, takes its most common non-black color, then the outline is redrawn as a clean 1px `#000000` line), so the black outline stays intact at native size.
- **Hunting pop is a cute animal, never hurt.** A small round boar (meat) or hen (egg) pops out of the grass tuft (owner decision at Gate G). Animals may have eyes (they are creatures, not food or props), but never look scary: no sharp tusks, no angry face, no blood, no injury. Catching one just sends it back into the grass with the star burst; never draw it falling, hurt, crying or dropping meat. Art is drawn at native size (24x24 in a 24x24 box); do not scale it.
- **Where they show:** `float`, `grass`, `bush`, `boar` and `chicken` in the games, `hud_*` in their counters (`src/outings/*/render.ts`); `sprout` while a crop grows (`sprout_wet` once it is watered) and `can` on the water button in `OutingPanel`.

## Dishes

The 11 dishes and the mystery dish (`src/assets/ui/icons/food_<id>.png`, 32x32, plus `src/assets/ui/food/<id>_bite{1,2}.png` from `bite.ts`).

- **Settings for every icon:** `create_image_pixen`, 32x32, `no_background true`, `outline 'single color black outline'`, `detail 'low detail'`, 3 candidates (seeds 1 to 3). Prompt: `<dish words>, cute pixel food icon, thick black outline, no face`.
- **Snap:** nearest color on `docs/art/palette.png`, keep only the largest piece, and force every edge pixel to `#000000` (done by a local script, same result as `reduce_colors`). Then `check.ts --palette --size 32x32`.
- **Dish words and picks** (steak, onigiri, seafoodbowl, friedshrimp, hamburg, stirfry and mushroomsoup were redone at Gate H on 2026-11-05 after the owner said they looked off; the prompts below are the redo prompts, each ending `cute pixel food icon, thick black outline, no face`):
  - `steak`: `a grilled steak with dark grill marks and a small fat edge on a white oval plate with a sprig of green` (seed 11)
  - `acquapazza`: `a whole fish simmered in a shallow pan with tomatoes and greens` (seed 1)
  - `onigiri`: `a white triangle shaped onigiri rice ball with a black nori strip across the bottom and a pink salmon flake on top` (seed 14). It must read differently from `food_rice` (a plain triangle with a nori band): the pink salmon on top is the difference.
  - `omurice`: `omelet rice, a yellow omelet over rice with a red ketchup zigzag line` (seed 1). The ketchup is a zigzag only; never draw it as eyes or a mouth.
  - `seafoodbowl`: `a simple rice bowl seen from above topped with pink fish slices and one shrimp` (seed 11)
  - `friedshrimp`: `two fried shrimp tempura with light brown bumpy breaded coating and red tails on a white plate` (seed 12). Golden breaded, never raw red.
  - `hamburg`: `a thick oval hamburg steak patty with glossy dark brown sauce on top on a white plate with a carrot piece` (seed 11)
  - `stirfry`: `stir-fried vegetables in a dark wok, light green cabbage, orange carrot slices, dark green peppers` (seed 12). Bite frames are cut from a copy without the pan handle area.
  - `mushroomsoup`: `a white bowl of creamy beige soup with mushroom slices on top, top view` (seed 12). No dots or marks that could read as eyes.
  - `fruittart`: `a small fruit tart with berries and apple slices` (seed 3)
  - `mystery`: `a bowl of odd purple stew with bubbles` (seed 2). The spoon tip is trimmed so it does not touch the corner, and loose bubbles are dropped by the snap.
- **Hand-drawn, not AI:** after the Gate H redo only `nutcookie` is hand-drawn (the redo picks are all PixelLab). `nutcookie` (two round cookies with nuts). All 3 candidates were a burger, muffins or a dark disc. It is a union of two circles on the palette (`#e9c89f` body, `#fbe974` light, `#b4794d` shade, `#7a4a2a` nuts). Its bite 1 cuts the front cookie; bite 2 is cut from a copy with only the back cookie, so no thin crescent is left.
- **No faces on food**, including ketchup or toppings. Fish may keep a plain dot eye, as the raw fish icon does.
- **The cooking pot** (`src/assets/ui/cook/pot.png`, 32x32, drawn at 2x by the cook effect): same settings as the icons, prompt `a small round cooking pot with a lid and two handles, cute pixel icon, thick black outline, no face` (seed 2 of 3; none had a face, seed 3 sat on a fire). Snapped and edge-fixed like the icons. The steam is not new art: it reuses the dust puffs `dust0`-`dust2`.

## Coins and shop

Two 16x16 icons (`src/assets/ui/icons/coin.png` and `src/assets/ui/icons/shop.png`). The coin sits in the status bar at 16px. The shop is the action button, shown at 32px like the other action icons. The owner reviews both at Gate J.

- **Settings:** `create_image_pixen`, 16x16, `no_background true`, `outline 'single color black outline'`, `detail 'low detail'`, 3 candidates (seeds 1 to 3). Snap with `reduce_colors` and `docs/art/palette.png`, then `check.ts --palette --size 16x16`.
- **`coin`:** prompt `a shiny round gold coin with a small star stamped in the middle, cute pixel icon, thick black outline, simple, front view, no face`.
  - Pick: seed 1, with its outline and silhouette (a 14x13 octagon).
  - Seed 2's dark star read as a little face, and seed 3 was a 10x10 coin with no star. Seed 1 had no star either: its face snapped to a muddy orange blob.
  - Hand fix: the inside of seed 1 is repainted in the settings icon's gold, with a stamped star in the middle (5 rows, 6 wide). The colors are `#fbe974` light on the upper left, `#edc24c` body, and `#b8862a` shade on the lower right and for the star. The black outline is untouched.
- **`shop`:** prompt `a tiny market stall with a pink and white striped awning, cute pixel icon, thick black outline, simple, front view, no face`.
  - Pick: seed 1, a striped awning over a wooden counter.
  - Seed 2's dark opening with gray teeth read as a mouth. Seed 3 was small and cluttered.
  - Hand fix: the snap turned the awning's hot pink into `#ef8080` salmon. That one color is mapped to `#f58fb0` pink, so the awning stays pink and white as the prompt asks. Nothing else changed.

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
