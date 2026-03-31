// values.js
// Manages the Values section. Polarities and experiences are edited in a per-value config modal.
// Exposes a single global: Values
// Relies on globals: Schema (loaded before this module in index.html)

const Values = (() => {

  let _onUpdate = null;

  // Source of truth for polarities and experiences, indexed by row position (0–3).
  // Value names live in the row DOM inputs.
  let _valueData = [
    { polarities: [], experiences: [] },
    { polarities: [], experiences: [] },
    { polarities: [], experiences: [] },
    { polarities: [], experiences: [] },
  ];

  // Index of the value currently open in the config modal, or null.
  let _configIdx = null;

  const DIES = ['d4', 'd6', 'd8', 'd10'];

  // ─── Public API ───────────────────────────────────────────────

  function init(onUpdate) {
    _onUpdate = onUpdate;
    buildRefModal();
    buildConfigModal();
    buildRows();
    setupListeners();
  }

  function render(character) {
    const sorted = (character.values || []).slice().sort((a, b) => a.rank - b.rank);
    const rows   = Array.from(document.querySelectorAll('#values-list .value-row'));

    rows.forEach((row, i) => {
      const v     = sorted[i] || { name: '', polarities: [], experiences: [] };
      const input = row.querySelector('.value-name-input');
      if (document.activeElement !== input) input.value = v.name || '';

      // Skip the value currently open in the config modal — its live DOM is the source of truth.
      if (i !== _configIdx) {
        _valueData[i] = {
          polarities:  (v.polarities  || []).map(p => ({ ...p })),
          experiences: (v.experiences || []).map(e => ({ ...e })),
        };
      }

      updateSummary(row, i);
    });

    updateRankLabels();
  }

  function read() {
    if (_configIdx !== null) syncModalToData();

    const rows = document.querySelectorAll('#values-list .value-row');
    const values = [];
    rows.forEach((row, i) => {
      values.push({
        rank:        i + 1,
        name:        row.querySelector('.value-name-input').value.trim(),
        polarities:  _valueData[i].polarities,
        experiences: _valueData[i].experiences,
      });
    });
    return { values };
  }

  // ─── Main rows ────────────────────────────────────────────────

  function buildRows() {
    const list = document.getElementById('values-list');
    for (let i = 0; i < 4; i++) list.appendChild(buildValueRow());
    updateRankLabels();
  }

  function buildValueRow() {
    const row     = document.createElement('div');
    row.className = 'value-row';
    row.draggable = true;
    row.innerHTML = `
      <div class="value-header">
        <span class="drag-handle" aria-hidden="true">⠿</span>
        <div class="value-move-btns">
          <button class="value-move-btn" data-dir="up"   aria-label="Move up">▲</button>
          <button class="value-move-btn" data-dir="down" aria-label="Move down">▼</button>
        </div>
        <span class="value-rank-label"></span>
        <input type="text" class="value-name-input" placeholder="Enter value">
        <span class="value-die"></span>
        <button class="value-config-btn" type="button" aria-label="Configure polarities and experiences">⚙</button>
      </div>
      <div class="value-summary"></div>
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

  function updateSummary(row, idx) {
    const summary = row.querySelector('.value-summary');
    const data    = _valueData[idx];
    const names   = data.polarities.filter(p => p.name).map(p => p.name);
    const exps    = data.experiences.filter(e => e.description).map(e => e.description);

    let html = '';
    if (names.length) html += `<span class="summary-polarities">${names.join(', ')}</span>`;
    if (exps.length)  html += `<span class="summary-experience">${exps.join(' | ')}</span>`;
    summary.innerHTML = html;
  }

  // ─── Config modal ─────────────────────────────────────────────

  function buildConfigModal() {
    const overlay     = document.createElement('div');
    overlay.id        = 'value-config-modal';
    overlay.className = 'modal-overlay';
    overlay.hidden    = true;
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'value-config-title');
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3 id="value-config-title"></h3>
          <button class="btn-icon" id="btn-value-config-close" aria-label="Close">✕</button>
        </div>
        <div class="modal-body">
          <div class="config-section">
            <h4 class="config-section-title">Polarities</h4>
            <div id="config-polarity-list" class="config-item-list"></div>
            <button id="config-polarity-add" type="button" class="config-add-btn">+ Polarity</button>
          </div>
          <div class="config-section">
            <h4 class="config-section-title">Experiences</h4>
            <p class="modal-note">Formative moments that led to this value. Grant a boon when relevant to the current scenario and a polarity from this value is in use.</p>
            <div id="config-experience-list" class="config-item-list"></div>
            <button id="config-experience-add" type="button" class="config-add-btn">+ Experience</button>
          </div>
        </div>
        <div class="modal-footer">
          <button id="btn-value-config-save" type="button" class="btn-primary">Save &amp; Close</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById('btn-value-config-close').addEventListener('click', closeConfigModal);
    document.getElementById('btn-value-config-save').addEventListener('click', closeConfigModal);
    overlay.addEventListener('click', e => { if (e.target === overlay) closeConfigModal(); });

    document.getElementById('config-polarity-add').addEventListener('click', addConfigPolarity);
    document.getElementById('config-experience-add').addEventListener('click', addConfigExperience);

    document.getElementById('config-polarity-list').addEventListener('click', e => {
      const btn = e.target.closest('.config-delete-btn');
      if (btn) deleteConfigItem(btn.closest('.config-item-row'), 'polarity');
    });
    document.getElementById('config-experience-list').addEventListener('click', e => {
      const btn = e.target.closest('.config-delete-btn');
      if (btn) deleteConfigItem(btn.closest('.config-item-row'), 'experience');
    });

    document.getElementById('config-polarity-list').addEventListener('input',  onConfigInput);
    document.getElementById('config-experience-list').addEventListener('input', onConfigInput);
  }

  function buildConfigItemRow(id, value, placeholder) {
    const row     = document.createElement('div');
    row.className = 'config-item-row';
    row.dataset.id = id;
    const escaped  = (value || '').replace(/"/g, '&quot;');
    row.innerHTML  = `
      <input type="text" class="config-item-input" placeholder="${placeholder}" value="${escaped}">
      <button class="config-delete-btn btn-icon" type="button" aria-label="Remove">×</button>
    `;
    return row;
  }

  function populateConfigModal(idx) {
    const name = getValueNameAt(idx);
    document.getElementById('value-config-title').textContent =
      `#${idx + 1} ${name || '(unnamed)'}`;

    const data  = _valueData[idx];

    const pList = document.getElementById('config-polarity-list');
    pList.innerHTML = '';
    data.polarities.forEach(p => pList.appendChild(buildConfigItemRow(p.id, p.name, 'Polarity name')));
    document.getElementById('config-polarity-add').disabled   = data.polarities.length  >= 4;

    const eList = document.getElementById('config-experience-list');
    eList.innerHTML = '';
    data.experiences.forEach(e => eList.appendChild(buildConfigItemRow(e.id, e.description, 'Experience')));
    document.getElementById('config-experience-add').disabled = data.experiences.length >= 4;
  }

  function getValueNameAt(idx) {
    const rows = document.querySelectorAll('#values-list .value-row');
    return rows[idx] ? rows[idx].querySelector('.value-name-input').value.trim() : '';
  }

  function syncModalToData() {
    if (_configIdx === null) return;

    const polarities = [];
    document.querySelectorAll('#config-polarity-list .config-item-row').forEach(row => {
      polarities.push({ id: row.dataset.id, name: row.querySelector('.config-item-input').value.trim() });
    });

    const experiences = [];
    document.querySelectorAll('#config-experience-list .config-item-row').forEach(row => {
      experiences.push({ id: row.dataset.id, description: row.querySelector('.config-item-input').value.trim() });
    });

    _valueData[_configIdx] = { polarities, experiences };
  }

  function onConfigInput() {
    syncModalToData();
    const rows = document.querySelectorAll('#values-list .value-row');
    if (rows[_configIdx]) updateSummary(rows[_configIdx], _configIdx);
    _onUpdate();
  }

  function addConfigPolarity() {
    const data = _valueData[_configIdx];
    if (data.polarities.length >= 4) return;
    const id = Schema.newId();
    data.polarities.push({ id, name: '' });
    const row = buildConfigItemRow(id, '', 'Polarity name');
    document.getElementById('config-polarity-list').appendChild(row);
    document.getElementById('config-polarity-add').disabled = data.polarities.length >= 4;
    row.querySelector('.config-item-input').focus();
    _onUpdate();
  }

  function addConfigExperience() {
    const data = _valueData[_configIdx];
    if (data.experiences.length >= 4) return;
    const id   = Schema.newId();
    data.experiences.push({ id, description: '' });
    const row  = buildConfigItemRow(id, '', 'Experience');
    document.getElementById('config-experience-list').appendChild(row);
    document.getElementById('config-experience-add').disabled = data.experiences.length >= 4;
    row.querySelector('.config-item-input').focus();
    _onUpdate();
  }

  function deleteConfigItem(row, kind) {
    const id   = row.dataset.id;
    const data = _valueData[_configIdx];
    if (kind === 'polarity')   data.polarities  = data.polarities.filter(p => p.id !== id);
    if (kind === 'experience') data.experiences = data.experiences.filter(e => e.id !== id);
    row.remove();
    document.getElementById('config-polarity-add').disabled   = data.polarities.length  >= 4;
    document.getElementById('config-experience-add').disabled = data.experiences.length >= 4;
    const rows = document.querySelectorAll('#values-list .value-row');
    if (rows[_configIdx]) updateSummary(rows[_configIdx], _configIdx);
    _onUpdate();
  }

  function openConfigModal(idx) {
    _configIdx = idx;
    populateConfigModal(idx);
    document.getElementById('value-config-modal').hidden = false;
    document.getElementById('btn-value-config-close').focus();
  }

  function closeConfigModal() {
    syncModalToData();
    const rows = document.querySelectorAll('#values-list .value-row');
    if (rows[_configIdx]) updateSummary(rows[_configIdx], _configIdx);
    _configIdx = null;
    document.getElementById('value-config-modal').hidden = true;
    _onUpdate();
  }

  // ─── Main row listeners ───────────────────────────────────────

  function setupListeners() {
    const list = document.getElementById('values-list');

    list.addEventListener('input', e => {
      // Keep config modal title in sync when the name input changes
      if (_configIdx !== null && e.target.classList.contains('value-name-input')) {
        const rows = Array.from(list.querySelectorAll(':scope > .value-row'));
        const idx  = rows.indexOf(e.target.closest('.value-row'));
        if (idx === _configIdx) {
          document.getElementById('value-config-title').textContent =
            `#${idx + 1} ${e.target.value.trim() || '(unnamed)'}`;
        }
      }
      _onUpdate();
    });

    list.addEventListener('click', e => {
      if (e.target.closest('.value-move-btn')) {
        const btn = e.target.closest('.value-move-btn');
        moveValueRow(btn.closest('.value-row'), btn.dataset.dir === 'up' ? -1 : 1);
        updateRankLabels();
        _onUpdate();
        return;
      }
      if (e.target.closest('.value-config-btn')) {
        const rows = Array.from(list.querySelectorAll(':scope > .value-row'));
        openConfigModal(rows.indexOf(e.target.closest('.value-row')));
        return;
      }
    });

    document.getElementById('btn-values-ref').addEventListener('click', openRefModal);

    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      if (!document.getElementById('value-config-modal').hidden) closeConfigModal();
      else if (!document.getElementById('values-modal').hidden)  closeRefModal();
    });

    setupDragDrop(list);
  }

  // ─── Value row reorder ────────────────────────────────────────

  function moveValueRow(row, direction) {
    const list   = document.getElementById('values-list');
    const rows   = Array.from(list.querySelectorAll(':scope > .value-row'));
    const idx    = rows.indexOf(row);
    const target = rows[idx + direction];
    if (!target) return;

    [_valueData[idx], _valueData[idx + direction]] = [_valueData[idx + direction], _valueData[idx]];

    if (direction === -1) list.insertBefore(row, target);
    else target.insertAdjacentElement('afterend', row);
  }

  // ─── Drag and drop ────────────────────────────────────────────

  function setupDragDrop(list) {
    let dragSrc    = null;
    let dragSrcIdx = null;
    let dragAllow  = false;

    list.addEventListener('mousedown', e => {
      dragAllow = !!e.target.closest('.drag-handle');
    });

    list.addEventListener('dragstart', e => {
      if (!dragAllow) { e.preventDefault(); return; }
      dragSrc = e.target.closest('.value-row');
      if (!dragSrc) return;
      dragSrcIdx = Array.from(list.querySelectorAll(':scope > .value-row')).indexOf(dragSrc);
      dragSrc.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', '');
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
      if (!dragSrc) return;
      dragSrc.classList.remove('dragging');
      const newIdx = Array.from(list.querySelectorAll(':scope > .value-row')).indexOf(dragSrc);
      if (newIdx !== dragSrcIdx) {
        const moved = _valueData.splice(dragSrcIdx, 1)[0];
        _valueData.splice(newIdx, 0, moved);
      }
      dragSrc    = null;
      dragSrcIdx = null;
      updateRankLabels();
      _onUpdate();
    });
  }

  // ─── Reference modal (values + polarities lookup) ─────────────

  function buildRefModal() {
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

    const overlay     = document.createElement('div');
    overlay.id        = 'values-modal';
    overlay.className = 'modal-overlay';
    overlay.hidden    = true;
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'values-modal-title');
    overlay.innerHTML = `
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
      overlay.querySelectorAll('.ref-tab-btn').forEach(b   => b.classList.toggle('active', b.dataset.tab   === idx));
      overlay.querySelectorAll('.ref-tab-panel').forEach(p => p.classList.toggle('active', p.dataset.panel === idx));
    });

    document.getElementById('btn-values-modal-close').addEventListener('click', closeRefModal);
    overlay.addEventListener('click', e => { if (e.target === overlay) closeRefModal(); });
  }

  function openRefModal() {
    document.getElementById('values-modal').hidden = false;
    document.getElementById('btn-values-modal-close').focus();
  }

  function closeRefModal() {
    document.getElementById('values-modal').hidden = true;
    document.getElementById('btn-values-ref').focus();
  }

  return { init, render, read };

})();
