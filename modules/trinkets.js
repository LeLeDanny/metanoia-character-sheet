// trinkets.js
// Manages the Trinkets & Items modal. Exposes a single global: Trinkets

const Trinkets = (() => {

  let _onUpdate = null;

  // ─── Public API ───────────────────────────────────────────────

  function init(onUpdate) {
    _onUpdate = onUpdate;
    document.getElementById('btn-open-trinkets').addEventListener('click', openModal);
    document.getElementById('btn-trinkets-modal-close').addEventListener('click', closeModal);
    document.getElementById('trinkets-modal').addEventListener('click', handleOverlayClick);
    document.getElementById('btn-add-trinket').addEventListener('click', addTrinket);
    document.getElementById('input-money').addEventListener('input', function() { _onUpdate(); });
    document.getElementById('trinkets-list').addEventListener('input', handleListInput);
    document.getElementById('trinkets-list').addEventListener('click', handleListClick);
  }

  function render(character) {
    var moneyEl = document.getElementById('input-money');
    if (moneyEl && document.activeElement !== moneyEl) moneyEl.value = character.money || '';
    reconcile(character.trinkets || []);
  }

  function read() {
    var trinkets = [];
    document.querySelectorAll('#trinkets-list .trinket-row').forEach(function(row) {
      trinkets.push({
        id:   row.dataset.id,
        name: row.querySelector('.trinket-name').value,
        note: row.querySelector('.trinket-note').value,
      });
    });
    return {
      money:    document.getElementById('input-money').value,
      trinkets: trinkets,
    };
  }

  // ─── List reconcile ───────────────────────────────────────────

  function reconcile(trinkets) {
    var list = document.getElementById('trinkets-list');
    var existing = {};
    list.querySelectorAll('.trinket-row').forEach(function(row) {
      existing[row.dataset.id] = row;
    });
    var targetIds = new Set(trinkets.map(function(t) { return t.id; }));
    Object.keys(existing).forEach(function(id) {
      if (!targetIds.has(id)) existing[id].remove();
    });
    trinkets.forEach(function(t, i) {
      var row = existing[t.id] || buildRow(t.id);
      updateRow(row, t);
      if (list.children[i] !== row) list.insertBefore(row, list.children[i] || null);
    });
  }

  function buildRow(id) {
    var row = document.createElement('div');
    row.className  = 'trinket-row';
    row.dataset.id = id;
    row.innerHTML =
      '<div class="trinket-row-main">' +
        '<input type="text" class="trinket-name" placeholder="e.g. A necklace my mother gave me">' +
        '<button class="btn-icon trinket-delete" type="button" aria-label="Remove">\u00d7</button>' +
      '</div>' +
      '<textarea class="trinket-note" rows="1" placeholder="Notes (optional)"></textarea>';
    return row;
  }

  function updateRow(row, data) {
    var nameEl = row.querySelector('.trinket-name');
    var noteEl = row.querySelector('.trinket-note');
    if (document.activeElement !== nameEl) nameEl.value = data.name || '';
    if (document.activeElement !== noteEl) noteEl.value = data.note || '';
  }

  // ─── Handlers ─────────────────────────────────────────────────

  function addTrinket() {
    var list = document.getElementById('trinkets-list');
    var row  = buildRow(Schema.newId());
    updateRow(row, { name: '', note: '' });
    list.appendChild(row);
    row.querySelector('.trinket-name').focus();
    _onUpdate();
  }

  function handleListInput(e) {
    if (e.target.matches('.trinket-name') || e.target.matches('.trinket-note')) _onUpdate();
  }

  function handleListClick(e) {
    if (e.target.closest('.trinket-delete')) {
      e.target.closest('.trinket-row').remove();
      _onUpdate();
    }
  }

  // ─── Modal open / close ───────────────────────────────────────

  function openModal() {
    document.getElementById('trinkets-modal').hidden = false;
  }

  function closeModal() {
    document.getElementById('trinkets-modal').hidden = true;
  }

  function handleOverlayClick(e) {
    if (e.target === document.getElementById('trinkets-modal')) closeModal();
  }

  return { init, render, read };
})();
