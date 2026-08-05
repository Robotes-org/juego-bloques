/* Editor: the palette on the left and the program the child builds in the middle.

   The program is a small tree — `repeat` blocks carry a `body` array — and the DOM
   is rebuilt from that tree after every change. Programs are tens of blocks at most,
   so a full redraw is both fast enough and much easier to trust than patching nodes.

   Blocks can be added in two ways, because dragging is still hard for an eight year
   old: click a palette block to append it, or drag it to drop it exactly where you
   want. Dragging is done with pointer events rather than the HTML5 drag-and-drop API,
   which cannot show an insertion point inside a nested container. */
var Editor = (function () {
  'use strict';

  var ICONS = {
    forward: '<path d="M12 20 V5 M12 4 L6 11 M12 4 L18 11"/>',
    left: '<path d="M17 20 V13 A5 5 0 0 0 12 8 H7 M11 4 L6 8 L11 12"/>',
    right: '<path d="M7 20 V13 A5 5 0 0 1 12 8 H17 M13 4 L18 8 L13 12"/>',
    repeat: '<path d="M6 11 A6 6 0 1 1 8 16 M3 7 L6 11 L10 9"/>'
  };

  var DEFS = {
    forward: { label: 'avanzar', kind: 'move' },
    left: { label: 'girar a la izquierda', kind: 'move' },
    right: { label: 'girar a la derecha', kind: 'move' },
    repeat: { label: 'repetir', kind: 'loop', container: true, times: 4 }
  };

  var MIN_TIMES = 2;
  var MAX_TIMES = 10;

  var program = [];
  var nextId = 1;
  var limit = 0;         // level.max, 0 when the level sets no limit
  var locked = false;
  var els = {};
  var onChange = function () {};
  var onReject = function () {};

  /* ---------- program tree ---------- */

  function makeNode(type) {
    var node = { id: 'b' + nextId++, type: type };
    if (DEFS[type].container) {
      node.times = DEFS[type].times;
      node.body = [];
    }
    return node;
  }

  function countBlocks(list) {
    var n = 0;
    list.forEach(function (node) {
      n += 1;
      if (node.body) n += countBlocks(node.body);
    });
    return n;
  }

  /* Returns the array a node lives in, plus its index, so callers can splice it out. */
  function locate(id, list) {
    list = list || program;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return { list: list, index: i };
      if (list[i].body) {
        var found = locate(id, list[i].body);
        if (found) return found;
      }
    }
    return null;
  }

  function findNode(id, list) {
    var at = locate(id, list);
    return at ? at.list[at.index] : null;
  }

  function containerList(containerId) {
    if (containerId === 'root') return program;
    var node = findNode(containerId);
    return node && node.body ? node.body : null;
  }

  function remove(id) {
    var at = locate(id);
    if (!at) return null;
    return at.list.splice(at.index, 1)[0];
  }

  /* ---------- rendering ---------- */

  function iconFor(type) {
    return '<svg class="block-icon" viewBox="0 0 24 24" aria-hidden="true">' + ICONS[type] + '</svg>';
  }

  /* The coloured body of a piece, as two nested spans behind the text.
     They cannot be collapsed into one element, or into a ::before: the outline is drawn
     with drop-shadows, and CSS applies clip-path *after* filter, so a single element
     would clip away its own outline. The outer span carries the filter, the inner one
     the silhouette. Keeping them empty is what stops the text from being outlined too. */
  function pieceMarkup() {
    return '<span class="piece"><span class="piece-face"></span></span>';
  }

  function renderPalette(blocks) {
    els.palette.innerHTML = '';
    blocks.forEach(function (type) {
      var def = DEFS[type];
      var el = document.createElement('button');
      el.type = 'button';
      el.className = 'block block-' + def.kind + ' is-source';
      el.dataset.type = type;
      el.innerHTML = pieceMarkup() + iconFor(type) + '<span class="block-label">' + def.label + '</span>';
      els.palette.appendChild(el);
    });
  }

  function renderBlock(node) {
    var def = DEFS[node.type];
    var el = document.createElement('div');
    el.className = 'block block-' + def.kind;
    el.dataset.id = node.id;

    if (!def.container) {
      el.innerHTML = pieceMarkup() + iconFor(node.type) +
        '<span class="block-label">' + def.label + '</span>' +
        '<button type="button" class="block-remove" aria-label="Quitar bloque">×</button>';
      return el;
    }

    el.classList.add('block-container');
    el.innerHTML =
      '<div class="block-head">' +
        pieceMarkup() +
        iconFor(node.type) +
        '<span class="block-label">repetir</span>' +
        '<span class="times">' +
          '<button type="button" class="times-btn" data-delta="-1" aria-label="Menos veces">−</button>' +
          '<span class="times-value">' + node.times + '</span>' +
          '<button type="button" class="times-btn" data-delta="1" aria-label="Más veces">+</button>' +
        '</span>' +
        '<span class="block-label block-label-tail">veces</span>' +
        '<button type="button" class="block-remove" aria-label="Quitar bloque">×</button>' +
      '</div>' +
      '<div class="block-body" data-container="' + node.id + '"></div>' +
      '<div class="block-foot">' + pieceMarkup() + '</div>';

    var body = el.querySelector('.block-body');
    if (!node.body.length) {
      var empty = document.createElement('p');
      empty.className = 'block-empty';
      empty.textContent = 'pon bloques aquí';
      body.appendChild(empty);
    } else {
      node.body.forEach(function (child) { body.appendChild(renderBlock(child)); });
    }
    return el;
  }

  function render() {
    els.program.innerHTML = '';
    if (!program.length) {
      var empty = document.createElement('p');
      empty.className = 'program-empty';
      empty.textContent = 'Arrastra bloques hasta aquí, o haz clic en uno de la izquierda.';
      els.program.appendChild(empty);
    } else {
      program.forEach(function (node) { els.program.appendChild(renderBlock(node)); });
    }
    renderCounter();
    onChange();
  }

  function renderCounter() {
    var used = countBlocks(program);
    els.counter.textContent = limit ? used + ' de ' + limit + ' bloques' : used + (used === 1 ? ' bloque' : ' bloques');
    els.counter.classList.toggle('is-full', !!limit && used >= limit);
  }

  /* ---------- editing ---------- */

  function canGrow() {
    if (!limit) return true;
    if (countBlocks(program) < limit) return true;
    onReject('En este nivel puedes usar máximo ' + limit + ' bloques. Prueba con "repetir".');
    return false;
  }

  function append(type) {
    if (locked || !canGrow()) return;
    program.push(makeNode(type));
    render();
  }

  function insert(node, containerId, index) {
    var list = containerList(containerId);
    if (!list) return;
    list.splice(index, 0, node);
    render();
  }

  function changeTimes(id, delta) {
    var node = findNode(id);
    if (!node || !node.body) return;
    node.times = Math.max(MIN_TIMES, Math.min(MAX_TIMES, node.times + delta));
    render();
  }

  /* ---------- drag and drop ---------- */

  var drag = null;
  var dropLine = null;

  function onPointerDown(e) {
    if (locked || e.button !== 0) return;
    var blockEl = e.target.closest('.block');
    if (!blockEl) return;
    if (e.target.closest('.block-remove')) {
      remove(blockEl.dataset.id);
      render();
      return;
    }
    if (e.target.closest('.times-btn')) {
      changeTimes(blockEl.dataset.id, Number(e.target.dataset.delta));
      return;
    }

    drag = {
      source: blockEl.classList.contains('is-source') ? 'palette' : 'program',
      type: blockEl.dataset.type,
      id: blockEl.dataset.id,
      el: blockEl,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
      ghost: null
    };
    // Keep receiving moves even when the cursor leaves the block it started on.
    // Moves are also listened for on `document`, so a browser that refuses the
    // capture (or a synthetic event in the tests) still drags fine.
    try { blockEl.setPointerCapture(e.pointerId); } catch (err) { /* not fatal */ }
    e.preventDefault();
  }

  function onPointerMove(e) {
    if (!drag) return;
    if (!drag.moved) {
      if (Math.abs(e.clientX - drag.startX) < 5 && Math.abs(e.clientY - drag.startY) < 5) return;
      startGhost();
    }
    drag.ghost.style.left = e.clientX + 'px';
    drag.ghost.style.top = e.clientY + 'px';
    showDropHint(findDrop(e.clientX, e.clientY, drag));
  }

  function startGhost() {
    drag.moved = true;
    var ghost = drag.el.cloneNode(true);
    ghost.classList.add('drag-ghost');
    ghost.classList.remove('is-source');
    // A dragged `repeat` carries its body along; hiding it keeps the ghost small.
    var body = ghost.querySelector('.block-body');
    if (body) body.remove();
    document.body.appendChild(ghost);
    drag.ghost = ghost;
    if (drag.source === 'program') drag.el.classList.add('is-dragging');
  }

  /* Finds the deepest container under the cursor and where in it the block would land.
     Takes the drag state as an argument because pointerup clears the shared one before
     asking where the block should go. */
  function findDrop(x, y, state) {
    var box = els.program.getBoundingClientRect();
    if (x < box.left || x > box.right || y < box.top || y > box.bottom) return null;

    var containers = [els.program].concat(Array.prototype.slice.call(els.program.querySelectorAll('.block-body')));
    var best = null;
    containers.forEach(function (el) {
      // Never drop a container inside itself.
      if (state.source === 'program' && state.el.contains(el)) return;
      var r = el.getBoundingClientRect();
      if (x < r.left || x > r.right || y < r.top || y > r.bottom) return;
      var depth = 0, walk = el;
      while (walk && walk !== els.program) { depth++; walk = walk.parentNode; }
      if (!best || depth > best.depth) best = { el: el, depth: depth };
    });
    if (!best) best = { el: els.program, depth: 0 };

    var containerId = best.el === els.program ? 'root' : best.el.dataset.container;
    var children = Array.prototype.filter.call(best.el.children, function (c) {
      return c.classList.contains('block') && c !== state.el;
    });
    var index = children.length;
    for (var i = 0; i < children.length; i++) {
      var r = children[i].getBoundingClientRect();
      if (y < r.top + r.height / 2) { index = i; break; }
    }
    return { containerId: containerId, index: index, el: best.el, before: children[index] || null };
  }

  function showDropHint(drop) {
    if (!dropLine) {
      dropLine = document.createElement('div');
      dropLine.className = 'drop-line';
    }
    // Show every "put blocks here" label again before hiding the one being targeted,
    // otherwise a container the cursor merely passed over stays blank.
    Array.prototype.forEach.call(els.program.querySelectorAll('.block-empty, .program-empty'), function (p) {
      p.style.visibility = '';
    });
    if (!drop) {
      if (dropLine.parentNode) dropLine.parentNode.removeChild(dropLine);
      return;
    }
    var placeholder = drop.el.querySelector('.block-empty, .program-empty');
    if (placeholder) placeholder.style.visibility = 'hidden';
    drop.el.insertBefore(dropLine, drop.before);
  }

  function onPointerUp(e) {
    if (!drag) return;
    var current = drag;
    drag = null;

    if (dropLine && dropLine.parentNode) dropLine.parentNode.removeChild(dropLine);
    if (current.ghost) current.ghost.remove();
    current.el.classList.remove('is-dragging');

    if (!current.moved) {
      // A plain click on a palette block appends it — no dragging skill required.
      if (current.source === 'palette') append(current.type);
      return;
    }

    var drop = findDrop(e.clientX, e.clientY, current);

    if (current.source === 'palette') {
      if (!drop || !canGrow()) { render(); return; }
      insert(makeNode(current.type), drop.containerId, drop.index);
      return;
    }

    if (!drop) {           // dropped outside the program: the child threw it away
      remove(current.id);
      render();
      return;
    }

    // `drop.index` was measured against the siblings with the dragged block already
    // left out, so it needs no correction after removing it from the tree.
    var node = remove(current.id);
    if (node) insert(node, drop.containerId, drop.index);
    else render();
  }

  /* ---------- public API ---------- */

  return {
    mount: function (opts) {
      els.palette = opts.palette;
      els.program = opts.program;
      els.counter = opts.counter;
      onChange = opts.onChange || onChange;
      onReject = opts.onReject || onReject;

      els.palette.addEventListener('pointerdown', onPointerDown);
      els.program.addEventListener('pointerdown', onPointerDown);
      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp);
      document.addEventListener('pointercancel', onPointerUp);
    },

    setLevel: function (level) {
      program = [];
      limit = level.max || 0;
      renderPalette(level.blocks);
      render();
    },

    clear: function () {
      if (locked) return;
      program = [];
      render();
    },

    getProgram: function () { return program; },
    count: function () { return countBlocks(program); },
    isEmpty: function () { return program.length === 0; },

    setLocked: function (value) {
      locked = value;
      els.program.classList.toggle('is-locked', value);
      els.palette.classList.toggle('is-locked', value);
    },

    highlight: function (id) {
      var previous = els.program.querySelector('.is-running');
      if (previous) previous.classList.remove('is-running');
      if (!id) return;
      var el = els.program.querySelector('[data-id="' + id + '"]');
      if (el) el.classList.add('is-running');
    }
  };
})();
