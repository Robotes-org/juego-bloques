/* Shortest-path solver for a level, shared by the level checker and the test page.

   Breadth-first over (x, y, heading, which batteries are already picked up), which
   returns the actual list of actions — the tests replay it through the real runner to
   prove a level can be finished.

   Two questions are asked of every level, and they are different searches:
   `solve(level)` is the short way to the flag, which is what finishing costs, and
   `solve(level, {collect: true})` is the way that also picks up all three batteries,
   which is what three stars costs. A level is only fair if both exist. */
var Solver = (function () {
  'use strict';

  var VECTORS = { N: [0, -1], E: [1, 0], S: [0, 1], O: [-1, 0] };
  var ORDER = ['N', 'E', 'S', 'O'];

  function parse(level) {
    var rows = level.map;
    var w = rows[0].length;
    var walls = {}, batteries = [], start = null, goal = null;

    for (var y = 0; y < rows.length; y++) {
      if (rows[y].length !== w) throw new Error('row ' + y + ' has a different length');
      for (var x = 0; x < w; x++) {
        var c = rows[y].charAt(x);
        if (c === 'R') start = { x: x, y: y };
        else if (c === 'M') goal = { x: x, y: y };
        else if (c === '#') walls[x + ',' + y] = true;
        else if (c === '*') batteries.push({ x: x, y: y });
        else if (c !== '.') throw new Error('unknown character "' + c + '"');
      }
    }
    if (!start) throw new Error('no robot (R)');
    if (!goal) throw new Error('no goal (M)');
    if (ORDER.indexOf(level.dir) < 0) throw new Error('unknown direction "' + level.dir + '"');

    return { w: w, h: rows.length, walls: walls, batteries: batteries, start: start, goal: goal };
  }

  function solve(level, opts) {
    var collect = !!(opts && opts.collect);
    var g = parse(level);
    // When the batteries are not required, any battery state counts as an arrival.
    var full = collect ? (1 << g.batteries.length) - 1 : null;
    var index = {};
    g.batteries.forEach(function (b, i) { index[b.x + ',' + b.y] = i; });

    var bits = 0;
    if (index[g.start.x + ',' + g.start.y] !== undefined) bits = 1 << index[g.start.x + ',' + g.start.y];

    var root = { x: g.start.x, y: g.start.y, d: ORDER.indexOf(level.dir), bits: bits, from: null, action: null };
    var key = function (s) { return s.x + ',' + s.y + ',' + s.d + ',' + s.bits; };
    var seen = {};
    seen[key(root)] = true;

    var queue = [root];
    var head = 0;

    while (head < queue.length) {
      var s = queue[head++];

      if (s.x === g.goal.x && s.y === g.goal.y && (full === null || s.bits === full)) {
        var actions = [];
        for (var node = s; node.from; node = node.from) actions.unshift(node.action);
        return { actions: actions, steps: actions.length, batteries: g.batteries.length, size: g.w + 'x' + g.h };
      }

      var candidates = [
        { x: s.x, y: s.y, d: (s.d + 3) % 4, bits: s.bits, from: s, action: 'left' },
        { x: s.x, y: s.y, d: (s.d + 1) % 4, bits: s.bits, from: s, action: 'right' }
      ];

      var v = VECTORS[ORDER[s.d]];
      var nx = s.x + v[0], ny = s.y + v[1];
      if (nx >= 0 && ny >= 0 && nx < g.w && ny < g.h && !g.walls[nx + ',' + ny]) {
        var nbits = s.bits;
        var bi = index[nx + ',' + ny];
        if (bi !== undefined) nbits |= 1 << bi;
        candidates.push({ x: nx, y: ny, d: s.d, bits: nbits, from: s, action: 'forward' });
      }

      for (var i = 0; i < candidates.length; i++) {
        var k = key(candidates[i]);
        if (!seen[k]) { seen[k] = true; queue.push(candidates[i]); }
      }
    }

    return null;   // unsolvable
  }

  return { parse: parse, solve: solve };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Solver;
