/* Board: parses a level map and draws it, then moves the robot around it.
   Everything is plain DOM — the robot is one absolutely positioned element whose
   `transform` is animated by CSS, which is why walking and turning look smooth
   without a single frame of JavaScript animation code. */
var Board = (function () {
  'use strict';

  var DIRS = { N: { dx: 0, dy: -1, deg: 0 }, E: { dx: 1, dy: 0, deg: 90 }, S: { dx: 0, dy: 1, deg: 180 }, O: { dx: -1, dy: 0, deg: 270 } };
  var ORDER = ['N', 'E', 'S', 'O'];

  /* The robot is the brand's isotipo seen from above. Its antenna always points the
     way it is about to walk, which is how a child tells north from south at a glance. */
  var ROBOT_SVG =
    '<svg viewBox="0 0 64 64" class="robot-svg" aria-hidden="true">' +
      '<path class="robot-antenna" d="M32 16 V9" stroke-width="4" stroke-linecap="round" fill="none"/>' +
      '<circle class="robot-spark" cx="32" cy="6" r="5"/>' +
      '<rect class="robot-wheel" x="3" y="26" width="6" height="24" rx="3"/>' +
      '<rect class="robot-wheel" x="55" y="26" width="6" height="24" rx="3"/>' +
      '<rect class="robot-body" x="7" y="16" width="50" height="42" rx="13"/>' +
      '<circle class="robot-eye" cx="21" cy="33" r="7"/>' +
      '<circle class="robot-eye" cx="43" cy="33" r="7"/>' +
      '<rect class="robot-mouth" x="22" y="46" width="20" height="5" rx="2.5"/>' +
    '</svg>';

  var GOAL_SVG =
    '<svg viewBox="0 0 64 64" aria-hidden="true">' +
      '<path class="goal-pole" d="M18 57 V9" stroke-width="5" stroke-linecap="round" fill="none"/>' +
      '<path class="goal-cloth" d="M20 11 H45 L38 22 L45 33 H20 Z"/>' +
    '</svg>';

  var BATTERY_SVG =
    '<svg viewBox="0 0 64 64" aria-hidden="true">' +
      '<rect class="battery-cap" x="26" y="8" width="12" height="8" rx="2"/>' +
      '<rect class="battery-body" x="18" y="16" width="28" height="42" rx="6"/>' +
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

    for (var y = 0; y < g.rows; y++) {
      for (var x = 0; x < g.cols; x++) {
        var cell = document.createElement('div');
        var wall = g.walls[x + ',' + y];
        cell.className = 'cell' + (wall ? ' cell-wall' : '');
        // A checkerboard tint makes it much easier for a child to count squares.
        if (!wall && (x + y) % 2 === 1) cell.classList.add('cell-alt');
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

    // The robot is two nested elements on purpose: the outer one walks (translate),
    // the inner one turns (rotate). Keeping them apart lets the bump animation say
    // "forward" as -Y in the inner element's own rotated frame, whatever the heading.
    var robotEl = document.createElement('div');
    robotEl.className = 'sprite robot';
    robotEl.innerHTML = '<div class="robot-inner">' + ROBOT_SVG + '</div>';
    el.appendChild(robotEl);

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
        robotEl.style.setProperty('--spin', spin + 'deg');
      },

      /* Nudge towards a wall and back: the robot bumps instead of walking into it. */
      bump: function () {
        robotEl.classList.remove('is-bumping');
        void robotEl.offsetWidth;           // restart the animation on a second crash
        robotEl.classList.add('is-bumping');
      },

      takeBattery: function (x, y) {
        var b = batteryEls[x + ',' + y];
        if (!b || b.classList.contains('is-taken')) return false;
        b.classList.add('is-taken');
        return true;
      },

      celebrate: function () {
        goalEl.classList.add('is-reached');
        robotEl.classList.add('is-happy');
      },

      reset: function () {
        spin = ORDER.indexOf(level.dir) * 90;
        robotEl.style.setProperty('--spin', spin + 'deg');
        robotEl.classList.remove('is-happy', 'is-bumping');
        goalEl.classList.remove('is-reached');
        place(robotEl, g.start.x, g.start.y);
        Object.keys(batteryEls).forEach(function (k) { batteryEls[k].classList.remove('is-taken'); });
      },

      /* Cells are sized in JS so the board always fits the space it was given,
         whatever the level's proportions are. */
      fit: function () {
        var box = el.parentNode.getBoundingClientRect();
        var size = Math.floor(Math.min(box.width / g.cols, box.height / g.rows));
        size = Math.max(28, Math.min(96, size));
        el.style.setProperty('--cell', size + 'px');
      }
    };

    api.reset();
    api.fit();
    return api;
  }

  return { create: create, parse: parse, DIRS: DIRS, ORDER: ORDER };
})();
