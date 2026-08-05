/* Rovi in two and a half dimensions.

   The robot is a small voxel model — twenty boxes — rendered to a canvas by hand, with
   a fixed camera looking down at the board and the model turning underneath it. It is
   not a flat drawing that spins: the faces are lit in world space, so a side that is
   bright while the robot walks north goes into shadow once it turns east, and the front
   of the head really does swing out of view when it walks away from the camera.

   Why a canvas and not four drawings, one per heading: turning is the thing this game
   teaches. A child presses "girar a la derecha" and has to see the robot turn, not blink
   into a different picture — and four drawings cannot show the ninety degrees in
   between. The whole renderer is about eighty lines because everything in it is an
   axis-aligned box, which is also what makes it look like the concept art.

   No dependencies, no WebGL: canvas 2d and arithmetic, so it still opens from a pendrive
   with a double click. */
var Robot = (function () {
  'use strict';

  /* How high the camera sits. Straight down (90°) is the old flat sprite and shows no
     volume at all; low angles show a lot of robot and stop agreeing with a board that
     is drawn from directly above. 58° keeps the top of the tile square and still lets
     the front of the head read. */
  var PITCH = 52 * Math.PI / 180;
  var COS_P = Math.cos(PITCH);
  var SIN_P = Math.sin(PITCH);

  /* One model unit as a fraction of a cell. The model is about 19 units across, so the
     robot covers a bit over two thirds of the square it stands on — a model with height
     needs to be narrower than the flat sprite was, or it swamps its own square. */
  var UNIT = 0.034;

  /* The light is fixed in world space and the model turns under it — that is where the
     sense of volume comes from. Up, a little to the left, a little towards the camera. */
  var LIGHT = unit(-0.40, 0.85, 0.35);
  var AMBIENT = 0.58;
  var DIFFUSE = 0.50;

  var TURN_MS = 300;      /* matches what the CSS transition used to take */
  var BUMP_MS = 380;
  var HOP_MS = 520;

  /* Rovi, built out of boxes. Forward is -z, up is +y, and the model stands on y = 0 so
     the ground point is the point it is placed at. Reading order is roughly bottom to
     top: wheels, chassis, neck, head, antenna. */
  var MODEL = [
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

  function box(x0, x1, y0, y1, z0, z1, ink) {
    return { ink: ink, quads: [
      /* Each face carries its outward normal, which is what decides both whether it can
         be seen from here and how much light it catches. */
      face(0, 1, 0, [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]),
      face(0, -1, 0, [x0, y0, z1], [x1, y0, z1], [x1, y0, z0], [x0, y0, z0]),
      face(0, 0, -1, [x0, y1, z0], [x1, y1, z0], [x1, y0, z0], [x0, y0, z0]),
      face(0, 0, 1, [x1, y1, z1], [x0, y1, z1], [x0, y0, z1], [x1, y0, z1]),
      face(-1, 0, 0, [x0, y1, z1], [x0, y1, z0], [x0, y0, z0], [x0, y0, z1]),
      face(1, 0, 0, [x1, y1, z0], [x1, y1, z1], [x1, y0, z1], [x1, y0, z0])
    ], cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, cz: (z0 + z1) / 2 };
  }

  function face(nx, ny, nz, a, b, c, d) { return { n: [nx, ny, nz], v: [a, b, c, d] }; }

  function unit(x, y, z) {
    var m = Math.sqrt(x * x + y * y + z * z);
    return [x / m, y / m, z / m];
  }

  /* The tokens are plain hex in :root, so shading is arithmetic on them rather than a
     second set of colours to keep in step with ~/marca. The fallback beside each name is
     only there so that renaming a token leaves a visible robot to notice: a missing
     custom property reads as an empty string, and an unparseable fillStyle is ignored by
     the canvas without an error, which would blank the robot silently. */
  var INK = {
    shell: ['--rovi-hueso', '#e2d4bb'],
    dark: ['--rovi-noche', '#233542'],
    screen: ['--rovi-tinta', '#16232c'],
    glow: ['--rovi-cian', '#54ecf8'],
    gold: ['--rovi-sol', '#efab17'],
    panel: ['--rovi-agua-claro', '#58b4d8']
  };

  function readInk(el) {
    var css = window.getComputedStyle(el);
    var out = {};
    Object.keys(INK).forEach(function (k) {
      var hex = css.getPropertyValue(INK[k][0]).trim();
      if (!/^#[0-9a-f]{6}$/i.test(hex)) hex = INK[k][1];
      hex = hex.slice(1);
      out[k] = [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
    });
    return out;
  }

  function shade(rgb, k) {
    return 'rgb(' + Math.min(255, Math.round(rgb[0] * k)) + ',' +
      Math.min(255, Math.round(rgb[1] * k)) + ',' +
      Math.min(255, Math.round(rgb[2] * k)) + ')';
  }

  function create(host) {
    var canvas = document.createElement('canvas');
    canvas.className = 'robot-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    host.appendChild(canvas);

    var ctx = canvas.getContext('2d');
    var ink = readInk(host);
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var scale = 4, ox = 0, oy = 0;          /* pixels per model unit, and the ground point */
    var yaw = 0, yawFrom = 0, yawTo = 0, turnAt = 0;
    var bumpAt = 0, hopAt = 0;
    var raf = 0;

    function project(x, y, z, sin, cos) {
      var rx = x * cos - z * sin;
      var rz = x * sin + z * cos;
      return {
        x: ox + rx * scale,
        y: oy + (-y * COS_P + rz * SIN_P) * scale,
        d: y * SIN_P + rz * COS_P
      };
    }

    function draw() {
      var now = performance.now();
      var rad = yaw * Math.PI / 180;
      var sin = Math.sin(rad), cos = Math.cos(rad);

      /* The bump is a shove along whatever the robot is facing, so it is a translation
         in the model's own frame and goes in before the camera sees anything. */
      var shove = 0;
      if (bumpAt) {
        var bt = (now - bumpAt) / BUMP_MS;
        if (bt >= 1) bumpAt = 0; else shove = Math.sin(bt * Math.PI) * -4.5;
      }
      var lift = 0;
      if (hopAt) {
        var ht = (now - hopAt) / HOP_MS;
        if (ht >= 1) hopAt = 0; else lift = Math.abs(Math.sin(ht * Math.PI * 2)) * 5;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      /* The contact shadow is what plants the robot on its square. Without it a model
         with height just floats, and the taller it is drawn the worse it looks. */
      var foot = project(0, 0, shove, sin, cos);
      ctx.fillStyle = 'rgba(0, 0, 0, ' + (0.34 - lift * 0.035).toFixed(3) + ')';
      ctx.beginPath();
      ctx.ellipse(foot.x, foot.y - 0.5 * scale, 10 * scale, 8 * scale * SIN_P, 0, 0, Math.PI * 2);
      ctx.fill();

      /* Painter's algorithm: every part is a convex box, so drawing them back to front
         by the depth of their centre is enough — no per-face sorting, no z-buffer. */
      var order = MODEL.map(function (b, i) {
        var c = project(b.cx, b.cy + lift, b.cz + shove, sin, cos);
        return { i: i, d: c.d };
      }).sort(function (a, b) { return a.d - b.d; });

      order.forEach(function (o) {
        var b = MODEL[o.i];
        var rgb = ink[b.ink];
        b.quads.forEach(function (q) {
          var n = q.n;
          var nx = n[0] * cos - n[2] * sin;
          var nz = n[0] * sin + n[2] * cos;
          /* The camera sits up and towards +z, so a face is turned towards us when its
             normal leans the same way. */
          if (n[1] * SIN_P + nz * COS_P <= 0.001) return;
          var lightness = AMBIENT + DIFFUSE * Math.max(0, nx * LIGHT[0] + n[1] * LIGHT[1] + nz * LIGHT[2]);
          var colour = shade(rgb, lightness);
          ctx.fillStyle = colour;
          ctx.strokeStyle = colour;      /* closes the hairline seams between two faces */
          ctx.lineWidth = 1;
          ctx.beginPath();
          for (var k = 0; k < 4; k++) {
            var p = project(q.v[k][0], q.v[k][1] + lift, q.v[k][2] + shove, sin, cos);
            if (k === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        });
      });
    }

    function tick() {
      var now = performance.now();
      var busy = false;

      if (turnAt) {
        var t = (now - turnAt) / TURN_MS;
        if (t >= 1) { yaw = yawTo; turnAt = 0; }
        else { yaw = yawFrom + (yawTo - yawFrom) * ease(t); busy = true; }
      }
      if (bumpAt || hopAt) busy = true;

      draw();
      raf = busy ? window.requestAnimationFrame(tick) : 0;
    }

    function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

    function kick() { if (!raf) raf = window.requestAnimationFrame(tick); }

    return {
      /* Degrees, and they accumulate: four right turns wind the robot a whole circle
         rather than snapping back through zero, exactly as the CSS rotation did. */
      setYaw: function (deg, instant) {
        if (instant || reduced) { yaw = yawTo = deg; turnAt = 0; draw(); return; }
        yawFrom = yaw;
        yawTo = deg;
        turnAt = performance.now();
        kick();
      },

      bump: function () { if (reduced) return; bumpAt = performance.now(); kick(); },

      hop: function () { if (reduced) return; hopAt = performance.now(); kick(); },

      /* Called whenever the board is re-fitted, which is the only time a cell changes
         size. The canvas is drawn larger than one cell on purpose: a robot with height
         reaches above the square it stands on. */
      resize: function (cell) {
        var dpr = window.devicePixelRatio || 1;
        var size = Math.round(cell * 1.9);
        canvas.style.width = size + 'px';
        canvas.style.height = size + 'px';
        canvas.width = Math.round(size * dpr);
        canvas.height = Math.round(size * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        scale = cell * UNIT;
        ox = size / 2;
        /* The ground point sits below the middle of the square rather than on it: the
           model grows upwards from wherever it is planted, and planted dead centre it
           reads as standing one row too far north. */
        oy = size / 2 + cell * 0.22;
        draw();
      }
    };
  }

  return { create: create };
})();
