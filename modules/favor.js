// favor.js
// Manages the Favor section. Exposes a single global: Favor
// Relies on globals: Schema (loaded before this module in index.html)

const Favor = (() => {

  let _onUpdate = null;

  // ─── Public API ───────────────────────────────────────────────

  function init(onUpdate) {
    _onUpdate = onUpdate;
    document.getElementById('btn-favor-edit').addEventListener('click', openModal);
    document.getElementById('btn-favor-modal-close').addEventListener('click', closeModal);
    document.getElementById('btn-favor-modal-done').addEventListener('click', closeModal);
    document.getElementById('btn-add-favor').addEventListener('click', addEntry);
    document.getElementById('favor-modal').addEventListener('click', handleOverlayClick);
    document.getElementById('favor-modal-list').addEventListener('click', handleListClick);
    document.getElementById('favor-modal-list').addEventListener('input', handleListInput);
    document.getElementById('favor-modal-list').addEventListener('change', handleListChange);
    document.getElementById('favor-current-faction').addEventListener('change', onUpdate);
  }

  function render(character) {
    var realm = (character.identity || {}).realm || 0;
    var pool  = Schema.calcStartingFavor(realm);
    document.getElementById('favor-starting-pool').textContent = pool;
    document.getElementById('favor-modal-pool').textContent    = pool;
    reconcileModal(character.favor || []);
    renderSummary(character.favor || []);
    renderFactionDropdown(character.favor || [], character.currentFaction || '');
  }

  function read() {
    var favor = [];
    document.querySelectorAll('#favor-modal-list .favor-row').forEach(function(row) {
      favor.push({
        id:     row.dataset.id,
        type:   row.querySelector('.favor-type').value,
        entity: row.querySelector('.favor-entity').value.trim(),
        rating: parseInt(row.dataset.rating, 10) || 0,
        status: row.querySelector('.favor-status').value,
        desc:   row.querySelector('.favor-desc').value,
      });
    });
    return {
      favor:          favor,
      currentFaction: document.getElementById('favor-current-faction').value,
    };
  }

  // ─── Summary (main sheet view) ────────────────────────────────

  function renderSummary(favor) {
    var list   = document.getElementById('favor-summary-list');
    var active = favor.filter(function(f) { return f.rating !== 0; });
    if (active.length === 0) {
      list.innerHTML = '<p class="favor-empty">No active favor</p>';
      return;
    }
    list.innerHTML = active.map(function(f) {
      var ratingClass = f.rating > 0 ? 'favor-rating-pos' : 'favor-rating-neg';
      var ratingText  = (f.rating > 0 ? '+' : '') + f.rating;
      var statusHtml  = f.status
        ? '<span class="favor-summary-status">' + escHtml(f.status) + '</span>'
        : '';
      return (
        '<div class="favor-summary-row">' +
          '<div class="favor-summary-main">' +
            '<span class="favor-entity-name">' + escHtml(f.entity || '\u2014') + '</span>' +
            statusHtml +
          '</div>' +
          '<span class="favor-badge">' + escHtml(f.type) + '</span>' +
          '<span class="favor-rating-display ' + ratingClass + '">' + ratingText + '</span>' +
        '</div>'
      );
    }).join('');
  }

  function renderFactionDropdown(favor, currentValue) {
    var select   = document.getElementById('favor-current-faction');
    var factions = favor.filter(function(f) {
      return f.type !== 'Personal' && f.entity;
    });
    var prev = select.value;
    select.innerHTML = '<option value="">— None —</option>' +
      factions.map(function(f) {
        var label = f.status ? escHtml(f.entity) + ' \u2014 ' + escHtml(f.status) : escHtml(f.entity);
        return '<option value="' + escHtml(f.entity) + '">' + label + '</option>';
      }).join('');
    // Restore selection: prefer explicit currentValue, then previous selection, then none
    var saved = currentValue || prev;
    var values = factions.map(function(f) { return f.entity; });
    select.value = values.indexOf(saved) !== -1 ? saved : '';
  }

  // ─── Modal list reconcile ─────────────────────────────────────

  function reconcileModal(favor) {
    var list = document.getElementById('favor-modal-list');
    var existing = {};
    list.querySelectorAll('.favor-row').forEach(function(row) {
      existing[row.dataset.id] = row;
    });
    var targetIds = new Set(favor.map(function(f) { return f.id; }));
    Object.keys(existing).forEach(function(id) {
      if (!targetIds.has(id)) existing[id].remove();
    });
    favor.forEach(function(f, i) {
      var row = existing[f.id];
      if (!row) row = buildRow(f.id);
      updateRow(row, f);
      if (list.children[i] !== row) list.insertBefore(row, list.children[i] || null);
    });
  }

  function statusListForType(type) {
    return type === 'Personal' ? Schema.FAVOR_STATUSES : Schema.FAVOR_FACTION_STATUSES;
  }

  function buildRow(id) {
    var typeOpts = Schema.FAVOR_TYPES.map(function(t) {
      return '<option value="' + t + '">' + t + '</option>';
    }).join('');
    var row = document.createElement('div');
    row.className      = 'favor-row';
    row.dataset.id     = id;
    row.dataset.rating = '0';
    row.innerHTML =
      '<div class="favor-row-top">' +
        '<select class="favor-type">' + typeOpts + '</select>' +
        '<input type="text" class="favor-entity" placeholder="Name or faction">' +
        '<div class="favor-rating-ctrl">' +
          '<button class="btn btn-sm favor-dec" type="button">\u2212</button>' +
          '<span class="favor-rating-val">0</span>' +
          '<button class="btn btn-sm favor-inc" type="button">+</button>' +
        '</div>' +
        '<button class="btn-icon favor-delete" type="button" aria-label="Remove">\u00d7</button>' +
      '</div>' +
      '<select class="favor-status"></select>' +
      '<textarea class="favor-desc" placeholder="Notes on this relationship\u2026" rows="2"></textarea>';
    return row;
  }

  function populateStatusOptions(statusSelect, type, currentValue) {
    var list = statusListForType(type);
    statusSelect.innerHTML = list.map(function(s) {
      return '<option value="' + s.value + '">' + escHtml(s.label) + '</option>';
    }).join('');
    var values = list.map(function(s) { return s.value; });
    statusSelect.value = (currentValue && values.indexOf(currentValue) !== -1)
      ? currentValue
      : list[0].value;
  }

  function updateRow(row, data) {
    var typeSelect    = row.querySelector('.favor-type');
    var entityInput   = row.querySelector('.favor-entity');
    var statusSelect  = row.querySelector('.favor-status');
    var descArea      = row.querySelector('.favor-desc');
    var ratingSpan    = row.querySelector('.favor-rating-val');
    var rating = typeof data.rating === 'number' ? data.rating : 0;
    var type   = data.type || Schema.FAVOR_TYPES[0];

    if (document.activeElement !== typeSelect)  typeSelect.value  = type;
    if (document.activeElement !== entityInput) entityInput.value = data.entity || '';
    if (document.activeElement !== descArea)    descArea.value    = data.desc   || '';
    if (document.activeElement !== statusSelect) populateStatusOptions(statusSelect, type, data.status || null);
    row.dataset.rating     = String(rating);
    ratingSpan.textContent = rating;
    applyRatingClass(ratingSpan, rating);
  }

  function applyRatingClass(el, rating) {
    el.classList.toggle('favor-rating-pos', rating > 0);
    el.classList.toggle('favor-rating-neg', rating < 0);
  }

  // ─── Handlers ─────────────────────────────────────────────────

  function addEntry() {
    var list = document.getElementById('favor-modal-list');
    var row  = buildRow(Schema.newId());
    updateRow(row, { type: Schema.FAVOR_TYPES[0], entity: '', rating: 0 });
    list.appendChild(row);
    row.querySelector('.favor-entity').focus();
    _onUpdate();
  }

  function handleListClick(e) {
    var row = e.target.closest('.favor-row');
    if (!row) return;
    if (e.target.closest('.favor-inc')) {
      setRating(row, (parseInt(row.dataset.rating, 10) || 0) + 1);
      _onUpdate();
      return;
    }
    if (e.target.closest('.favor-dec')) {
      setRating(row, (parseInt(row.dataset.rating, 10) || 0) - 1);
      _onUpdate();
      return;
    }
    if (e.target.closest('.favor-delete')) {
      row.remove();
      _onUpdate();
    }
  }

  function handleListInput(e) {
    if (e.target.matches('.favor-entity') || e.target.matches('.favor-desc')) _onUpdate();
  }

  function handleListChange(e) {
    if (e.target.matches('.favor-type')) {
      var row = e.target.closest('.favor-row');
      var statusSelect = row.querySelector('.favor-status');
      populateStatusOptions(statusSelect, e.target.value, null);
      _onUpdate();
      return;
    }
    if (e.target.matches('.favor-status')) _onUpdate();
  }

  function setRating(row, rating) {
    row.dataset.rating = String(rating);
    var span = row.querySelector('.favor-rating-val');
    span.textContent = rating;
    applyRatingClass(span, rating);
  }

  // ─── Modal open / close ───────────────────────────────────────

  function openModal() {
    document.getElementById('favor-modal').hidden = false;
  }

  function closeModal() {
    document.getElementById('favor-modal').hidden = true;
  }

  function handleOverlayClick(e) {
    if (e.target === document.getElementById('favor-modal')) closeModal();
  }

  // ─── Utility ──────────────────────────────────────────────────

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  return { init, render, read };
})();
