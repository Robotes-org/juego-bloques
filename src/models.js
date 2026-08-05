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

  /* A pennant cut in three steps, on a pole, planted in a block of soil. Three steps and
     not six: finer stairs turn into a feather once a tile is small. */
  /* Nothing on the board stands taller than TALL, and the flag is the reason the limit
     is written down. Turned 45° and seen from here, one square of the map is about 14
     units of screen height, and a box of height h reaches h·cos(pitch) up the screen —
     so anything much over 22 units draws itself into the square behind it. The first
     flagpole was 30 and ran straight through the robot standing a row further back. */
  function flag(reached) {
    var cloth = reached ? 'gold' : 'glow';
    var shade = reached ? 'soil' : 'deep';
    return [
      box(-8, 8, GROUND, GROUND + 3, -8, 8, 'soil'),
      box(-1.5, 1.5, GROUND, GROUND + TALL, -1.5, 1.5, 'dark'),
      box(1.5, 15, GROUND + 15, GROUND + TALL, -2, 2, cloth),
      box(1.5, 11, GROUND + 10, GROUND + 15, -2, 2, cloth),
      box(1.5, 7, GROUND + 5, GROUND + 10, -2, 2, shade)
    ];
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

  /* Rovi, the rover of the concept art. Forward is -z and he stands on y = GROUND.
     Reading order is roughly bottom to top: wheels, chassis, neck, head, antenna. */
  var ROVI = [
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

    /* neck and head */
    box(-2.5, 2.5, 11, 13, -2.5, 2.5, 'dark'),
    box(-7, 7, 13, 20.5, -5.5, 5.5, 'shell'),

    /* the face: a dark screen inset into the front of the head, with the eyes and the
       mouth standing a hair proud of it so they catch their own light */
    box(-5.6, 5.6, 14.3, 19.6, -6.2, -5.5, 'screen'),
    box(-4.3, -1.3, 16.2, 18.4, -6.5, -6.2, 'glow'), box(1.3, 4.3, 16.2, 18.4, -6.5, -6.2, 'glow'),
    box(-2.6, 2.6, 14.8, 15.8, -6.5, -6.2, 'glow'),

    /* A cyan strip laid across the top of the head, near the front edge. It is not on
       the concept sheet and it is the one part of the model that is here for the game
       rather than for the look: when the robot walks away from the camera its face is
       hidden, and without a mark on a surface the camera can always see there is no way
       to tell which way it is about to go. */
    box(-4.4, 4.4, 20.5, 20.9, -4.6, -2.2, 'glow'),

    /* the antenna, set towards the back the way the concept draws it */
    box(-0.6, 0.6, 20.5, 24, 3, 4.2, 'dark'),
    box(-1.6, 1.6, 24, 26.5, 2, 5.2, 'glow')
  ];

  /* How far the robot's head reaches above the square it stands on, which is what the
     board has to leave room for when it works out how big a cell can be. */
  var ROVI_TOP = 26.5;

  return { TILE: TILE, GROUND: GROUND, WALL: WALL, ROVI: ROVI, ROVI_TOP: ROVI_TOP,
    tile: tile, wall: wall, flag: flag, battery: battery, shadow: shadow };
})();
