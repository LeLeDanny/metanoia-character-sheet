// identity.js
// Manages the Identity section. Exposes a single global: Identity

const Identity = (() => {

  function init(onUpdate) {
    buildLineageList();

    ['input-name', 'select-realm', 'input-xp-total'].forEach(id => {
      document.getElementById(id).addEventListener('input', onUpdate);
    });

    document.getElementById('lineage-list').addEventListener('input', onUpdate);
  }

  function render(character) {
    setIfNotFocused('input-name',     character.identity.name    || '');
    setIfNotFocused('select-realm',   String(character.identity.realm   || 0));
    setIfNotFocused('input-xp-total', String(character.identity.xpTotal || 0));

    const lineageMap = {};
    (character.identity.lineages || []).forEach(l => { lineageMap[l.name] = l.level || 0; });

    Schema.LINEAGES.forEach(name => {
      const row        = document.getElementById(`lineage-row-${name}`);
      const check      = document.getElementById(`lc-${name}`);
      const levelInput = document.getElementById(`ll-${name}`);
      const dieSpan    = document.getElementById(`ld-${name}`);
      const isSelected = name in lineageMap;
      const level      = isSelected ? (lineageMap[name] || 0) : 0;

      check.checked       = isSelected;
      levelInput.disabled = !isSelected;
      row.classList.toggle('lineage-inactive', !isSelected);

      dieSpan.textContent = Schema.LINEAGE_POLARITY_DIE[level] || 'd20';
      dieSpan.classList.toggle('text-muted', !isSelected);

      if (isSelected) setIfNotFocused(`ll-${name}`, String(level));
    });

    const hasAll      = Schema.LINEAGES.every(n => n in lineageMap);
    const theridimRow = document.getElementById('lineage-row-Theridim');
    theridimRow.hidden = !hasAll;
    if (hasAll) {
      const tLevel = lineageMap['Theridim'] || 0;
      setIfNotFocused('ll-Theridim', String(tLevel));
      document.getElementById('ld-Theridim').textContent = Schema.LINEAGE_POLARITY_DIE[tLevel] || 'd20';
    }

    const spent     = Schema.calcXpSpent(character);
    const remaining = (character.identity.xpTotal || 0) - spent;

    document.getElementById('xp-spent').textContent = spent;

    const remEl = document.getElementById('xp-remaining');
    remEl.textContent = remaining;
    remEl.classList.toggle('text-danger', remaining < 0);
  }

  function read() {
    const lineages = [];

    Schema.LINEAGES.forEach(name => {
      if (document.getElementById(`lc-${name}`).checked) {
        lineages.push({
          name,
          level: parseInt(document.getElementById(`ll-${name}`).value, 10) || 0,
        });
      }
    });

    if (lineages.length === Schema.LINEAGES.length) {
      lineages.push({
        name:  'Theridim',
        level: parseInt(document.getElementById('ll-Theridim').value, 10) || 0,
      });
    }

    return {
      identity: {
        name:    document.getElementById('input-name').value.trim(),
        lineages,
        realm:   parseInt(document.getElementById('select-realm').value,   10) || 0,
        xpTotal: parseInt(document.getElementById('input-xp-total').value, 10) || 0,
      },
    };
  }

  // ─── Private helpers ─────────────────────────────────────────

  function buildLineageList() {
    const container = document.getElementById('lineage-list');

    Schema.LINEAGES.forEach(name => {
      const law = Schema.LINEAGE_POLARITIES[name];
      const row = document.createElement('tr');
      row.className        = 'lineage-row lineage-inactive';
      row.id               = `lineage-row-${name}`;
      row.dataset.lineage  = name;
      row.innerHTML = `
        <td><input type="checkbox" id="lc-${name}" class="lineage-check"></td>
        <td><label for="lc-${name}" class="lineage-name">${name}</label></td>
        <td class="lineage-law">${law}</td>
        <td><input type="number" id="ll-${name}" class="lineage-level"
                   min="0" max="5" value="0" disabled aria-label="${name} polarity level"></td>
        <td><span id="ld-${name}" class="lineage-die text-muted">d20</span></td>
      `;
      container.appendChild(row);
    });

    // Theridim — hidden until all 7 base lineages are selected
    const theridim = document.createElement('tr');
    theridim.className       = 'lineage-row lineage-theridim';
    theridim.id              = 'lineage-row-Theridim';
    theridim.dataset.lineage = 'Theridim';
    theridim.hidden          = true;
    theridim.innerHTML = `
      <td><span class="lineage-theridim-icon">✦</span></td>
      <td><span class="lineage-name">Theridim</span></td>
      <td class="lineage-law">${Schema.LINEAGE_POLARITIES['Theridim']}</td>
      <td><input type="number" id="ll-Theridim" class="lineage-level"
                 min="0" max="5" value="0" aria-label="Theridim polarity level"></td>
      <td><span id="ld-Theridim" class="lineage-die">d20</span></td>
    `;
    container.appendChild(theridim);
  }

  function setIfNotFocused(id, value) {
    const el = document.getElementById(id);
    if (el && document.activeElement !== el) el.value = value;
  }

  return { init, render, read };
})();
