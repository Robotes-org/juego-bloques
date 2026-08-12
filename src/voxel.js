/* The one camera everything on the board is drawn under.

   The whole world — ground, walls, flag, batteries and the robot — is a pile of
   axis-aligned boxes painted into a single canvas from a single fixed viewpoint: the
   board turned 45° and looked at from above and in front. That is the only rule this
   file exists to enforce. Two cameras on one board is the one thing that reads as
   broken, and the way that happens is by drawing "just this one thing" some other way.

   There is no z-buffer and no per-face sorting. Every part is a convex box, so painting
   them back to front by the depth of their centre is enough, and for a grid of blocks
   standing on a plane that ordering is exact rather than approximate.

   Canvas 2d and arithmetic, no WebGL and no dependencies: the game still has to open
   from a pendrive with a double click. */
var Voxel = (function () {
  'use strict';

  var RAD = Math.PI / 180;

  /* The camera. Turning the board 45° is what makes a square grid read as blocks, and
     the pitch is a compromise: straight down shows no volume at all, low angles show a
     handsome world that no longer reads as a grid to count squares on. */
  var YAW = 45;
  var PITCH = 52 * RAD;
  var COS_P = Math.cos(PITCH), SIN_P = Math.sin(PITCH);
  var CAM_SIN = Math.sin(YAW * RAD), CAM_COS = Math.cos(YAW * RAD);

  /* Fixed in world space, so a face that is bright now goes dark when its box turns —
     which is the whole reason anything here looks solid. */
  var LIGHT = unit(-0.40, 0.85, 0.35);
  var AMBIENT = 0.58, DIFFUSE = 0.50;

  /* Every colour on the board resolves through a token. The fallback beside each name is
     only there so that renaming one leaves something visible to notice: a missing custom
     property reads as an empty string, and an unparseable fillStyle is ignored by the
     canvas *without an error*, which would blank the board silently. */
  var INK = {
    shell: ['--rovi-hueso', '#e2d4bb'],
    dark: ['--rovi-noche', '#233542'],
    screen: ['--rovi-tinta', '#16232c'],
    glow: ['--rovi-cian', '#54ecf8'],
    gold: ['--rovi-sol', '#efab17'],
    panel: ['--rovi-agua-claro', '#58b4d8'],
    grass: ['--rovi-pasto', '#75a63b'],
    grassAlt: ['--rovi-pasto-claro', '#8cbf4c'],
    soil: ['--rovi-tierra', '#a36a29'],
    stone: ['--rovi-piedra', '#878782'],
    deep: ['--rovi-agua', '#2f91b6']
  };

  function unit(x, y, z) {
    var m = Math.sqrt(x * x + y * y + z * z);
    return [x / m, y / m, z / m];
  }

  /* A box, with its six faces and the centre they are sorted by. `ink` is either one
     name for the whole box or `{top: ..., side: ...}` — which is how a block of ground
     gets grass on top and soil down the sides without being two boxes. */
  function box(x0, x1, y0, y1, z0, z1, ink) {
    var top = typeof ink === 'string' ? ink : ink.top;
    var side = typeof ink === 'string' ? ink : ink.side;
    return {
      c: [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2],
      f: [
        face([0, 1, 0], [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], top),
        face([0, -1, 0], [[x0, y0, z1], [x1, y0, z1], [x1, y0, z0], [x0, y0, z0]], side),
        face([0, 0, -1], [[x0, y1, z0], [x1, y1, z0], [x1, y0, z0], [x0, y0, z0]], side),
        face([0, 0, 1], [[x1, y1, z1], [x0, y1, z1], [x0, y0, z1], [x1, y0, z1]], side),
        face([-1, 0, 0], [[x0, y1, z1], [x0, y1, z0], [x0, y0, z0], [x0, y0, z1]], side),
        face([1, 0, 0], [[x1, y1, z0], [x1, y1, z1], [x1, y0, z1], [x1, y0, z0]], side)
      ]
    };
  }

  function face(n, v, ink) { return { n: n, v: v, ink: ink }; }

  /* A box stuck flat onto one face of another box: the dark screen on the front of the
     robot's head, the eyes and the mouth on the front of the screen.

     These cannot be sorted by the depth of their centre, and it is not a matter of
     tuning the numbers. The camera is pitched, so a box lower down is farther away, and
     it is turned, so a box further to one side is farther away too — and either of those
     will outweigh the half unit a decal stands proud of the plate it is stuck to. That
     is exactly what went wrong: Rovi's mouth is below the middle of his screen and each
     eye is off to one side, so the screen sorted in front of them and painted them out —
     the mouth from every angle, and one eye whenever he was not looking straight at us.

     So a decal is not sorted at all. It is drawn immediately after the box it is stuck
     to when that face is turned towards us, and immediately before it when it is not,
     which is what being stuck to a face means: in front from the front, hidden from
     behind. Nothing can come between them — there is nothing to fit in the half unit of
     air in front of a face — so this is exact rather than a fudge.

     `on` must appear earlier in the same model than the decal, so its depth is already
     worked out by the time this one needs it. Decals can be stuck to decals. */
  function decal(host, x0, x1, y0, y1, z0, z1, ink, n) {
    var b = box(x0, x1, y0, y1, z0, z1, ink);
    b.on = host;
    b.dir = n;
    return b;
  }

  /* How far a face is turned towards the camera, once the item carrying it has been
     turned. Positive means we can see it. */
  function facing(n, p) {
    return n[1] * SIN_P + (n[0] * p.sin + n[2] * p.cos) * COS_P;
  }

  /* The gap a decal is drawn in front of or behind its host. Small enough that nothing
     real ever sorts between the two, and every distance on the board is in tile units. */
  var STUCK = 0.0001;

  function readPalette(el) {
    var css = window.getComputedStyle(el);
    var out = {};
    Object.keys(INK).forEach(function (k) {
      var hex = css.getPropertyValue(INK[k][0]).trim();
      if (!/^#[0-9a-f]{6}$/i.test(hex)) hex = INK[k][1];
      out[k] = [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
    });
    return out;
  }

  function create(canvas, host) {
    var ctx = canvas.getContext('2d');
    var paint = readPalette(host || canvas);
    var scale = 1, ox = 0, oy = 0;

    /* Model point to screen. The item's own turn and the camera's are both rotations
       about the same axis, so they add up and cost one sine and one cosine between them;
       only the item's position has to be turned by the camera alone. */
    function screen(v, sin, cos, px, py, pz, lift) {
      var rx = v[0] * cos - v[2] * sin + px;
      var rz = v[0] * sin + v[2] * cos + pz;
      var ry = v[1] + py + lift;
      return [ox + rx * scale, oy + (-ry * COS_P + rz * SIN_P) * scale];
    }

    /* Everything an item needs resolved once, so the sort and the draw can share it. */
    function place(item) {
      var a = ((item.yaw || 0) + YAW) * RAD;
      var px = (item.x || 0) * CAM_COS - (item.z || 0) * CAM_SIN;
      var pz = (item.x || 0) * CAM_SIN + (item.z || 0) * CAM_COS;
      return { sin: Math.sin(a), cos: Math.cos(a), px: px, py: item.y || 0, pz: pz };
    }

    return {
      /* The board is sized to fit whatever space it was given, so the scale is not a
         constant here — it is worked out from the projected size of the world. */
      view: function (px, py, s) { ox = px; oy = py; scale = s; },

      resize: function (w, h) {
        var dpr = window.devicePixelRatio || 1;
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      },

      /* The projected outline of a set of items at scale 1, which is what the board
         needs to work out how big a cell can be and where to put the origin. */
      measure: function (items) {
        var min = [Infinity, Infinity], max = [-Infinity, -Infinity];
        var keep = { ox: ox, oy: oy, scale: scale };
        ox = 0; oy = 0; scale = 1;
        items.forEach(function (item) {
          var p = place(item);
          item.model.forEach(function (b) {
            b.f.forEach(function (q) {
              q.v.forEach(function (v) {
                var s = screen(v, p.sin, p.cos, p.px, p.py, p.pz, 0);
                if (s[0] < min[0]) min[0] = s[0];
                if (s[1] < min[1]) min[1] = s[1];
                if (s[0] > max[0]) max[0] = s[0];
                if (s[1] > max[1]) max[1] = s[1];
              });
            });
          });
        });
        ox = keep.ox; oy = keep.oy; scale = keep.scale;
        return { x0: min[0], y0: min[1], x1: max[0], y1: max[1] };
      },

      draw: function (items) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        /* One flat list of every box in the scene, so the ground, a wall, a battery and
           the robot all sort against each other instead of against their own kind. */
        var queue = [];
        items.forEach(function (item) {
          if (item.alpha === 0) return;
          var p = place(item);
          var lift = item.lift || 0;
          item.model.forEach(function (b) {
            var bz = b.c[0] * p.sin + b.c[2] * p.cos + p.pz;
            var d = (b.c[1] + p.py + lift) * SIN_P + bz * COS_P;
            /* Something stuck to a face borrows its host's place in the queue instead of
               taking one of its own — see decal(). */
            if (b.on) d = b.on.at + (facing(b.dir, p) > 0 ? STUCK : -STUCK);
            b.at = d;
            queue.push({ b: b, p: p, item: item, lift: lift, d: d });
          });
        });
        queue.sort(function (a, b) { return a.d - b.d; });

        var alpha = 1;
        ctx.globalAlpha = 1;
        queue.forEach(function (job) {
          var item = job.item, p = job.p;
          var want = item.alpha === undefined ? 1 : item.alpha;
          if (want !== alpha) { ctx.globalAlpha = want; alpha = want; }

          job.b.f.forEach(function (q) {
            /* The camera sits up and towards +z, so a face is turned towards us when
               its normal leans the same way. */
            if (facing(q.n, p) <= 0.001) return;

            var nx = q.n[0] * p.cos - q.n[2] * p.sin;
            var nz = q.n[0] * p.sin + q.n[2] * p.cos;

            var rgb = paint[item.tint || q.ink] || paint.stone;
            var k = item.unlit ? 1
              : AMBIENT + DIFFUSE * Math.max(0, nx * LIGHT[0] + q.n[1] * LIGHT[1] + nz * LIGHT[2]);
            var colour = 'rgb(' + Math.min(255, Math.round(rgb[0] * k)) + ',' +
              Math.min(255, Math.round(rgb[1] * k)) + ',' + Math.min(255, Math.round(rgb[2] * k)) + ')';

            ctx.fillStyle = colour;
            /* Stroking each face in its own fill colour closes the hairline seams
               antialiasing leaves between two quads that share an edge. */
            ctx.strokeStyle = colour;
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (var i = 0; i < 4; i++) {
              var s = screen(q.v[i], p.sin, p.cos, p.px, p.py, p.pz, job.lift);
              if (i === 0) ctx.moveTo(s[0], s[1]); else ctx.lineTo(s[0], s[1]);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          });
        });
        ctx.globalAlpha = 1;
      }
    };
  }

  return { create: create, box: box, decal: decal, YAW: YAW, COS_P: COS_P, SIN_P: SIN_P };
})();
