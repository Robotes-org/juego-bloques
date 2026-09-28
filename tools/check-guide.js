/* Guide checker. Run with:  node tools/check-guide.js

   GUIA-PROFESOR.md writes out a solution for every level by hand. This replays each
   one against src/levels.js, so a change to a map, a cap or a level's blocks cannot
   leave the teacher's guide quietly wrong. The workflow that builds the PDF runs it
   first and publishes nothing if it fails.

   It reads, under "## Nivel por nivel", every "### N · Name" heading and every list
   line shaped like

     - **Solución** (bandera y 3 pilas, 8 bloques) → avanzar ×4 → girar a la izquierda
     - **3 pilas** (17 bloques) → …
     - **Bandera** (1 pila, 4 bloques) → …

   and checks that the program reaches the flag, collects that many batteries, has that
   many blocks, fits the level's `max` and only uses blocks the level offers. */

var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');
var src = fs.readFileSync(path.join(ROOT, 'src', 'levels.js'), 'utf8');
var LEVELS;
eval(src);   // the file is a plain `var LEVELS = [...]` declaration

var Solver = require('./solver.js');

var ORDER = ['N', 'E', 'S', 'O'];
var STEP = { N: [0, -1], E: [1, 0], S: [0, 1], O: [-1, 0] };
var MIN_TIMES = 2, MAX_TIMES = 10;   // same bounds as src/editor.js

var TOKEN = /repetir (\d+) \{|\}|avanzar(?: ×(\d+))?|girar a la (izquierda|derecha)(?: ×(\d+))?/g;

/* "avanzar ×3" is three blocks in a row, not a repetir. */
function parse(text) {
  var stack = [[]];
  var consumed = text.replace(/→/g, ' ');
  var m;
  TOKEN.lastIndex = 0;
  while ((m = TOKEN.exec(text))) {
    consumed = consumed.replace(m[0], '');
    var list = stack[stack.length - 1];
    if (m[1]) {
      var loop = { type: 'repeat', times: +m[1], body: [] };
      list.push(loop);
      stack.push(loop.body);
    } else if (m[0] === '}') {
      if (stack.length === 1) throw new Error('"}" sin "repetir"');
      stack.pop();
    } else {
      var type = m[3] ? (m[3] === 'izquierda' ? 'left' : 'right') : 'forward';
      var n = +(m[2] || m[4] || 1);
      for (var i = 0; i < n; i++) list.push({ type: type });
    }
  }
  if (stack.length !== 1) throw new Error('falta cerrar un "repetir"');
  if (consumed.trim()) throw new Error('no entiendo «' + consumed.trim() + '»');
  return stack[0];
}

function count(list) {
  return list.reduce(function (n, b) { return n + 1 + (b.body ? count(b.body) : 0); }, 0);
}

function uses(list, out) {
  list.forEach(function (b) { out[b.type] = true; if (b.body) uses(b.body, out); });
  return out;
}

function run(level, program) {
  var g = Solver.parse(level);
  var dir = ORDER.indexOf(level.dir);
  var x = g.start.x, y = g.start.y, got = {};
  var result = null;

  function walk(list) {
    for (var i = 0; i < list.length && !result; i++) {
      var b = list[i];
      if (b.body) {
        if (b.times < MIN_TIMES || b.times > MAX_TIMES) { result = 'repetir fuera de rango'; return; }
        for (var k = 0; k < b.times && !result; k++) walk(b.body);
        continue;
      }
      if (b.type === 'forward') {
        var nx = x + STEP[ORDER[dir]][0], ny = y + STEP[ORDER[dir]][1];
        if (nx < 0 || ny < 0 || nx >= g.w || ny >= g.h || g.walls[nx + ',' + ny]) { result = 'choca'; return; }
        x = nx; y = ny;
        g.batteries.forEach(function (bt, j) { if (bt.x === x && bt.y === y) got[j] = true; });
      } else {
        dir = (dir + (b.type === 'right' ? 1 : 3)) % 4;
      }
      if (x === g.goal.x && y === g.goal.y) result = 'win';
    }
  }

  walk(program);
  return { result: result || 'no llega', batteries: Object.keys(got).length };
}

var guide = fs.readFileSync(path.join(ROOT, 'GUIA-PROFESOR.md'), 'utf8');
var section = guide.split(/^## Nivel por nivel\s*$/m)[1];
if (!section) { console.log('ERROR: GUIA-PROFESOR.md no tiene "## Nivel por nivel"'); process.exit(1); }
section = section.split(/^## /m)[0];

var errors = [];
var seen = {};
var checked = 0;
var level = null, label = '';

section.split('\n').forEach(function (line) {
  var h = line.match(/^### (\d+) · (.+)$/);
  if (h) {
    level = LEVELS[+h[1] - 1];
    label = 'Nivel ' + h[1];
    if (!level) { errors.push(label + ': no existe en src/levels.js'); return; }
    if (level.name !== h[2].trim()) errors.push(label + ': la guía dice «' + h[2].trim() + '» y el juego «' + level.name + '»');
    seen[h[1]] = true;
    return;
  }
  var s = line.match(/^- \*\*(Solución|Bandera|3 pilas|Con repetir)\*\* \((.+?)\) → (.+)$/);
  if (!s || !level) return;

  var where = label + ', ' + s[1];
  var meta = s[2];
  var wantBatteries = s[1] === '3 pilas' ? 3 : +((meta.match(/(\d+) pilas?/) || [])[1]);
  var wantBlocks = +((meta.match(/(\d+) bloques?/) || [])[1]);
  if (isNaN(wantBatteries) || isNaN(wantBlocks)) { errors.push(where + ': falta «N pilas» o «N bloques» entre paréntesis'); return; }

  var program;
  try { program = parse(s[3]); } catch (e) { errors.push(where + ': ' + e.message); return; }
  checked++;

  var blocks = count(program);
  if (blocks !== wantBlocks) errors.push(where + ': dice ' + wantBlocks + ' bloques y son ' + blocks);
  if (level.max && blocks > level.max) errors.push(where + ': usa ' + blocks + ' bloques y el máximo es ' + level.max);
  Object.keys(uses(program, {})).forEach(function (t) {
    if (level.blocks.indexOf(t) < 0) errors.push(where + ': usa «' + t + '», que este nivel no ofrece');
  });

  var r = run(level, program);
  if (r.result !== 'win') errors.push(where + ': el robot ' + r.result);
  else if (r.batteries !== wantBatteries) errors.push(where + ': dice ' + wantBatteries + ' pilas y junta ' + r.batteries);
});

LEVELS.forEach(function (l, i) {
  if (!seen[i + 1]) errors.push('Nivel ' + (i + 1) + ' (' + l.name + '): no está en la guía');
});

if (errors.length) {
  errors.forEach(function (e) { console.log('ERROR: ' + e); });
  process.exit(1);
}
console.log('La guía está al día: ' + checked + ' soluciones de ' + LEVELS.length + ' niveles comprobadas.');
