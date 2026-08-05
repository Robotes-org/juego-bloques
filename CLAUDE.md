# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Purpose

`juego-bloques` is **Ruta Robot**, a block-programming game for the 3rd and 4th grade
children of the workshop (8 to 10 years old). The child stacks blocks — *avanzar*,
*girar*, *repetir* — to walk a robot across a grid to a flag, picking up batteries on
the way. Twelve levels introduce one idea at a time and end with loops inside loops.

It is a teaching tool for the workshop, not a product. The robot lives on screen only:
there is no Arduino export and no serial link to a real robot. If that is ever added it
belongs behind a separate button, not woven into the block model.

## Stack

Plain HTML, CSS and JavaScript. No build step, no dependencies, no framework, no CDN.

**The scripts are classic `<script src>` files, not ES modules, and the levels live in a
`.js` file rather than JSON — both on purpose.** ES modules and `fetch` are blocked by
the browser under `file://`, and the game has to survive being copied to a pendrive and
opened with a double click in a rural school with no server and no connection. Do not
convert `src/*.js` into modules, and do not load level data with `fetch`.

```sh
xdg-open index.html          # works straight from the filesystem
python3 -m http.server 8000  # only if you want a server, not required
./tools/test.sh              # levels + game
```

## Files

- `index.html` — the whole page structure.
- `styles.css` — all the styles.
- `src/levels.js` — the twelve levels as ASCII maps. **Start here to change the game.**
- `src/board.js` — parses a map, builds it as a world of boxes, moves the robot.
- `src/voxel.js` — the one camera the board is drawn under. **Loads before the two below.**
- `src/models.js` — every shape on the board, as boxes: ground, wall, flag, battery, Rovi.
- `src/editor.js` — the palette and the block tree the child builds, including drag and drop.
- `src/runner.js` — flattens the block tree into moves and plays them back.
- `src/game.js` — glue: level navigation, progress, messages, win dialog.
- `tools/solver.js` — breadth-first solver, shared by the checker and the tests.
- `tools/check-levels.js` — proves every level is solvable and that `par`/`max` are honest.
- `tools/test.html`, `tools/test.sh` — the test suite, run in headless Chrome.
- `assets/tokens.css`, `assets/logo/favicon.svg` — **copied from `~/marca`, do not hand-edit.**
  Refresh with `cp ~/marca/assets/tokens.css assets/tokens.css`.
- `assets/fonts/nunito-latin.woff2` — Nunito, self-hosted, latin subset only, 39 KB.
  Variable font, so the one file covers every weight. Licence in `assets/fonts/OFL.txt`.
- `assets/fonts/silkscreen-latin.woff2` — Silkscreen, the pixel face, 7 KB, same subset.
- `assets/rovi-concept.png` — the concept sheet the whole skin comes from. Not loaded by
  the game; it is here so the next person can see what the page is trying to look like.

## How a level is won

**Reaching the flag finishes the level. The three batteries are the three stars.** They
are deliberately not a gate: a child who cannot see the clever route still moves on, and
the batteries are the reason to come back to a level already beaten. Do not make them
mandatory again — that was the first design and it turned every level into pass or fail.

**All twelve levels are currently open**, whatever the child has finished: `UNLOCK_ALL`
at the top of `src/game.js` is `true`. Setting it back to `false` restores unlocking each
level with the previous one — the code for that path is still there and still works.

Stars are only ever the batteries collected. There is no block-count par: counting blocks
is an adult's idea of elegance, and *"you used 7, it can be done in 5"* means far less to
an eight year old than a battery they can see sitting in a corner of the map.

## Adding or changing a level

Levels are ASCII maps in `src/levels.js`, one character per cell, all rows the same
length: `.` floor, `#` wall, `R` the robot's start, `M` the goal, `*` a battery.

```js
{
  name: 'El pasillo largo',
  hint: 'Son muchos pasos iguales. Usa "repetir".',
  dir: 'E',                          // N, E, S or O — where the robot looks at the start
  blocks: ['forward', 'repeat'],     // which blocks the palette offers, in this order
  max: 3,                            // optional hard cap on blocks
  map: ['..........', 'R..*.*.*.M', '..........']
}
```

**Every level carries exactly three batteries.** Two and three stars are unreachable;
four and one star is hidden for good. The checker enforces the count.

**Always run `node tools/check-levels.js` after touching a map.** It searches for two
different routes, because the child experiences two different goals: the short way to the
flag, and the way that also collects all three batteries. A level is broken if either one
does not exist. Three of the twelve levels shipped broken until it was written — one had
no goal at all, and *La vuelta completa* had a short cut straight up the inside that made
its loop pointless.

`max` is what actually teaches the loop. Without a cap a child can always brute-force a
long corridor with a pile of *avanzar* blocks, which is exactly the habit the level is
trying to break.

**Where a level has a `max`, put the batteries on the route the pattern itself walks.**
Getting the loop right then collects all three with no detour, which is the reward for
seeing the pattern. Asking for a detour under a block cap is asking for three stars the
limit makes impossible — the checker warns when the battery route costs more than 1.5×
the direct one on a capped level. Where the level is about reading the map instead, put
some batteries off the direct path so the detour is the challenge.

## Conventions

- **Code in English, content in Spanish.** Class names, ids, file names, comments and
  commit messages are English. Every string a child reads is Chilean Spanish.
- **Text for eight year olds.** Short sentences, verbs they know, and failure messages
  that say what went wrong rather than that they failed ("El robot chocó con un muro.
  Revisa por dónde gira." — never "Error" or "Incorrecto").
- **The palette is the concept's, and it is the one place this repo writes its own
  colours.** The eight `--rovi-*` swatches at the top of `styles.css` are sampled from
  `assets/rovi-concept.png`; everything else on the page is an alias of one of them. The
  house rule is still that a colour lives in `~/marca` first, and this branch breaks it
  knowingly: the concept is not brand material until somebody decides it is, and eight
  swatches should not be written into the manual on the strength of one image. **If the
  concept is adopted, move that block to `~/marca/assets/tokens.css` as its own family
  and turn `:root` back into aliases.** Until then, do not add a ninth colour here —
  derive it with `color-mix` from the eight, the way `--rovi-naranja` is derived.
- Contrast is measured, not eyeballed, and the numbers are in the comment at the top of
  `styles.css`. Two of them are load-bearing: the raw concept blue only reaches 3.52:1
  under block text, so blocks are painted in its lighter face; and `--rovi-piedra` is a
  wall colour, never text on navy.
- **The page has one fixed appearance and must keep it.** It aliases raw values in
  `:root` instead of the semantic `--rb-fondo` / `--rb-texto` roles, which flip with
  `prefers-color-scheme`. A child whose laptop is in dark mode must see the same board as
  the one projected at the front of the room. The skin is now dark, which is what the
  concept asks for — the rule was never "be light", it was "be the same on every laptop
  in the room".
- **Yellow is the reward.** Amber is the batteries, the stars, the pips and the levels
  finished with all three — never a button and, since this skin, never a block either.
  That is why `repetir` is `--rovi-naranja` and not the amber it started as, and why the
  running block's halo is cyan: an amber glow around an amber block is invisible, on
  exactly the piece a child is being told to watch.
- Blocks are coloured by family, like Scratch: movement is blue, `repetir` is orange. Do
  not give *avanzar* and *girar* different colours — they are the same idea to a child.
  These children move on to Scratch afterwards, and the colour memory is part of what
  they take with them.
- **Two faces, and each has a job.** Nunito (`--game-font-block`) sets the blocks and
  every sentence a child reads. Silkscreen (`--game-font-pixel`) sets names and labels:
  titles, chips, buttons, the brand. The concept does the same thing — pixel type on its
  plates, a rounded sans in its paragraphs — and it is also the readable answer, because
  a pixel face costs an eight year old real speed over a full line.
- **Silkscreen never sets a digit the child has to act on.** Its 4 has an open top that
  reads as a blob and its 5 reads as an S. Level numbers, the count inside a `repetir`
  and the block counter are all Nunito for that reason. Pixelify Sans was tried first and
  dropped over the same glyphs. In a level's own name the number is incidental, so the
  title chip keeps its pixel type.
- Both faces are self-hosted rather than loaded from a CDN because the game has to open
  from a pendrive with no connection — the same reason the scripts are not ES modules.
  Fonts are the one design decision deliberately kept out of `~/marca`: the founder chose
  to keep them local to the game rather than declare a "workshop typeface" in the manual.
  If a second piece of children's material ever needs them, move them to `~/marca` then
  rather than copying the `@font-face` across.
- **Both ways of adding a block have to keep working.** Clicking a palette block appends
  it; dragging drops it exactly where you want. Dragging is still hard at eight, and
  clicking is what most children use for the first few sessions.

## The controls

Five buttons, and the split between the last two is the one worth protecting:

- **Ejecutar** (play) runs the program. On a run paused mid-way it carries on from there
  rather than starting over — `session.resume()`.
- **Paso** runs exactly one block and waits. This is the debugger: the piece that just
  ran stays lit in the program and the status line says which step of how many. It is the
  answer to "my program is wrong and I don't know where".
- **Detener** stops the robot **where it is**, so the child can look at where it went
  wrong. It does not move the robot back.
- **Reiniciar** is what puts the robot at the start.
- **Rápido / Normal** is the speed toggle.

Step mode is not a separate code path: `Runner.run({manual: true})` is the same machinery
with the clock switched off, and `step()` drives one tick by hand. Keep it that way — a
second interpreter for stepping would drift from the real one, and then the debugger
would lie.

## The Rovi skin

The page is dressed as the concept sheet in `assets/rovi-concept.png`: a voxel world,
navy chrome, a cream and cyan rover.

- Everything outside the board fakes depth the way a flat interface can: **a lit top edge
  and a shaded bottom edge**, which is what `--face-lit` and `--face-dark` are for. Every
  panel, chip and button uses them.
- The goal flag is cyan and the grass is green, which is not a free choice: a green flag
  on green ground disappears. Cyan is also the concept's own colour for something powered
  up, which is why it is on the flag, the eyes, the running block and the drop indicator.
- The clouds behind the board are five flat `linear-gradient` layers on `.board-wrap`,
  hard-edged on purpose. A blurred radial cloud would be the only soft thing on the page.
- The three battery pips beside the level name are the last flat drawing of a battery
  left in the page, and the only reason `.pip .battery-*` fill rules still exist.

## The board is one canvas, under one camera

The board — ground, walls, flag, batteries and robot — is a pile of axis-aligned boxes
painted into a single canvas from one fixed viewpoint: the map turned 45° and looked at
from above and in front. Three files, one job each:

- `src/voxel.js` — the camera, the projection, the lighting and the painting. Nothing in
  it knows what a level is.
- `src/models.js` — every shape on the board, as boxes, measured in fractions of a tile.
- `src/board.js` — the level, the state and the clock. It owns the animation loop and
  exposes exactly the API the runner has always called.

**The rule worth protecting is that there is one camera.** The way it gets broken is not
by a redesign, it is by drawing "just this one thing" some other way — a CSS marker on
top, a second canvas, an icon positioned by hand. Anything that appears on the board goes
through `models.js` and gets drawn with everything else.

The earlier version of this file said an isometric board would rewrite the level maps and
the drag-and-drop hit testing. That was wrong about the second half and worth correcting:
**the board has no pointer interaction at all** — the dragging is in the block editor,
which never touches it. The maps did not change either. What changed was only how the
board is drawn.

Things that are easy to get wrong:

- **Nothing may stand taller than `TALL`** (22 units, about 0.85 of a tile). Turned 45°
  and seen from here, one square is about 14 units of screen height, while a box of
  height *h* reaches *h·cos(pitch)* up the screen. Go over the limit and a thing draws
  itself into the square behind it: the first flagpole was 30 units and ran straight
  through a robot standing a row further back. The robot is the one exception, and only
  because it is what the eye is following anyway.
- **Painter's algorithm is exact here, not approximate.** Every part is a convex box on a
  common plane, so sorting by the depth of each box's centre is enough — no z-buffer, no
  per-face sorting, no WebGL. Keep new shapes convex and box-shaped and it stays true.
- **Wall blocks are a unit narrower than their square.** Flush against each other they
  merge into one grey slab and a child can no longer count how many squares a wall takes
  up. The thin line of grass between them is what makes them countable.
- **The ground is grass on top and soil down the sides.** Only the sides at the very edge
  of the board are ever seen, which is exactly where a world made of blocks should look
  like it was cut out of the earth. The checker is in lightness and not in hue — two
  colours read as two terrains, and a child asks which one is water.
- **The contact shadow under the robot is not decoration.** It is the only thing tying
  something with height to the square it stands on. It is a flat slab a hair above the
  grass rather than a drawn ellipse, so it sorts with everything else and a wall in front
  of it covers it properly.
- **The cyan strip across the top of the robot's head is there for the game, not for the
  look.** It is not on the concept sheet. When the robot walks away from the camera its
  face is hidden, and without a mark on a surface the camera can always see there is no
  way to tell which way it is about to go.
- **Colours are read off the `--rovi-*` tokens at startup**, so the board still follows
  the palette. The fallbacks in `voxel.js` exist because a missing custom property
  produces an unparseable `fillStyle`, which the canvas ignores *without an error* — the
  board would just quietly stop being drawn. For the same reason, **do not delete a
  `--rovi-*` token because CSS never mentions it**: half of them are only read from JS.
- **`fit()` measures rather than calculates.** It projects the world at scale 1, takes the
  outline, and picks a scale from it — which is why it copes with any level shape without
  knowing anything about the map. The room it leaves above is the robot's own height: it
  can be standing on the farthest square, where its head reaches past the top edge of the
  ground.
- **The board is never told how fast the child set the game.** It times the gap between
  two orders from the runner and moves in a little less than that, so the robot always
  arrives before it is asked to do the next thing. That is why the speed toggle needs no
  wiring here.
- **Opening a level builds it**: one block of ground at a time, from the far corner
  towards the near one, and then everything standing on the world drops in together. The
  sweep runs away-to-near because with the board turned 45° that reads as the world
  coming to meet you. A wall and the ground under it are one item so they rise together —
  a block arriving on top of a square still on its way up looks like a mistake.
- `prefers-reduced-motion` is checked in JS and switches off the build, the walk and the
  turn. CSS cannot reach inside a canvas, so nothing about the board appears in the media
  query in `styles.css`.
- The animation loop runs only while something is moving and stops itself afterwards.
- **Reaching the flag breaks it into cubes.** The flag lifts off and is gone in a fifth
  of a second, and two dozen small boxes are thrown out and up from where it stood — cyan
  because that is what the flag was, amber because that is what a reward is everywhere
  else on the page. Each one is given a velocity once and then placed by arithmetic on
  its own age, so the shower cannot drift when a frame is late and no timestep has to be
  passed around. They rest on the grass rather than falling through the world.
  **The win dialog waits 620 ms for it** (`win()` in `game.js`). Without that pause the
  burst plays behind the scrim and the child reads about winning instead of seeing it.


## Design decisions worth keeping

- **Blocks are cut to a puzzle-piece silhouette with `clip-path`** — a notch on top, a
  bump below, and a negative bottom margin that pulls the next block up until its notch
  swallows the bump. The look is Scratch's on purpose: it is where these children go
  next, so the pieces should already feel familiar. Two things follow from `clip-path`:
  `outline` and `box-shadow` are cut off (the running piece is marked with a
  `drop-shadow` halo, which follows the silhouette), and the bump has to live *inside*
  the box, which is what the extra bottom padding is for.
  **The pieces stayed Scratch-shaped when the rest of the page went voxel**, and that was
  a decision rather than an oversight: the shape and the two family colours are what a
  child carries over to Scratch afterwards, so the skin changes around them.
- **Rounded corners are points, not a radius.** `polygon()` only draws straight lines, so
  each corner is three extra vertices along the quarter circle, from the `--r1/--r2/--r3`
  offsets in `:root`. Changing `--piece-radius` rescales them all.
- **The outline is two nested spans (`.piece` > `.piece-face`), and it has to be two.**
  CSS applies `clip-path` *after* `filter`, so an element carrying both clips away its
  own outline — which is exactly what happened on the first attempt, and it renders as no
  outline at all rather than as an error. The outer span carries the drop-shadows, the
  inner one the silhouette. They are empty on purpose: put the filter on the block itself
  and the text gets outlined too.
- The head and the foot of a `repetir` each drop the drop-shadow facing the body, or a
  dark line cuts across the middle of the C.
- Outline colours are `color-mix` of the block colour towards Pizarra, not two more hex
  values, so they follow the tokens. A browser too old for `color-mix` just loses the
  outline.
- Nothing on the board is an element any more, so the old rules about sprites and cells
  are gone with them. One is worth keeping as a warning about percentages in CSS: a
  `padding: 12%` on a battery sprite resolved against the *board's* width rather than the
  sprite's, came out wider than a whole cell, collapsed the content box to zero and made
  every battery invisible while the model still counted them.
- The program is redrawn from the block tree after every edit. Programs are tens of
  blocks at most, so a full redraw is fast enough and far easier to trust.
- Drag and drop uses pointer events, not the HTML5 drag-and-drop API, which cannot show
  an insertion point inside a nested `repeat`.
- The drop indicator has negative margins that cancel its own height, and containers
  space their children with margins instead of `gap`. Otherwise inserting the indicator
  pushes the list down and moves the very block the cursor is measured against, and the
  insertion point flickers between two positions.
- `Runner.MAX_STEPS` caps a compiled program at 600 moves. Three nested `repetir 10`
  blocks are 1000 moves and would otherwise hang the page.

## Pending

- Sound. A step tick, a bump and a small fanfare would help the youngest children, but
  every laptop in the room playing it at once needs a mute button first.
- A level editor for the teacher. Today a new level means editing `src/levels.js`, which
  is fine for whoever reads this file and not for anyone else.
- Touch support. The drag code uses pointer events and already has `touch-action: none`,
  so tablets are close, but nothing has been tested on one and the layout is built for a
  notebook screen.
- Watching a class use the turned board. A 45° world means "north" is now up and to the
  left, and nobody has yet seen an eight year old predict *avanzar* on it. The hints and
  the block names are all relative to the robot rather than to the screen, which should
  be what saves it, but that is a guess until a session says otherwise.
- Self-hosted Space Grotesk and Inter as subset `woff2`, same as `website`.
