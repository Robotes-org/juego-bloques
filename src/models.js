/* Everything on the board, as boxes.

   One tile is TILE units across, so every measurement here is readable as a fraction of
   a square: the robot is about two thirds of one, a wall block fills one, a battery is a
   quarter of one. Nothing is rounded and nothing is drawn at an angle — the camera in
   voxel.js is what turns this into a world.

   Model space is x right, y up, z towards the camera, and y = 0 is the underside of the
   ground. GROUND is where things stand. */
var Models = (function () {
  'use strict';

  var box = Voxel.box;
  var decal = Voxel.decal;
  var FRONT = [0, 0, -1];   /* the face Rovi's screen, eyes and mouth are stuck onto */

  var TILE = 26;        /* one square of the level map */
  var SOIL = 7;         /* how thick the ground block is */
  var GROUND = SOIL;    /* the surface everything stands on */
  var WALL = 19;        /* how tall a wall block stands above the ground */
  var TALL = 22;        /* and the tallest anything on the board may be — see flag() */

  var H = TILE / 2;

  /* A block of ground: grass on top, soil down the sides. Only the sides at the very
     edge of the board are ever seen, which is exactly where a world made of blocks
     should look like it was cut out of the earth. The checker is in lightness and not
     in hue — two colours read as two terrains, and a child asks which one is water. */
  function tile(alt) {
    return [box(-H, H, 0, SOIL, -H, H, { top: alt ? 'grassAlt' : 'grass', side: 'soil' })];
  }

  /* Walls are blocks set on the grass rather than holes cut into it. The ground stays
     continuous underneath, which is what makes them read as something in the way rather
     than as something missing.

     Each one is a unit narrower than its square, so a run of them shows a thin line of
     grass between block and block. Flush against each other they merge into one grey
     slab and a child can no longer count how many squares a wall takes up. */
  function wall() {
    var w = H - 1;
    return [box(-w, w, GROUND, GROUND + WALL, -w, w, 'stone')];
  }

  /* Nothing on the board stands taller than TALL, and the flag is the reason the limit
     is written down. Turned 45° and seen from here, one square of the map is about 14
     units of screen height, and a box of height h reaches h·cos(pitch) up the screen —
     so anything much over 22 units draws itself into the square behind it. The first
     flagpole was 30 and ran straight through the robot standing a row further back. */
  /* The pad under the flag is blue and flat, and it used to be a block of soil. On any
     level whose goal sits on an edge square — which is most of them — that block of soil
     landed right beside the island's own soil rim, and the two browns read as one broken
     step in the edge rather than as a flag standing on something. Blue cannot be
     mistaken for the ground it stands on, and it belongs to the flag above it. */
  function post() {
    return [
      box(-10, 10, GROUND, GROUND + 1.5, -10, 10, 'deep'),
      box(-1.5, 1.5, GROUND, GROUND + TALL, -1.5, 1.5, 'dark')
    ];
  }

  /* The cloth is three separate pieces rather than part of the flag, and each one is a
     box centred on its own origin, because the board moves them one at a time: a ripple
     is the same shape lagging a little further behind the higher one. All three in the
     one cyan — the lowest used to be a darker blue for a bit of shading, and once the pad
     below it became that same blue the step sank into it and read as a fin growing out
     of the ground.

     The steps are what the flag is: a pennant cut in three rather than on the diagonal,
     because finer stairs turn into a feather once a tile is small. */
  var CLOTH = [
    { len: 13.5, tall: 7, x: 8.25, y: GROUND + 18.5 },
    { len: 9.5, tall: 5, x: 6.25, y: GROUND + 12.5 },
    { len: 5.5, tall: 5, x: 4.25, y: GROUND + 7.5 }
  ];

  function cloth(step) {
    var s = CLOTH[step];
    return [box(-s.len / 2, s.len / 2, -s.tall / 2, s.tall / 2, -2, 2, 'glow')];
  }

  /* One cube, for the burst the flag leaves behind when the robot reaches it. The colour
     comes from the item rather than from here, so the same shape serves the cyan of the
     flag and the amber that means reward everywhere else on the page. */
  function spark(size) {
    return [box(-size, size, -size, size, -size, size, 'glow')];
  }

  /* A cell standing on end: amber body, dark cap, dark band round the foot. The bolt
     from the flat drawing does not survive being a box, and a battery is recognisable
     from its silhouette alone. */
  function battery() {
    return [
      box(-5, 5, GROUND, GROUND + 3, -5, 5, 'dark'),
      box(-5, 5, GROUND + 3, GROUND + 15, -5, 5, 'gold'),
      box(-3, 3, GROUND + 15, GROUND + 18, -3, 3, 'dark')
    ];
  }

  /* The shadow that ties something with height to the square it stands on. It is a flat
     slab a hair above the grass rather than a drawn ellipse, so it sorts with everything
     else and a wall in front of it covers it properly. `unlit` on the item keeps it the
     flat dark it is meant to be. */
  function shadow() {
    return [box(-9, 9, GROUND + 0.1, GROUND + 0.2, -9, 9, 'dark')];
  }

  /* The head, and the dark screen inset into the front of it. Both are named because the
     face is built on them: the screen is stuck to the head and the eyes and the mouth are
     stuck to the screen, and a decal has to be able to point at what it is stuck to.
     See Voxel.decal for why the face cannot simply be a pile of boxes like the rest. */
  var HEAD = box(-7, 7, 13, 20.5, -5.5, 5.5, 'shell');
  var SCREEN = decal(HEAD, -5.6, 5.6, 14.3, 19.6, -6.2, -5.5, 'screen', FRONT);
  /* The smile is narrow and sits low, with a clear band of dark screen between it and the
     eyes. Until the sorting above was fixed nobody had ever seen it — the screen painted
     over it from every angle — and the first sight of it was a face with its mouth in its
     eyes, because at the size a tile is drawn a gap of half a unit is under one pixel. */
  var MOUTH = decal(SCREEN, -2, 2, 14.9, 15.6, -6.5, -6.2, 'glow', FRONT);

  /* The eyes, given the slot they fill: wide open, or the slit that is a blink. The
     robot has two whole models rather than an eye that can be switched off, because
     closing to a line reads as an eyelid while a face that loses its eyes reads as a
     face that lost its eyes. The mouth stays put through it, for the same reason. */
  function eyes(y0, y1) {
    return [
      decal(SCREEN, -4.3, -1.3, y0, y1, -6.5, -6.2, 'glow', FRONT),
      decal(SCREEN, 1.3, 4.3, y0, y1, -6.5, -6.2, 'glow', FRONT)
    ];
  }

  /* Rovi, the rover of the concept art, without his eyes. Forward is -z and he stands on
     y = GROUND. Reading order is roughly bottom to top: wheels, chassis, neck, head. */
  var BODY = [
    /* Four wheels with a gold hub bolted to the outside of each. They stand proud of the
       chassis by a good two units: tucked under it they vanish at this camera angle, and
       a rover with no visible wheels is a box. */
    box(-9.5, -5.5, 0, 6, -8, -3, 'dark'), box(5.5, 9.5, 0, 6, -8, -3, 'dark'),
    box(-9.5, -5.5, 0, 6, 3, 8, 'dark'), box(5.5, 9.5, 0, 6, 3, 8, 'dark'),
    box(-10.2, -9.4, 1.5, 4.5, -6.6, -4.4, 'gold'), box(9.4, 10.2, 1.5, 4.5, -6.6, -4.4, 'gold'),
    box(-10.2, -9.4, 1.5, 4.5, 4.4, 6.6, 'gold'), box(9.4, 10.2, 1.5, 4.5, 4.4, 6.6, 'gold'),

    /* the chassis, a cyan light bar across its nose and a gold pod on each flank */
    box(-7, 7, 4, 11, -8, 8, 'shell'),
    box(-4, 4, 6, 9.5, -8.7, -8, 'panel'),
    box(-7.7, -7, 6, 9, -2, 2, 'gold'), box(7, 7.7, 6, 9, -2, 2, 'gold'),

    /* neck, head, and the face on the front of it. The screen has to come after the head
       and before the mouth: a decal borrows the place in the queue of the box it is stuck
       to, so its host has to have been given one first. */
    box(-2.5, 2.5, 11, 13, -2.5, 2.5, 'dark'),
    HEAD,
    SCREEN,
    MOUTH,

    /* A cyan strip laid across the top of the head, near the front edge. It is not on
       the concept sheet and it is the one part of the model that is here for the game
       rather than for the look: when the robot walks away from the camera its face is
       hidden, and without a mark on a surface the camera can always see there is no way
       to tell which way it is about to go. */
    box(-4.4, 4.4, 20.5, 20.9, -4.6, -2.2, 'glow')
  ];

  /* Rovi with his eyes open, and Rovi mid-blink. The board swaps one model for the other
     for a tenth of a second every few seconds — see the idle animation in board.js. */
  var ROVI = BODY.concat(eyes(16.8, 18.6));
  var ROVI_BLINK = BODY.concat(eyes(17.5, 17.9));

  /* The antenna is a separate item, not part of the model, because it answers Rovi's
     breathing half a beat late and has to be able to move on its own. It is still in his
     coordinates, so whoever draws it has to give it his position and heading.

     Set towards the back the way the concept draws it. The stalk comes with it: swaying
     the tip alone would leave it floating off the end of its own mast. */
  var ROVI_ANTENNA = [
    box(-0.6, 0.6, 20.5, 24, 3, 4.2, 'dark'),
    box(-1.6, 1.6, 24, 26.5, 2, 5.2, 'glow')
  ];

  /* How far the robot's head reaches above the square it stands on, which is what the
     board has to leave room for when it works out how big a cell can be. */
  var ROVI_TOP = 26.5;

  return { TILE: TILE, GROUND: GROUND, WALL: WALL, ROVI: ROVI, ROVI_BLINK: ROVI_BLINK, ROVI_ANTENNA: ROVI_ANTENNA, ROVI_TOP: ROVI_TOP,
    tile: tile, wall: wall, post: post, cloth: cloth, CLOTH: CLOTH,
    battery: battery, shadow: shadow, spark: spark };
})();
