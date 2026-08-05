/* Board: parses a level map and draws it, then moves the robot around it.
   Everything is plain DOM — the robot is one absolutely positioned element whose
   `transform` is animated by CSS, which is why walking and turning look smooth
   without a single frame of JavaScript animation code. */
var Board = (function () {
  'use strict';

  var DIRS = { N: { dx: 0, dy: -1, deg: 0 }, E: { dx: 1, dy: 0, deg: 90 }, S: { dx: 0, dy: 1, deg: 180 }, O: { dx: -1, dy: 0, deg: 270 } };
  var ORDER = ['N', 'E', 'S', 'O'];

  /* A pennant cut in three steps rather than on the diagonal, planted in a block of
     dirt. Three steps and not six: finer stairs turn into a feather at cell size. */
  var GOAL_SVG =
    '<svg viewBox="0 0 64 64" aria-hidden="true">' +
      '<rect class="goal-base" x="14" y="46" width="36" height="14"/>' +
      '<rect class="goal-base-top" x="14" y="46" width="36" height="5"/>' +
      '<rect class="goal-pole" x="24" y="6" width="6" height="44"/>' +
      '<rect class="goal-cloth" x="30" y="8" width="24" height="9"/>' +
      '<rect class="goal-cloth" x="30" y="17" width="18" height="9"/>' +
      '<rect class="goal-cloth-shade" x="30" y="26" width="12" height="9"/>' +
    '</svg>';

  var BATTERY_SVG =
    '<svg viewBox="0 0 64 64" aria-hidden="true">' +
      '<rect class="battery-cap" x="26" y="6" width="12" height="6"/>' +
      '<rect class="battery-body" x="16" y="12" width="32" height="44"/>' +
      '<rect class="battery-shade" x="40" y="12" width="8" height="44"/>' +
      '<path class="battery-bolt" d="M34 24 L24 40 H31 L29 52 L40 34 H33 Z"/>' +
    '</svg>';

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

  function create(el, level) {
    var g = parse(level);
    var cellEls = {};
    var batteryEls = {};

    el.innerHTML = '';
    el.style.setProperty('--cols', g.cols);
    el.style.setProperty('--rows', g.rows);

    var floor = document.createElement('div');
    floor.className = 'floor';

    // The tiles rise into place one at a time when a level opens, and everything that
    // stands on them drops in once the last one has landed. `--i` is a tile's turn in
    // that sweep and `--tiles` how many turns there are; the timing itself is in the
    // stylesheet, which is where the rest of the animation lives.
    el.style.setProperty('--tiles', g.cols * g.rows);

    for (var y = 0; y < g.rows; y++) {
      for (var x = 0; x < g.cols; x++) {
        var cell = document.createElement('div');
        var wall = g.walls[x + ',' + y];
        cell.className = 'cell' + (wall ? ' cell-wall' : '');
        // A checkerboard tint makes it much easier for a child to count squares.
        if (!wall && (x + y) % 2 === 1) cell.classList.add('cell-alt');
        cell.style.setProperty('--i', y * g.cols + x);
        floor.appendChild(cell);
        cellEls[x + ',' + y] = cell;
      }
    }
    el.appendChild(floor);

    var goalEl = document.createElement('div');
    goalEl.className = 'sprite goal';
    goalEl.innerHTML = GOAL_SVG;
    place(goalEl, g.goal.x, g.goal.y);
    el.appendChild(goalEl);

    g.batteries.forEach(function (b) {
      var bEl = document.createElement('div');
      bEl.className = 'sprite battery';
      bEl.innerHTML = BATTERY_SVG;
      place(bEl, b.x, b.y);
      el.appendChild(bEl);
      batteryEls[b.x + ',' + b.y] = bEl;
    });

    // The robot is still two nested elements, but the split means something different
    // now that it is a model: the outer one walks the grid (translate), and the inner
    // one holds the canvas Robot draws into. Turning, bumping and cheering all happen
    // inside that canvas, in the model's own three dimensions — see src/robot.js.
    var robotEl = document.createElement('div');
    robotEl.className = 'sprite robot';
    robotEl.innerHTML = '<div class="robot-inner"></div>';
    el.appendChild(robotEl);
    var rovi = Robot.create(robotEl.firstChild);

    function place(sprite, x, y) {
      sprite.style.setProperty('--x', x);
      sprite.style.setProperty('--y', y);
    }

    /* The robot keeps turning in the same rotational direction instead of
       snapping back through 0°, so four right turns spin it a full circle. */
    var spin = ORDER.indexOf(level.dir) * 90;

    var api = {
      grid: g,

      isBlocked: function (x, y) {
        return x < 0 || y < 0 || x >= g.cols || y >= g.rows || !!g.walls[x + ',' + y];
      },

      step: function (dirName) {
        return DIRS[dirName];
      },

      moveTo: function (x, y) {
        place(robotEl, x, y);
      },

      turnTo: function (delta) {
        spin += delta * 90;
        rovi.setYaw(spin);
      },

      /* Nudge towards a wall and back: the robot bumps instead of walking into it. */
      bump: function () {
        rovi.bump();
      },

      takeBattery: function (x, y) {
        var b = batteryEls[x + ',' + y];
        if (!b || b.classList.contains('is-taken')) return false;
        b.classList.add('is-taken');
        return true;
      },

      celebrate: function () {
        goalEl.classList.add('is-reached');
        rovi.hop();
      },

      reset: function () {
        spin = ORDER.indexOf(level.dir) * 90;
        rovi.setYaw(spin, true);            // back to the start facing, without turning
        goalEl.classList.remove('is-reached');
        place(robotEl, g.start.x, g.start.y);
        Object.keys(batteryEls).forEach(function (k) { batteryEls[k].classList.remove('is-taken'); });
      },

      /* Cells are sized in JS so the board always fits the space it was given,
         whatever the level's proportions are. The robot is drawn into a canvas rather
         than scaled by CSS, so it has to be told the new size to redraw at. */
      fit: function () {
        var box = el.parentNode.getBoundingClientRect();
        var size = Math.floor(Math.min(box.width / g.cols, box.height / g.rows));
        size = Math.max(28, Math.min(96, size));
        el.style.setProperty('--cell', size + 'px');
        rovi.resize(size);
      }
    };

    api.reset();
    api.fit();
    return api;
  }

  return { create: create, parse: parse, DIRS: DIRS, ORDER: ORDER };
})();
