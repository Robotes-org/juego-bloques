/* Runner: turns the block tree into a flat list of moves and plays them back one
   at a time, so the child can see which block is running while the robot moves. */
var Runner = (function () {
  'use strict';

  var MAX_STEPS = 600;   // a guard against deeply nested repeats, not a game rule

  /* Unrolls the tree: `repeat 4` simply emits its body four times. Every step
     remembers the block it came from so the editor can highlight it. */
  function compile(program) {
    var steps = [];
    var overflow = false;

    function walk(list) {
      for (var i = 0; i < list.length; i++) {
        if (overflow) return;
        var node = list[i];
        if (node.body) {
          for (var n = 0; n < node.times; n++) {
            walk(node.body);
            if (overflow) return;
          }
        } else {
          if (steps.length >= MAX_STEPS) { overflow = true; return; }
          steps.push({ type: node.type, id: node.id });
        }
      }
    }

    walk(program);
    return { steps: steps, overflow: overflow };
  }

  /* A run is either automatic — one move every `delay` — or manual, where nothing
     happens until step() is called. Manual mode is the same machinery paused between
     moves: it is what lets a child walk their own program one block at a time and see
     which piece lights up. resume() turns a paused run back into an automatic one. */
  function run(opts) {
    var board = opts.board;
    var level = opts.level;
    var steps = opts.steps;
    var delay = opts.delay;
    var manual = !!opts.manual;
    var g = board.grid;

    var dir = Board.ORDER.indexOf(level.dir);
    var pos = { x: g.start.x, y: g.start.y };
    var collected = 0;
    var index = 0;
    var timer = null;
    var stopped = false;

    function take(x, y) {
      if (!board.takeBattery(x, y)) return;
      collected++;
      opts.onBattery(collected, g.batteries.length);
    }

    function finish(result) {
      stopped = true;
      window.clearTimeout(timer);
      opts.onHighlight(null);
      if (result === 'win') board.celebrate();
      opts.onFinish(result, { collected: collected, total: g.batteries.length });
    }

    /* Reaching the flag is enough. The batteries are the stars, not the door. */
    function won() {
      return pos.x === g.goal.x && pos.y === g.goal.y;
    }

    function tick() {
      if (stopped) return;
      if (index >= steps.length) return finish('short');

      var step = steps[index++];
      opts.onHighlight(step.id);

      if (step.type === 'forward') {
        var d = Board.DIRS[Board.ORDER[dir]];
        var nx = pos.x + d.dx, ny = pos.y + d.dy;
        if (board.isBlocked(nx, ny)) {
          board.bump();
          return window.setTimeout(function () { finish('crash'); }, 420);
        }
        pos.x = nx; pos.y = ny;
        board.moveTo(nx, ny);
        take(nx, ny);
      } else {
        var delta = step.type === 'right' ? 1 : -1;
        dir = (dir + delta + 4) % 4;
        board.turnTo(delta);
      }

      // The pause after the last move is the walk animation finishing, so it is waited
      // out even when stepping by hand.
      if (won()) return window.setTimeout(function () { finish('win'); }, delay);
      schedule();
    }

    function schedule() {
      if (!manual) timer = window.setTimeout(tick, delay);
    }

    schedule();

    return {
      stop: function () {
        stopped = true;
        window.clearTimeout(timer);
        opts.onHighlight(null);
      },

      /* One move, for the step button. Ignored once the run is over. */
      step: function () {
        if (!stopped) tick();
      },

      /* Hand a paused run back to the clock, carrying on from where it stopped. */
      resume: function () {
        if (stopped) return;
        manual = false;
        schedule();
      },

      isManual: function () { return manual; }
    };
  }

  return { compile: compile, run: run, MAX_STEPS: MAX_STEPS };
})();
