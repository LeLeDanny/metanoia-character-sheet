// values.js
// Manages the Values section (including nested polarities). Exposes a single global: Values
// Relies on globals: Schema (loaded before this module in index.html)

const Values = (() => {

  let _onUpdate = null;

  const DIES = ['d4', 'd6', 'd8', 'd10'];

  // ─── Public API ───────────────────────────────────────────────

  function init(onUpdate) {
    _onUpdate = onUpdate;
    buildModal();
    buildRows();
    setupListeners();
  }

  function render(character) {
    const sorted = (character.values || []).slice().sort((a, b) => a.rank - b.rank);
    const rows   = Array.from(document.querySelectorAll('#values-list .value-row'));

    rows.forEach((row, i) => {
      const v     = sorted[i] || { name: '', polarities: [] };
      const input = row.querySelector('.value-name-input');
      if (document.activeElement !== input) input.value = v.name || '';
      reconcilePolarities(row, v.polarities || []);
    });

    updateRankLabels();
  }

  function read() {
    const rows = document.querySelectorAll('#values-list .value-row');
    const values = [];
    rows.forEach((row, i) => {
      const polarities = [];
      row.querySelectorAll('.polarity-row').forEach(pr => {
        polarities.push({
          id:   pr.dataset.id,
          name: pr.querySelector('.polarity-name-input').value.trim(),
        });
      });
      values.push({
        rank:      i + 1,
        name:      row.querySelector('.value-name-input').value.trim(),
        polarities,
      });
    });
    return { values };
  }

  // ─── Build ────────────────────────────────────────────────────

  function buildRows() {
    const list = document.getElementById('values-list');
    for (let i = 0; i < 4; i++) list.appendChild(buildValueRow());
    updateRankLabels();
  }

  function buildValueRow() {
    const row      = document.createElement('div');
    row.className  = 'value-row';
    row.draggable  = true;
    row.innerHTML  = `
      <div class="value-header">
        <span class="drag-handle" aria-hidden="true">⠿</span>
        <div class="value-move-btns">
          <button class="value-move-btn" data-dir="up"   aria-label="Move up">▲</button>
          <button class="value-move-btn" data-dir="down" aria-label="Move down">▼</button>
        </div>
        <span class="value-rank-label"></span>
        <input type="text" class="value-name-input" placeholder="Enter value">
        <span class="value-die"></span>
      </div>
      <div class="polarity-group">
        <div class="polarity-list"></div>
        <button class="polarity-add-btn" type="button">+ Polarity</button>
      </div>
    `;
    return row;
  }

  function buildPolarityRow(id) {
    const row      = document.createElement('div');
    row.className  = 'polarity-row';
    row.dataset.id = id;
    row.innerHTML  = `
      <input type="text" class="polarity-name-input" placeholder="Polarity name">
      <button class="polarity-delete-btn btn-icon" type="button" aria-label="Remove polarity">×</button>
    `;
    return row;
  }

  function updateRankLabels() {
    document.querySelectorAll('#values-list .value-row').forEach((row, i) => {
      row.querySelector('.value-rank-label').textContent = `#${i + 1}`;
      row.querySelector('.value-die').textContent        = DIES[i];
      row.dataset.rank = i + 1;
    });
  }

  // ─── Polarity reconcile ───────────────────────────────────────

  function reconcilePolarities(valueRow, polarities) {
    const container = valueRow.querySelector('.polarity-list');
    const addBtn    = valueRow.querySelector('.polarity-add-btn');

    // Index existing rows by ID
    const existingRows = {};
    container.querySelectorAll('.polarity-row').forEach(r => {
      existingRows[r.dataset.id] = r;
    });

    const targetIds = new Set(polarities.map(p => p.id));

    // Remove stale rows
    Object.keys(existingRows).forEach(id => {
      if (!targetIds.has(id)) existingRows[id].remove();
    });

    // Add / update / reorder
    polarities.forEach((p, i) => {
      let row = existingRows[p.id];
      if (!row) row = buildPolarityRow(p.id);

      const input = row.querySelector('.polarity-name-input');
      if (document.activeElement !== input) input.value = p.name || '';

      if (container.children[i] !== row) {
        container.insertBefore(row, container.children[i] || null);
      }
    });

    addBtn.disabled = polarities.length >= 4;
  }

  // ─── Listeners ────────────────────────────────────────────────

  function setupListeners() {
    const list = document.getElementById('values-list');

    list.addEventListener('input', _onUpdate);

    list.addEventListener('click', e => {
      if (e.target.closest('.value-move-btn')) {
        const btn = e.target.closest('.value-move-btn');
        moveValueRow(btn.closest('.value-row'), btn.dataset.dir === 'up' ? -1 : 1);
        updateRankLabels();
        _onUpdate();
        return;
      }
      if (e.target.closest('.polarity-add-btn')) {
        addPolarity(e.target.closest('.value-row'));
        return;
      }
      if (e.target.closest('.polarity-delete-btn')) {
        deletePolarity(e.target.closest('.polarity-row'));
        return;
      }
    });

    document.getElementById('btn-values-ref').addEventListener('click', openModal);

    setupDragDrop(list);
  }

  // ─── Value row reorder ────────────────────────────────────────

  function moveValueRow(row, direction) {
    const list   = document.getElementById('values-list');
    const rows   = Array.from(list.querySelectorAll(':scope > .value-row'));
    const target = rows[rows.indexOf(row) + direction];
    if (!target) return;
    if (direction === -1) list.insertBefore(row, target);
    else target.insertAdjacentElement('afterend', row);
  }

  // ─── Polarity add / delete ────────────────────────────────────

  function addPolarity(valueRow) {
    const container = valueRow.querySelector('.polarity-list');
    const addBtn    = valueRow.querySelector('.polarity-add-btn');
    if (addBtn.disabled) return;

    const row = buildPolarityRow(Schema.newId());
    container.appendChild(row);
    addBtn.disabled = container.children.length >= 4;
    row.querySelector('.polarity-name-input').focus();
    _onUpdate();
  }

  function deletePolarity(polarityRow) {
    const valueRow  = polarityRow.closest('.value-row');
    const container = polarityRow.closest('.polarity-list');
    polarityRow.remove();
    valueRow.querySelector('.polarity-add-btn').disabled = container.children.length >= 4;
    _onUpdate();
  }

  // ─── Drag and Drop ────────────────────────────────────────────

  function setupDragDrop(list) {
    let dragSrc   = null;
    let dragAllow = false;

    // Only allow drag when starting from the handle
    list.addEventListener('mousedown', e => {
      dragAllow = !!e.target.closest('.drag-handle');
    });

    list.addEventListener('dragstart', e => {
      if (!dragAllow) { e.preventDefault(); return; }
      dragSrc = e.target.closest('.value-row');
      if (!dragSrc) return;
      dragSrc.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', ''); // required for Firefox
      dragAllow = false;
    });

    list.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const target = e.target.closest('.value-row');
      if (!target || target === dragSrc) return;
      const rect = target.getBoundingClientRect();
      if (e.clientY < rect.top + rect.height / 2) list.insertBefore(dragSrc, target);
      else target.insertAdjacentElement('afterend', dragSrc);
    });

    list.addEventListener('dragend', () => {
      if (dragSrc) { dragSrc.classList.remove('dragging'); dragSrc = null; }
      updateRankLabels();
      _onUpdate();
    });
  }

  // ─── Modal ────────────────────────────────────────────────────

  function buildModal() {
    const valueRows = Schema.BASELINE_VALUES.map((v, i) => `
      <tr><td>${i + 1}</td><td>${v.name}</td><td>${v.description}</td></tr>
    `).join('');

    const tabButtons = Schema.POLARITIES_BY_CATEGORY.map((cat, i) => `
      <button class="ref-tab-btn${i === 0 ? ' active' : ''}" data-tab="${i}">${cat.category}</button>
    `).join('');

    const tabPanels = Schema.POLARITIES_BY_CATEGORY.map((cat, i) => `
      <div class="ref-tab-panel${i === 0 ? ' active' : ''}" data-panel="${i}">
        <table class="polarity-ref-table">
          <tbody>${cat.entries.map(e => `
            <tr><td>${e.name}</td><td>${e.description}</td></tr>
          `).join('')}</tbody>
        </table>
      </div>
    `).join('');

    const overlay      = document.createElement('div');
    overlay.id         = 'values-modal';
    overlay.className  = 'modal-overlay';
    overlay.hidden     = true;
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'values-modal-title');
    overlay.innerHTML  = `
      <div class="modal">
        <div class="modal-header">
          <h3 id="values-modal-title">Reference</h3>
          <button class="btn-icon" id="btn-values-modal-close" aria-label="Close">✕</button>
        </div>
        <div class="modal-body">
          <h4 class="ref-section-title">Baseline Values</h4>
          <p class="modal-note">These are the baseline values. Characters are not restricted to this list.</p>
          <table class="values-ref-table">
            <thead><tr><th>#</th><th>Value</th><th>What It Represents</th></tr></thead>
            <tbody>${valueRows}</tbody>
          </table>
          <h4 class="ref-section-title ref-section-gap">Polarities</h4>
          <p class="modal-note">110 polarities across 13 categories. Characters may use polarities not on this list.</p>
          <div class="ref-tabs">
            <div class="ref-tab-bar">${tabButtons}</div>
            <div class="ref-tab-panels">${tabPanels}</div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('.ref-tab-bar').addEventListener('click', e => {
      const btn = e.target.closest('.ref-tab-btn');
      if (!btn) return;
      const idx = btn.dataset.tab;
      overlay.querySelectorAll('.ref-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === idx));
      overlay.querySelectorAll('.ref-tab-panel').forEach(p => p.classList.toggle('active', p.dataset.panel === idx));
    });

    document.getElementById('btn-values-modal-close').addEventListener('click', closeModal);
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !overlay.hidden) closeModal();
    });
  }

  function openModal() {
    document.getElementById('values-modal').hidden = false;
    document.getElementById('btn-values-modal-close').focus();
  }

  function closeModal() {
    document.getElementById('values-modal').hidden = true;
    document.getElementById('btn-values-ref').focus();
  }

  return { init, render, read };

})();
