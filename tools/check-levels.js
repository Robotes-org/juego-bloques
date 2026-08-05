/* Level checker. Run with:  node tools/check-levels.js

   For every level it answers two questions by search, because they are what the child
   experiences as two different goals:

     - the short way to the flag, which is what finishing the level costs
     - the way that also collects all three batteries, which is what three stars costs

   A level is broken if either route does not exist. It also enforces that every level
   carries exactly three batteries — the stars are the batteries, so a level with two
   can never be finished with three stars, and one with four hides a star for good. */

var fs = require('fs');
var path = require('path');

var Solver = require('./solver.js');

var src = fs.readFileSync(path.join(__dirname, '..', 'src', 'levels.js'), 'utf8');
var LEVELS;
eval(src);   // the file is a plain `var LEVELS = [...]` declaration

var STARS = 3;
var failed = 0;

LEVELS.forEach(function (level, i) {
  var label = String(i + 1).padStart(2, ' ') + '. ' + level.name.padEnd(22, ' ');
  var direct, full;

  try {
    direct = Solver.solve(level);
    full = Solver.solve(level, { collect: true });
  } catch (e) {
    failed++;
    console.log(label + '  ERROR: ' + e.message);
    return;
  }

  if (!direct) { failed++; console.log(label + '  ERROR: no se puede llegar a la bandera'); return; }
  if (!full) { failed++; console.log(label + '  ERROR: no hay ruta que recoja las tres pilas'); return; }

  var notes = [];

  if (direct.batteries !== STARS) {
    notes.push('WARNING: tiene ' + direct.batteries + ' pilas y deben ser ' + STARS);
    failed++;
  }

  // `max` only teaches the loop if the straight-line solution does not fit under it.
  if (level.max) {
    if (level.max >= direct.steps) {
      notes.push('WARNING: max ' + level.max + ' permite la solución larga (' + direct.steps + ')');
      failed++;
    }
    // On a capped level the batteries have to sit on the pattern's own route, or the
    // child is asked for three stars the block limit makes impossible.
    if (full.steps > direct.steps * 1.5) {
      notes.push('WARNING: con tope de bloques, juntar las pilas cuesta ' + full.steps +
        ' acciones contra ' + direct.steps + ' de la ruta directa');
      failed++;
    }
  }

  console.log(label + '  ' + direct.size + '  bandera ' + String(direct.steps).padStart(2) +
    ' acciones   3 pilas ' + String(full.steps).padStart(2) + ' acciones' +
    (notes.length ? '   ' + notes.join(' · ') : ''));
});

console.log(failed ? '\n' + failed + ' level(s) need attention.' : '\nAll levels OK.');
process.exit(failed ? 1 : 0);
