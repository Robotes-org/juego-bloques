/* Board: parses a level map, builds it as a world of blocks and moves the robot around
   it. The drawing is all in voxel.js, under one fixed camera; the shapes are all in
   models.js; what lives here is the level, the state and the clock.

   Nothing outside this file knows the board is a canvas. `moveTo`, `turnTo`, `bump`,
   `takeBattery` and `celebrate` are the same calls the runner has always made — the
   difference is that they now set a target and let the animation loop get there, instead
   of setting a CSS property and letting the browser do it. */
var Board = (function () {
  'use strict';

  var DIRS = { N: { dx: 0, dy: -1, deg: 0 }, E: { dx: 1, dy: 0, deg: 90 }, S: { dx: 0, dy: 1, deg: 180 }, O: { dx: -1, dy: 0, deg: 270 } };
  var ORDER = ['N', 'E', 'S', 'O'];

  var TILE = Models.TILE;

  /* Opening a level builds it: one block of ground at a time, from the far corner
     towards the near one, and then everything that stands on the world drops in. */
  var BUILD_STEP = 14, BUILD_RISE = 280, BUILD_PAUSE = 60, DROP_MS = 360;

  /* Walking and turning follow the speed the child chose, which the board is never told:
     it measures the gap between two orders instead and moves in a little less than that,
     so the robot always arrives before it is asked to do the next thing. */
  var MOVE_MIN = 90, MOVE_MAX = 300;
  var BUMP_MS = 380, HOP_MS = 520, TAKE_MS = 300;

  /* Reaching the flag breaks it into a burst of cubes. The numbers are in units and
     seconds — one square is 26 units — and gravity is what makes the shower read as
     something falling rather than as a firework. The whole thing is over in under a
     second because the win dialog is on its way: the runner waits one move's delay
     before it opens, and after that the board is behind a scrim. */
  var FLAG_MS = 220, SPARKS = 24, GRAVITY = 220;

  /* A battery that is only sitting there is scenery. Turning slowly, breathing up and
     down and trailing a few motes is what makes a child read it as something to go and
     get. MOTE_MS is how long one mote takes to climb and fade. */
  var MOTES = 3, MOTE_MS = 1800, SPIN_MS = 5200, BOB_MS = 1700;

  /* And Rovi, who is alive whether or not anyone is asking him to do something: he
     breathes, his antenna answers half a beat late, and every few seconds he blinks.
     The blink is the one that does the work — a face with eyes that never close is a
     drawing of a face. It is kept short: long enough to see, too short to look like the
     robot has stopped working. */
  var BREATH_MS = 2600, BLINK_EVERY = 3800, BLINK_MS = 130;

  /* And one ripple down the pennant. Slower than a real flag on purpose: at anything
     brisker the steps read as flickering rather than as cloth. */
  var WAVE_MS = 1600;

  /* The shimmer never stops, so unlike everything else on this board it would hold the
     animation loop open for as long as a level is on screen. It gets its own slower
     clock: a full redraw is the whole board, and a child staring at a puzzle does not
     need sixty of them a second. */
  var IDLE_FPS = 24;

  /* Turns the ASCII rows of a level into something the game can query. */
  function parse(level) {
    var rows = level.map;
    var cols = rows[0].length;
    var walls = {}, batteries = [], start = null, goal = null;

    for (var y = 0; y < rows.length; y++) {
      for (var x = 0; x < cols; x++) {
        var c = rows[y].charAt(x);
        if (c === '#') walls[x + ',' + y] = true;
        else if (c === 'R') start = { x: x, y: y };
        else if (c === 'M') goal = { x: x, y: y };
        else if (c === '*') batteries.push({ x: x, y: y });
      }
    }
    return {
      cols: cols,
      rows: rows.length,
      walls: walls,
      batteries: batteries,
      start: start,
      goal: goal,
      dir: level.dir
    };
  }

  function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  function create(el, level) {
    var g = parse(level);
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    el.innerHTML = '';
    var canvas = document.createElement('canvas');
    canvas.className = 'board-canvas';
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'Tablero del nivel');
    el.appendChild(canvas);

    var scene = Voxel.create(canvas, el);

    /* The map is laid out around the origin so that the projected world is centred on
       whatever space the board is given. */
    function wx(gx) { return (gx - (g.cols - 1) / 2) * TILE; }
    function wz(gy) { return (gy - (g.rows - 1) / 2) * TILE; }

    /* ---------- the world ---------- */

    var ground = [];
    for (var y = 0; y < g.rows; y++) {
      for (var x = 0; x < g.cols; x++) {
        var isWall = !!g.walls[x + ',' + y];
        // A wall and the ground under it are one item so they rise together: a block
        // arriving on top of a square that is still on its way up looks like a mistake.
        var model = Models.tile((x + y) % 2 === 1);
        if (isWall) model = model.concat(Models.wall());
        ground.push({ model: model, x: wx(x), z: wz(y), y: 0, gx: x, gy: y, wall: isWall });
      }
    }

    /* One at a time, but away from the camera first: with the board turned 45° the far
       corner is where the eye starts, and a sweep that runs towards the viewer reads as
       the world coming to meet them. Ties are broken so that no two blocks ever share a
       turn — the point of the whole thing is that they arrive one by one. */
    ground.slice().sort(function (a, b) {
      return (a.gx + a.gy) - (b.gx + b.gy) || a.gx - b.gx;
    }).forEach(function (t, i) { t.turn = i; });

    /* The flag is the pole and its pad; the cloth above it is three more items, one per
       step, so that each can lag behind the one above it and the pennant ripples. */
    var goalItem = { model: Models.post(), x: wx(g.goal.x), z: wz(g.goal.y), y: 0 };

    var clothItems = Models.CLOTH.map(function (s, i) {
      return { model: Models.cloth(i), home: s, step: i,
        x: goalItem.x + s.x, z: goalItem.z, y: s.y };
    });

    var batteryItems = g.batteries.map(function (b, i) {
      return { model: Models.battery(), x: wx(b.x), z: wz(b.y), y: 0, gx: b.x, gy: b.y,
        takenAt: 0, phase: i * 2.1 };
    });

    /* Three motes circling each battery, rising and fading as they go. They are made
       once and moved every frame rather than spawned and collected: a level runs for
       minutes and nothing that lives that long should be allocating.

       Their whole motion is a function of the clock, so there is no state to keep in
       step and no drift — a mote that is a frame late simply appears where it should
       have been. `phase` is what stops three of them travelling as one. */
    var motes = [];
    batteryItems.forEach(function (b, bi) {
      for (var m = 0; m < MOTES; m++) {
        motes.push({
          model: Models.spark(1.3 + (m % 2) * 0.6),
          of: b,
          phase: m / MOTES + bi * 0.37,
          /* Cream reads as a glint and amber as the battery's own light. Both, so the
             halo sparkles instead of glowing one flat colour. */
          tint: m % 2 ? 'gold' : 'shell',
          /* Unlit, unlike everything else on the board: a mote shaded by the same light
             as the ground looks like a chip of something lying about. At full colour on
             every face it reads as giving off light instead of catching it. */
          unlit: true,
          x: 0, y: 0, z: 0, yaw: 0, alpha: 0
        });
      }
    });

    var shadowItem = { model: Models.shadow(), x: 0, z: 0, y: 0, unlit: true, alpha: 0.22 };
    var robotItem = { model: Models.ROVI, x: 0, z: 0, y: Models.GROUND, yaw: 0 };
    /* The antenna rides with the robot — same square, same heading — and is only its own
       item so that it can lag half a beat behind him. */
    var antennaItem = { model: Models.ROVI_ANTENNA, x: 0, z: 0, y: Models.GROUND, yaw: 0 };

    var props = [goalItem].concat(clothItems, batteryItems);
    var world = ground.concat(props, motes, [shadowItem, robotItem, antennaItem]);
    var sparks = [];      /* what is left of the flag, while it is still in the air */

    /* ---------- state ---------- */

    var builtAt = performance.now();
    var buildEnd = builtAt + ground.length * BUILD_STEP + BUILD_RISE;
    var dropAt = buildEnd + BUILD_PAUSE;

    var pos = { x: g.start.x, y: g.start.y };      /* the square the robot is on */
    var from = { x: g.start.x, y: g.start.y };     /* and the one it is walking out of */
    var moveAt = 0, moveMs = MOVE_MAX;
    var spin = ORDER.indexOf(level.dir) * 90;
    var yawFrom = spin, yawTo = spin, turnAt = 0, turnMs = MOVE_MAX;
    var bumpAt = 0, hopAt = 0, goalAt = 0;
    var lastOrder = 0;
    var raf = 0, lastDraw = 0;

    /* The flag comes apart into cubes thrown out and up from where it stood. Each one is
       given a velocity once and then placed by arithmetic on its own age, so the shower
       does not drift if a frame is late and needs no timestep passed around. */
    function shatter(at, count, tints, scale) {
      var now = performance.now();
      for (var i = 0; i < count; i++) {
        var a = Math.random() * Math.PI * 2;
        var out = (35 + Math.random() * 60) * scale;
        sparks.push({
          model: Models.spark((1.4 + Math.random() * 2) * scale),
          x0: at.x + Math.cos(a) * 4,
          z0: at.z + Math.sin(a) * 4,
          y0: Models.GROUND + 6 + Math.random() * 14,
          vx: Math.cos(a) * out, vz: Math.sin(a) * out,
          vy: (95 + Math.random() * 70) * scale,
          spin: (Math.random() - 0.5) * 260,
          born: now,
          life: 780 + Math.random() * 320,
          tint: tints[Math.floor(Math.random() * tints.length)],
          unlit: true,
          x: 0, z: 0, y: 0, yaw: 0, alpha: 1
        });
      }
    }

    /* Each order the runner gives is timed against the one before it, which is how the
       board follows the speed toggle without being told about it. */
    function pace() {
      var now = performance.now();
      var gap = lastOrder ? now - lastOrder : MOVE_MAX;
      lastOrder = now;
      return reduced ? 1 : clamp(gap * 0.8, MOVE_MIN, MOVE_MAX);
    }

    function frame() {
      var now = performance.now();
      var busy = false;        /* something is really moving: draw every frame we can */
      var shimmering = false;  /* only the endless idle motion: draw on the slow clock */

      ground.forEach(function (t) {
        var at = builtAt + t.turn * BUILD_STEP;
        var k = (now - at) / BUILD_RISE;
        if (reduced || k >= 1) { t.y = 0; t.alpha = 1; return; }
        busy = true;
        if (k <= 0) { t.alpha = 0; t.y = -14; return; }
        var e = ease(k);
        t.alpha = e;
        t.y = -14 * (1 - e);
      });

      /* Everything that stands on the world drops onto it together, once the last block
         of ground has landed. */
      var drop = reduced ? 1 : (now - dropAt) / DROP_MS;
      var dropLift = 0, dropAlpha = 1;
      if (drop < 1) {
        busy = true;
        var d = clamp(drop, 0, 1);
        dropLift = 34 * (1 - ease(d));
        dropAlpha = d <= 0 ? 0 : Math.min(1, d * 2);
      }
      props.forEach(function (p) { p.lift = dropLift; p.alpha = dropAlpha; });

      /* The pennant ripples: each step swings out of the plane of the cloth a little
         later than the one above it, which is the whole of what makes a flag look like
         cloth rather than like a sign. The free end of each step moves furthest, so the
         swing grows with the step's own length. */
      if (!reduced && !goalAt && dropAlpha >= 1) {
        shimmering = true;
        clothItems.forEach(function (c) {
          /* Small numbers on purpose. A step is only four units thick, so a swing much
             wider than this — or a longer lag between one step and the next — pulls the
             three of them apart and the pennant reads as three loose slabs instead of
             one piece of cloth. */
          var t = now / WAVE_MS * Math.PI * 2 - c.step * 0.55;
          var swing = c.home.len * 0.09;
          c.z = goalItem.z + Math.sin(t) * swing;
          c.x = goalItem.x + c.home.x - Math.abs(Math.sin(t)) * swing * 0.35;
          c.y = c.home.y + Math.cos(t) * 0.7;
        });
      }

      /* The flag does not turn a colour when it is reached any more: it lifts off and is
         gone inside a fifth of a second, and what stays is the burst. */
      if (goalAt) {
        var gk = reduced ? 1 : (now - goalAt) / FLAG_MS;
        var fade = gk >= 1 ? 0 : 1 - gk;
        if (gk < 1) busy = true;
        goalItem.alpha = fade;
        goalItem.lift = dropLift + 14 * Math.min(1, gk);
        clothItems.forEach(function (c) {
          c.alpha = fade;
          c.lift = goalItem.lift;
        });
      }

      if (sparks.length) {
        busy = true;
        sparks = sparks.filter(function (s) {
          var t = (now - s.born) / 1000;
          if (t * 1000 >= s.life) return false;
          var y = s.y0 + s.vy * t - 0.5 * GRAVITY * t * t;
          s.x = s.x0 + s.vx * t;
          s.z = s.z0 + s.vz * t;
          // Cubes that have come down stay on the grass and fade there, rather than
          // falling through the world and out the bottom of it.
          s.y = Math.max(Models.GROUND + 1.6, y);
          s.yaw = s.spin * t;
          var k = (t * 1000) / s.life;
          s.alpha = k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4;
          return true;
        });
      }

      /* A collected battery lifts off its square and fades, which reads as taken rather
         than as a drawing that disappeared. The ones still out there turn on the spot
         and breathe, so that the eye goes to them. */
      batteryItems.forEach(function (b) {
        if (b.takenAt) {
          var k = reduced ? 1 : (now - b.takenAt) / TAKE_MS;
          if (k >= 1) { b.alpha = 0; return; }
          busy = true;
          b.alpha = 1 - k;
          b.lift = dropLift + 18 * k;
          return;
        }
        if (reduced) return;
        shimmering = true;
        b.yaw = (now / SPIN_MS * 360 + b.phase * 40) % 360;
        b.lift = dropLift + Math.sin(now / BOB_MS * Math.PI * 2 + b.phase) * 1.4;
      });

      /* The motes climb, circle and fade on a loop, all of it read off the clock. */
      motes.forEach(function (m) {
        if (reduced || m.of.takenAt || dropAlpha < 1) { m.alpha = 0; return; }
        var k = (now / MOTE_MS + m.phase) % 1;
        var a = m.phase * 6.3 + k * 2.6;
        // Wide enough to clear the battery itself: a mote drawn against the amber body
        // is a chip stuck to it, and only out over the grass does it read as a spark.
        var r = 14 - k * 4;
        m.x = m.of.x + Math.cos(a) * r;
        m.z = m.of.z + Math.sin(a) * r;
        m.y = Models.GROUND + 1 + k * 23;
        m.yaw = k * 220;
        // Up from nothing and back to nothing, so no mote ever blinks out mid-air.
        m.alpha = Math.sin(k * Math.PI) * 0.95;
      });

      /* Walking is interpolated between two squares rather than snapped, so a step
         reads as a step. */
      var gx = pos.x, gy = pos.y;
      if (moveAt) {
        var m = (now - moveAt) / moveMs;
        if (m >= 1) moveAt = 0;
        else {
          busy = true;
          var e2 = ease(m);
          gx = from.x + (pos.x - from.x) * e2;
          gy = from.y + (pos.y - from.y) * e2;
        }
      }

      var yaw = yawTo;
      if (turnAt) {
        var t2 = (now - turnAt) / turnMs;
        if (t2 >= 1) turnAt = 0;
        else { busy = true; yaw = yawFrom + (yawTo - yawFrom) * ease(t2); }
      }

      /* The bump is a shove along whatever the robot is facing, so it is a translation
         in the robot's own frame — which is why it goes in as x and z here and not as a
         screen direction. */
      var shove = 0;
      if (bumpAt) {
        var bt = (now - bumpAt) / BUMP_MS;
        if (bt >= 1) bumpAt = 0; else { busy = true; shove = Math.sin(bt * Math.PI) * 0.22; }
      }
      var hop = 0;
      if (hopAt) {
        var ht = (now - hopAt) / HOP_MS;
        if (ht >= 1) hopAt = 0;
        else { busy = true; hop = Math.abs(Math.sin(ht * Math.PI * 2)) * 7; }
      }

      var rad = yaw * Math.PI / 180;
      var px = wx(gx) + Math.sin(rad) * shove * TILE;
      var pz = wz(gy) - Math.cos(rad) * shove * TILE;

      /* Rovi is never quite still. He breathes, his antenna answers half a beat behind
         him, and every few seconds he blinks. None of it moves him off his square: the
         heading is information a child reads, so the idle animation is not allowed to
         touch the yaw, and the breath is well under a tenth of a tile. */
      var breath = 0, blink = false, lean = 0, drift = 0;
      if (!reduced && dropAlpha >= 1) {
        shimmering = true;
        var bt = now / BREATH_MS * Math.PI * 2;
        breath = Math.sin(bt) * 0.55;
        // The antenna trails the breath and only ever dips: springing upwards would lift
        // the foot of its own mast out of the head it is planted in.
        drift = (Math.sin(bt - 0.9) - 1) * 0.5;
        lean = Math.sin(bt - 0.9) * 0.6;
        blink = (now % BLINK_EVERY) < BLINK_MS;
      }

      // A blink is a whole second model, with the eyes closed to a line. See models.js.
      robotItem.model = blink ? Models.ROVI_BLINK : Models.ROVI;
      robotItem.x = px;
      robotItem.z = pz;
      robotItem.yaw = yaw;
      robotItem.lift = dropLift + hop + breath;
      robotItem.alpha = dropAlpha;

      // The sway is worked out in Rovi's own frame and turned into the world's, the same
      // way the bump is, so the antenna leans across his shoulders whatever way he faces.
      antennaItem.x = px + Math.cos(rad) * lean;
      antennaItem.z = pz + Math.sin(rad) * lean;
      antennaItem.yaw = yaw;
      antennaItem.lift = robotItem.lift + drift;
      antennaItem.alpha = dropAlpha;

      shadowItem.x = px;
      shadowItem.z = pz;
      shadowItem.alpha = dropAlpha * (0.22 - hop * 0.012);

      /* Something really moving is drawn every frame it can be. The shimmer on its own
         is drawn on the slower clock — it is the only animation here that never ends,
         and at sixty frames a second it would repaint the whole board for as long as a
         level is open, on a laptop that has better things to do. */
      if (busy || now - lastDraw >= 1000 / IDLE_FPS) {
        lastDraw = now;
        scene.draw(sparks.length ? world.concat(sparks) : world);
      }
      raf = (busy || shimmering) ? window.requestAnimationFrame(frame) : 0;
    }

    function kick() { if (!raf) raf = window.requestAnimationFrame(frame); }

    var api = {
      grid: g,

      isBlocked: function (x, y) {
        return x < 0 || y < 0 || x >= g.cols || y >= g.rows || !!g.walls[x + ',' + y];
      },

      step: function (dirName) {
        return DIRS[dirName];
      },

      moveTo: function (x, y) {
        from.x = pos.x; from.y = pos.y;
        pos.x = x; pos.y = y;
        moveMs = pace();
        moveAt = performance.now();
        kick();
      },

      /* Degrees, and they accumulate: four right turns wind the robot a whole circle
         rather than snapping back through zero. */
      turnTo: function (delta) {
        spin += delta * 90;
        yawFrom = yawTo;
        yawTo = spin;
        turnMs = pace();
        turnAt = performance.now();
        kick();
      },

      /* Nudge towards a wall and back: the robot bumps instead of walking into it. */
      bump: function () {
        bumpAt = performance.now();
        kick();
      },

      takeBattery: function (x, y) {
        var hit = null;
        batteryItems.forEach(function (b) {
          if (b.gx === x && b.gy === y && !b.takenAt) hit = b;
        });
        if (!hit) return false;
        hit.takenAt = performance.now();
        // A smaller, all-amber version of what the flag does: picking one up should be
        // an event, and it is the same machinery so the two cannot drift apart.
        if (!reduced) shatter(hit, 10, ['gold', 'shell'], 0.6);
        kick();
        return true;
      },

      celebrate: function () {
        goalAt = performance.now();
        hopAt = goalAt;
        /* Cyan is what the flag was, amber is what a reward is everywhere else on the
           page. Both, so the burst belongs to the flag and to the winning at once. */
        if (!reduced) shatter(goalItem, SPARKS, ['glow', 'glow', 'gold'], 1);
        kick();
      },

      reset: function () {
        spin = ORDER.indexOf(level.dir) * 90;
        yawFrom = yawTo = spin;
        turnAt = moveAt = bumpAt = hopAt = goalAt = lastOrder = 0;
        pos.x = from.x = g.start.x;
        pos.y = from.y = g.start.y;
        sparks = [];
        goalItem.alpha = 1;
        goalItem.lift = 0;
        clothItems.forEach(function (c) {
          c.alpha = 1;
          c.lift = 0;
          c.x = goalItem.x + c.home.x;
          c.z = goalItem.z;
          c.y = c.home.y;
        });
        batteryItems.forEach(function (b) { b.takenAt = 0; b.alpha = 1; b.lift = 0; });
        kick();
      },

      /* The board is drawn rather than laid out, so fitting it is a matter of measuring
         how big the world comes out at scale 1 and then choosing a scale. The room left
         above is the robot's own height: it can be standing on the farthest square,
         where its head reaches above the top edge of the ground. */
      fit: function () {
        var space = el.getBoundingClientRect();
        if (!space.width || !space.height) return;
        scene.resize(space.width, space.height);

        var bounds = scene.measure(ground);
        var pad = Models.ROVI_TOP * Voxel.COS_P;
        var w = bounds.x1 - bounds.x0;
        var h = (bounds.y1 - bounds.y0) + pad;
        // Tighter vertically than horizontally: the head-room reserved above is only
        // used when the robot is on the farthest square, so centring the padded box
        // leaves the island sitting low. Without the extra margin its bottom corner
        // ends up a few pixels from the edge of the sky and looks clipped.
        var s = Math.min(space.width / w * 0.96, space.height / h * 0.9);
        // A cell between these two reads: smaller and the robot's face is lost, larger
        // and a three by three level fills a whole classroom projector with grass.
        s = clamp(s, 34 / TILE, 126 / TILE);

        scene.view(
          space.width / 2 - (bounds.x0 + bounds.x1) / 2 * s,
          space.height / 2 - ((bounds.y0 - pad) + bounds.y1) / 2 * s,
          s
        );
        kick();
      }
    };

    api.reset();
    api.fit();
    return api;
  }

  return { create: create, parse: parse, DIRS: DIRS, ORDER: ORDER };
})();
