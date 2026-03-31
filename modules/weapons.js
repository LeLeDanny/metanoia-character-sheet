// weapons.js
// Manages weapons (equipment modal editor) and ammo (main sheet).
// Exposes a single global: Weapons

const Weapons = (() => {

  let _onUpdate = null;

  const MAX_WEAPONS = 4;

  // ─── Public API ───────────────────────────────────────────────

  function init(onUpdate) {
    _onUpdate = onUpdate;

    // Equipment modal open / close
    document.getElementById('btn-open-equipment').addEventListener('click', openModal);
    document.getElementById('btn-equipment-modal-close').addEventListener('click', closeModal);
    document.getElementById('btn-equipment-modal-done').addEventListener('click', closeModal);
    document.getElementById('equipment-modal').addEventListener('click', handleOverlayClick);

    // Weapon editor (inside modal)
    document.getElementById('btn-add-weapon').addEventListener('click', addWeapon);
    document.getElementById('weapons-editor-list').addEventListener('click', handleEditorClick);
    document.getElementById('weapons-editor-list').addEventListener('input', function() { _onUpdate(); });

    // Weapon selector (main sheet)
    document.getElementById('select-weapon-active').addEventListener('change', function() {
      renderWeaponDetail(document.getElementById('select-weapon-active').value);
      _onUpdate();
    });

    // Ammo (main sheet)
    document.getElementById('input-ammo-text').addEventListener('input', function() { _onUpdate(); });
    document.getElementById('input-ammo-used').addEventListener('input', function() { _onUpdate(); });
    document.getElementById('input-ammo-max').addEventListener('input', function() { _onUpdate(); });
    document.getElementById('btn-ammo-use').addEventListener('click', handleAmmoUse);
  }

  function render(character) {
    var weapons = character.weapons || [];
    var ammo    = character.ammo    || { text: '', used: 0, max: 0 };

    reconcileEditor(weapons);
    updateAddButton(weapons.length);
    renderSummary(weapons, character.activeWeaponId || '');
    renderAmmo(ammo);
  }

  function read() {
    var weapons = [];
    document.querySelectorAll('#weapons-editor-list .weapon-row').forEach(function(row) {
      weapons.push({
        id:         row.dataset.id,
        name:       row.querySelector('.weapon-name').value.trim(),
        damageType: row.querySelector('.weapon-damage-type').value.trim(),
        range:      row.querySelector('.weapon-range').value.trim(),
      });
    });
    var textEl = document.getElementById('input-ammo-text');
    var usedEl = document.getElementById('input-ammo-used');
    var maxEl  = document.getElementById('input-ammo-max');
    return {
      weapons:        weapons,
      activeWeaponId: document.getElementById('select-weapon-active').value,
      ammo: {
        text: textEl ? textEl.value : '',
        used: usedEl ? (parseInt(usedEl.value, 10) || 0) : 0,
        max:  maxEl  ? (parseInt(maxEl.value,  10) || 0) : 0,
      },
    };
  }

  // ─── Equipment modal ──────────────────────────────────────────

  function openModal() {
    document.getElementById('equipment-modal').hidden = false;
  }

  function closeModal() {
    document.getElementById('equipment-modal').hidden = true;
  }

  function handleOverlayClick(e) {
    if (e.target === document.getElementById('equipment-modal')) closeModal();
  }

  // ─── Weapon editor ────────────────────────────────────────────

  function reconcileEditor(weapons) {
    var list     = document.getElementById('weapons-editor-list');
    var existing = {};
    list.querySelectorAll('.weapon-row').forEach(function(row) {
      existing[row.dataset.id] = row;
    });

    var targetIds = new Set(weapons.map(function(w) { return w.id; }));
    Object.keys(existing).forEach(function(id) {
      if (!targetIds.has(id)) existing[id].remove();
    });

    weapons.forEach(function(w, i) {
      var row = existing[w.id];
      if (!row) row = buildRow(w.id);
      updateRow(row, w);
      if (list.children[i] !== row) list.insertBefore(row, list.children[i] || null);
    });

    if (weapons.length === 0) {
      list.innerHTML = '<p class="weapons-empty">No weapons added.</p>';
    } else {
      var empty = list.querySelector('.weapons-empty');
      if (empty) empty.remove();
    }
  }

  function buildRow(id) {
    var row = document.createElement('div');
    row.className  = 'weapon-row';
    row.dataset.id = id;
    row.innerHTML =
      '<div class="weapon-fields">' +
        '<div class="field">' +
          '<label>Name</label>' +
          '<input type="text" class="weapon-name" placeholder="Weapon name">' +
        '</div>' +
        '<div class="field">' +
          '<label>Damage Type</label>' +
          '<input type="text" class="weapon-damage-type" placeholder="e.g. Slashing">' +
        '</div>' +
        '<div class="field">' +
          '<label>Range</label>' +
          '<input type="text" class="weapon-range" placeholder="e.g. Close">' +
        '</div>' +
      '</div>' +
      '<button class="btn-icon weapon-delete" type="button" aria-label="Remove">\u00d7</button>';
    return row;
  }

  function updateRow(row, data) {
    var nameEl   = row.querySelector('.weapon-name');
    var damageEl = row.querySelector('.weapon-damage-type');
    var rangeEl  = row.querySelector('.weapon-range');
    if (document.activeElement !== nameEl)   nameEl.value   = data.name       || '';
    if (document.activeElement !== damageEl) damageEl.value = data.damageType || '';
    if (document.activeElement !== rangeEl)  rangeEl.value  = data.range      || '';
  }

  function updateAddButton(count) {
    document.getElementById('btn-add-weapon').disabled = count >= MAX_WEAPONS;
  }

  function addWeapon() {
    var data = read();
    if (data.weapons.length >= MAX_WEAPONS) return;
    data.weapons.push({ id: Schema.newId(), name: '', damageType: '', range: '' });
    reconcileEditor(data.weapons);
    updateAddButton(data.weapons.length);
    var rows = document.querySelectorAll('#weapons-editor-list .weapon-row');
    if (rows.length) rows[rows.length - 1].querySelector('.weapon-name').focus();
    _onUpdate();
  }

  function handleEditorClick(e) {
    if (!e.target.closest('.weapon-delete')) return;
    e.target.closest('.weapon-row').remove();
    var list = document.getElementById('weapons-editor-list');
    if (!list.querySelector('.weapon-row')) {
      list.innerHTML = '<p class="weapons-empty">No weapons added.</p>';
    }
    updateAddButton(document.querySelectorAll('#weapons-editor-list .weapon-row').length);
    _onUpdate();
  }

  // ─── Weapon selector (main sheet) ────────────────────────────

  function renderSummary(weapons, savedId) {
    var select = document.getElementById('select-weapon-active');
    var named  = weapons.filter(function(w) { return w.name; });

    select.innerHTML = '<option value="">— None —</option>' +
      named.map(function(w) {
        return '<option value="' + escHtml(w.id) + '">' + escHtml(w.name) + '</option>';
      }).join('');

    var restoreId = savedId || select.value;
    if (restoreId && named.some(function(w) { return w.id === restoreId; })) {
      select.value = restoreId;
    }

    renderWeaponDetail(select.value);
  }

  function renderWeaponDetail(id) {
    var detail = document.getElementById('weapon-active-detail');
    if (!id) { detail.innerHTML = ''; return; }
    var data   = read();
    var weapon = (data.weapons || []).find(function(w) { return w.id === id; });
    if (!weapon) { detail.innerHTML = ''; return; }

    var rows = '';
    if (weapon.damageType) {
      rows += '<div class="weapon-detail-row">' +
        '<span class="weapon-detail-key">Type</span>' +
        '<span class="weapon-detail-val">' + escHtml(weapon.damageType) + '</span>' +
        '</div>';
    }
    if (weapon.range) {
      rows += '<div class="weapon-detail-row">' +
        '<span class="weapon-detail-key">Range</span>' +
        '<span class="weapon-detail-val">' + escHtml(weapon.range) + '</span>' +
        '</div>';
    }
    detail.innerHTML = rows;
  }

  // ─── Ammo (main sheet) ────────────────────────────────────────

  function renderAmmo(ammo) {
    var textEl = document.getElementById('input-ammo-text');
    var usedEl = document.getElementById('input-ammo-used');
    var maxEl  = document.getElementById('input-ammo-max');
    if (document.activeElement !== textEl) textEl.value = ammo.text || '';
    if (document.activeElement !== usedEl) usedEl.value = ammo.used || 0;
    if (document.activeElement !== maxEl)  maxEl.value  = ammo.max  || 0;
  }

  function handleAmmoUse() {
    var usedEl = document.getElementById('input-ammo-used');
    var maxEl  = document.getElementById('input-ammo-max');
    var used   = parseInt(usedEl.value, 10) || 0;
    var max    = parseInt(maxEl.value,  10) || 0;
    if (max > 0 && used >= max) return;
    usedEl.value = used + 1;
    _onUpdate();
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
