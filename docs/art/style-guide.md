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
