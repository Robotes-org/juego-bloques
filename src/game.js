/* Game: wires the level list, the editor, the board and the runner together, and
   remembers how far the child got.

   Finishing a level means reaching the flag. The stars are the three batteries, kept
   separate on purpose: everyone gets to move on, and the batteries are what a child
   comes back for. */
(function () {
  'use strict';

  var STORAGE_KEY = 'ruta-robot/progreso';
  var SPEEDS = { normal: 430, fast: 170 };

  /* Every level open, ignoring progress. Set to false to go back to unlocking each
     level with the previous one. Handy while testing a level in the middle, and while
     the workshop is still deciding whether the gate helps or just gets in the way. */
  var UNLOCK_ALL = true;

  var el = {
    nav: document.getElementById('level-nav'),
    palette: document.getElementById('palette'),
    program: document.getElementById('program'),
    counter: document.getElementById('counter'),
    hint: document.getElementById('hint'),
    board: document.getElementById('board'),
    title: document.getElementById('level-title'),
    batteries: document.getElementById('batteries'),
    status: document.getElementById('status'),
    run: document.getElementById('run-btn'),
    step: document.getElementById('step-btn'),
    stop: document.getElementById('stop-btn'),
    reset: document.getElementById('reset-btn'),
    speed: document.getElementById('speed-btn'),
    clear: document.getElementById('clear-btn'),
    overlay: document.getElementById('overlay'),
    dialogTitle: document.getElementById('dialog-title'),
    dialogStars: document.getElementById('dialog-stars'),
    dialogText: document.getElementById('dialog-text'),
    next: document.getElementById('next-btn'),
    again: document.getElementById('again-btn')
  };

  var MESSAGES = {
    crash: 'El robot chocó con un muro. Revisa por dónde gira.',
    short: 'Se acabaron los bloques y el robot no llegó a la bandera.',
    empty: 'Todavía no hay bloques. Haz clic en uno de la izquierda para empezar.',
    overflow: 'El programa es demasiado largo. Baja el número de alguna repetición.'
  };

  // The same battery as the one on the board, drawn square: see BATTERY_SVG in board.js.
  var BATTERY_ICON = '<svg class="pip" viewBox="0 0 64 64" aria-hidden="true">' +
    '<rect class="battery-cap" x="26" y="6" width="12" height="6"/>' +
    '<rect class="battery-body" x="16" y="12" width="32" height="44"/>' +
    '<rect class="battery-shade" x="40" y="12" width="8" height="44"/>' +
    '<path class="battery-bolt" d="M34 24 L24 40 H31 L29 52 L40 34 H33 Z"/></svg>';

  var current = 0;
  var board = null;
  var session = null;      // the run in progress, automatic or paused between steps
  var stepCount = 0;
  var totalSteps = 0;
  var speed = 'normal';
  var progress = load();

  /* ---------- progress ---------- */

  function load() {
    try {
      var raw = JSON.parse(window.localStorage.getItem(STORAGE_KEY)) || {};
      // Early versions stored a bare star count. Read it as "finished with N stars".
      Object.keys(raw).forEach(function (k) {
        if (typeof raw[k] === 'number') raw[k] = { done: true, stars: raw[k] };
      });
      return raw;
    } catch (e) {
      return {};   // private mode, or a corrupted value: just start over
    }
  }

  function save() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch (e) { /* nothing we can do, and nothing worth interrupting the game for */ }
  }

  function done(index) {
    return !!(progress[index] && progress[index].done);
  }

  function starsOf(index) {
    return progress[index] ? progress[index].stars : 0;
  }

  function unlocked(index) {
    return UNLOCK_ALL || index === 0 || done(index - 1);
  }

  function starMarkup(count) {
    var out = '';
    for (var i = 0; i < 3; i++) {
      out += '<svg class="star' + (i < count ? ' is-on' : '') + '" viewBox="0 0 24 24" aria-hidden="true">' +
        '<path d="M12 2 L15 9 L22 9.6 L16.8 14.3 L18.4 21 L12 17.3 L5.6 21 L7.2 14.3 L2 9.6 L9 9 Z"/></svg>';
    }
    return out;
  }

  /* ---------- level navigation ---------- */

  function renderNav() {
    el.nav.innerHTML = '';
    LEVELS.forEach(function (level, i) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'level-btn';
      btn.textContent = i + 1;
      btn.title = level.name + (done(i) ? ' — ' + starsOf(i) + ' de 3 pilas' : '');
      if (i === current) btn.classList.add('is-current');
      if (done(i)) btn.classList.add('is-done');
      if (starsOf(i) === 3) btn.classList.add('is-perfect');
      if (!unlocked(i)) {
        btn.classList.add('is-locked');
        btn.disabled = true;
        btn.title = 'Termina el nivel anterior';
      }
      btn.addEventListener('click', function () { loadLevel(i); });
      el.nav.appendChild(btn);
    });
  }

  /* The battery counter beside the level name fills up as the robot drives over them. */
  function renderBatteries(collected, total) {
    var out = '';
    for (var i = 0; i < total; i++) {
      out += '<span class="pip-slot' + (i < collected ? ' is-on' : '') + '">' + BATTERY_ICON + '</span>';
    }
    el.batteries.innerHTML = out;
  }

  function loadLevel(index) {
    if (session) { session.stop(); session = null; }
    current = index;
    var level = LEVELS[index];

    board = Board.create(el.board, level);
    Editor.setLevel(level);
    Editor.setLocked(false);

    el.title.textContent = (index + 1) + '. ' + level.name;
    el.hint.textContent = level.hint;
    renderBatteries(0, board.grid.batteries.length);
    setStatus('');
    updateControls();
    renderNav();
  }

  function setStatus(text, kind) {
    el.status.textContent = text;
    el.status.className = 'status' + (kind ? ' status-' + kind : '');
  }

  /* ---------- playing ---------- */

  /* Which buttons make sense depends on whether a run is going, paused, or over.
     The board has three states and every button asks the same two questions. */
  function updateControls() {
    var paused = !!session && session.isManual();
    el.run.disabled = !!session && !paused;    // while it drives itself, play does nothing
    el.step.disabled = !!session && !paused;
    el.stop.disabled = !session;
  }

  /* Starts a run and leaves it either driving itself or waiting for the step button. */
  function begin(manual) {
    if (Editor.isEmpty()) { setStatus(MESSAGES.empty, 'warn'); return false; }

    var compiled = Runner.compile(Editor.getProgram());
    if (compiled.overflow) { setStatus(MESSAGES.overflow, 'warn'); return false; }
    if (!compiled.steps.length) { setStatus(MESSAGES.empty, 'warn'); return false; }

    board.reset();
    renderBatteries(0, board.grid.batteries.length);
    Editor.setLocked(true);
    stepCount = 0;
    totalSteps = compiled.steps.length;

    session = Runner.run({
      board: board,
      level: LEVELS[current],
      steps: compiled.steps,
      delay: SPEEDS[speed],
      manual: manual,
      onHighlight: function (id) { Editor.highlight(id); },
      onBattery: renderBatteries,
      onFinish: function (result, info) {
        session = null;
        Editor.setLocked(false);
        updateControls();
        if (result === 'win') win(info);
        else setStatus(MESSAGES[result], 'warn');
      }
    });

    updateControls();
    return true;
  }

  function play() {
    if (session) {
      if (!session.isManual()) return;
      session.resume();                        // carry on from where the stepping left off
      setStatus('El robot está siguiendo tu programa…');
      updateControls();
      return;
    }
    if (begin(false)) setStatus('El robot está siguiendo tu programa…');
  }

  /* One block at a time, with the piece that is running lit up in the program. */
  function stepOnce() {
    if (session && !session.isManual()) return;
    if (!session && !begin(true)) return;
    if (!session) return;

    session.step();
    stepCount++;
    if (session) setStatus('Paso ' + stepCount + ' de ' + totalSteps + '. Mira qué bloque se ilumina.');
    updateControls();
  }

  /* Stop leaves the robot where it got to, so the child can look at it. Reiniciar is
     what puts it back at the start. */
  function stopRun() {
    if (!session) return;
    session.stop();
    session = null;
    Editor.setLocked(false);
    setStatus('Robot detenido. Aprieta "Reiniciar" para volver al principio.');
    updateControls();
  }

  function resetRun() {
    if (session) { session.stop(); session = null; }
    Editor.setLocked(false);
    Editor.highlight(null);
    board.reset();
    renderBatteries(0, board.grid.batteries.length);
    setStatus('');
    updateControls();
  }

  function win(info) {
    var stars = info.collected;
    var best = progress[current] || { done: false, stars: 0 };
    progress[current] = { done: true, stars: Math.max(best.stars, stars) };
    save();
    renderNav();
    setStatus('¡El robot llegó a la bandera!', 'win');

    var last = current === LEVELS.length - 1;
    el.dialogStars.innerHTML = starMarkup(stars);

    if (stars === info.total) {
      el.dialogTitle.textContent = last ? '¡Terminaste el juego!' : '¡Perfecto!';
      el.dialogText.textContent = 'Llegaste a la bandera con las ' + info.total + ' pilas.';
    } else {
      el.dialogTitle.textContent = '¡Lo lograste!';
      el.dialogText.textContent = stars === 0
        ? 'Llegaste a la bandera, pero no recogiste ninguna pila. ¿Encuentras el camino que pasa por las ' + info.total + '?'
        : 'Recogiste ' + stars + ' de ' + info.total + ' pilas. ¿Te atreves con las que faltan?';
    }

    el.next.hidden = last;

    /* A beat before the dialog, so the child sees the flag come apart on the board
       instead of reading about it over a scrim. Long enough for the burst to be up in
       the air, short enough that nobody wonders whether they won. */
    window.setTimeout(function () {
      el.overlay.hidden = false;
      (last ? el.again : el.next).focus();
    }, 620);
  }

  function closeDialog() {
    el.overlay.hidden = true;
  }

  /* ---------- events ---------- */

  Editor.mount({
    palette: el.palette,
    program: el.program,
    counter: el.counter,
    onChange: function () {
      // Editing after a run means the board no longer matches the program.
      if (!session && board) {
        board.reset();
        renderBatteries(0, board.grid.batteries.length);
      }
    },
    onReject: function (message) { setStatus(message, 'warn'); }
  });

  el.run.addEventListener('click', play);
  el.step.addEventListener('click', stepOnce);
  el.stop.addEventListener('click', stopRun);
  el.reset.addEventListener('click', resetRun);
  el.clear.addEventListener('click', function () { resetRun(); Editor.clear(); });

  el.speed.addEventListener('click', function () {
    speed = speed === 'normal' ? 'fast' : 'normal';
    el.speed.textContent = speed === 'fast' ? 'Normal' : 'Rápido';
    el.speed.setAttribute('aria-pressed', speed === 'fast' ? 'true' : 'false');
  });

  el.next.addEventListener('click', function () {
    closeDialog();
    if (current + 1 < LEVELS.length) loadLevel(current + 1);
  });

  el.again.addEventListener('click', function () {
    closeDialog();
    loadLevel(current);
  });

  el.overlay.addEventListener('click', function (e) {
    if (e.target === el.overlay) closeDialog();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !el.overlay.hidden) closeDialog();
  });

  window.addEventListener('resize', function () { if (board) board.fit(); });

  /* Start on the first level the child has not finished yet. */
  var start = 0;
  while (start < LEVELS.length - 1 && done(start)) start++;
  loadLevel(start);
})();
