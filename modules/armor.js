// armor.js
// Manages the Armor & Hit Locations section. Exposes a single global: Armor
// Relies on globals: Schema (loaded before this module in index.html)

const Armor = (() => {

  let _onUpdate = null;

  const LOCATION_DIE = {
    head:   '1',
    arms:   '2–3',
    legs:   '4–5',
    center: '6–8',
  };

  const AS_OPTIONS = Array.from({ length: 11 }, (_, i) =>
    `<option value="${i}">${i}</option>`
  ).join('');

  // ─── Public API ───────────────────────────────────────────────

  function init(onUpdate) {
    _onUpdate = onUpdate;
    buildModal();
    buildRows();
    setupListeners();
    document.getElementById('btn-armor-ref').addEventListener('click', openModal);
  }

  function render(character) {
    Schema.HIT_LOCATIONS.forEach(loc => {
      const row = document.querySelector(`#armor-body tr[data-location="${loc}"]`);
      if (!row) return;

      const data     = (character.armor || {})[loc] || { as: 0, absorbed: 0 };
      const as       = data.as || 0;
      const absorbed = Math.min(data.absorbed || 0, as);
      const broken   = as > 0 && absorbed >= as;

      const asSelect   = row.querySelector('.armor-as-select');
      const absInput   = row.querySelector('.armor-absorbed');
      const hitBtn     = row.querySelector('.armor-hit');
      const statusCell = row.querySelector('.armor-status');

      const decBtn = row.querySelector('.armor-dec');

      if (document.activeElement !== asSelect) asSelect.value = String(as);
      absInput.max      = as;
      absInput.disabled = as === 0;
      if (document.activeElement !== absInput) absInput.value = absorbed;
      decBtn.disabled   = as === 0 || absorbed <= 0;
      hitBtn.disabled   = as === 0 || absorbed >= as;

      row.classList.toggle('armor-row-broken', broken);
      statusCell.textContent = as === 0 ? '' : (broken ? 'Broken' : 'Unbroken');
      statusCell.className   = 'armor-status' + (broken ? ' armor-status-broken' : (as > 0 ? ' armor-status-ok' : ''));
    });

    renderAuraRow(character);

    const env = (character.armor || {}).environmental || {};
    document.getElementById('armor-env-hot').checked      = !!env.hot;
    document.getElementById('armor-env-cold').checked     = !!env.cold;
    document.getElementById('armor-env-decay').checked    = !!env.decay;
    document.getElementById('armor-env-electric').checked = !!env.electric;
  }

  function read() {
    const armor = {};

    Schema.HIT_LOCATIONS.forEach(loc => {
      const row = document.querySelector(`#armor-body tr[data-location="${loc}"]`);
      if (!row) return;
      armor[loc] = {
        as:       parseInt(row.querySelector('.armor-as-select').value, 10) || 0,
        absorbed: parseInt(row.querySelector('.armor-absorbed').value,  10) || 0,
      };
    });

    const auraInput = document.getElementById('armor-aura-absorbed');
    armor.aura = { absorbed: auraInput ? (parseInt(auraInput.value, 10) || 0) : 0 };

    armor.environmental = {
      hot:      document.getElementById('armor-env-hot').checked,
      cold:     document.getElementById('armor-env-cold').checked,
      decay:    document.getElementById('armor-env-decay').checked,
      electric: document.getElementById('armor-env-electric').checked,
    };

    return { armor };
  }

  // ─── Aura row ─────────────────────────────────────────────────

  function getAuraAS(character) {
    return (character.passiveAbilities || [])
      .filter(p => p.name === 'Armored Aura')
      .reduce((sum, p) => sum + (p.level || 0), 0);
  }

  function renderAuraRow(character) {
    const row = document.getElementById('armor-row-aura');
    if (!row) return;

    const as       = getAuraAS(character);
    const data     = (character.armor || {}).aura || { absorbed: 0 };
    const absorbed = Math.min(data.absorbed || 0, as);
    const broken   = as > 0 && absorbed >= as;

    row.hidden = as === 0;
    if (as === 0) return;

    const asCell     = document.getElementById('armor-aura-as');
    const absInput   = document.getElementById('armor-aura-absorbed');
    const hitBtn     = document.getElementById('armor-aura-hit');
    const statusCell = document.getElementById('armor-aura-status');

    const decBtn = document.getElementById('armor-aura-dec');

    asCell.textContent = as;
    absInput.max       = as;
    absInput.disabled  = false;
    if (document.activeElement !== absInput) absInput.value = absorbed;
    decBtn.disabled    = absorbed <= 0;
    hitBtn.disabled    = absorbed >= as;

    row.classList.toggle('armor-row-broken', broken);
    statusCell.textContent = broken ? 'Broken' : 'Unbroken';
    statusCell.className   = 'armor-status' + (broken ? ' armor-status-broken' : ' armor-status-ok');
  }

  // ─── Build ────────────────────────────────────────────────────

  function buildRows() {
    const tbody = document.getElementById('armor-body');

    Schema.HIT_LOCATIONS.forEach(loc => {
      const label = loc.charAt(0).toUpperCase() + loc.slice(1);
      const die   = LOCATION_DIE[loc] || '';
      const tr    = document.createElement('tr');
      tr.dataset.location = loc;
      tr.innerHTML = `
        <td class="armor-loc">
          ${label}<span class="armor-loc-die">${die}</span>
        </td>
        <td class="armor-as-cell">
          <select class="armor-as-select">${AS_OPTIONS}</select>
        </td>
        <td><button class="btn btn-sm armor-dec" type="button" disabled>-1</button></td>
        <td class="armor-absorbed-cell">
          <input type="number" class="armor-absorbed" min="0" max="0" value="0" disabled>
        </td>
        <td><button class="btn btn-sm armor-hit" type="button" disabled>+1</button></td>
        <td class="armor-status"></td>
      `;
      tbody.appendChild(tr);
    });

    // Aura row — hidden until character has Armored Aura passive
    const auraRow = document.createElement('tr');
    auraRow.id     = 'armor-row-aura';
    auraRow.hidden = true;
    auraRow.innerHTML = `
      <td class="armor-loc armor-loc-aura">Aura<span class="armor-aura-label"> — Armored Aura</span></td>
      <td class="armor-as-cell"><span id="armor-aura-as" class="armor-aura-as-display">—</span></td>
      <td><button class="btn btn-sm armor-dec" id="armor-aura-dec" type="button" disabled>-1</button></td>
      <td class="armor-absorbed-cell">
        <input type="number" class="armor-absorbed" id="armor-aura-absorbed"
               min="0" max="0" value="0" disabled>
      </td>
      <td><button class="btn btn-sm armor-hit" id="armor-aura-hit" type="button" disabled>+1</button></td>
      <td class="armor-status" id="armor-aura-status"></td>
    `;
    tbody.appendChild(auraRow);
  }

  // ─── Listeners ────────────────────────────────────────────────

  function setupListeners() {
    const tbody = document.getElementById('armor-body');

    tbody.addEventListener('input', _onUpdate);

    ['armor-env-hot', 'armor-env-cold', 'armor-env-decay', 'armor-env-electric'].forEach(id => {
      document.getElementById(id).addEventListener('change', _onUpdate);
    });

    tbody.addEventListener('click', e => {
      const incBtn = e.target.closest('.armor-hit');
      const decBtn = e.target.closest('.armor-dec');
      const btn    = incBtn || decBtn;
      if (!btn || btn.disabled) return;

      const row      = btn.closest('tr');
      const isAura   = row.id === 'armor-row-aura';
      const as       = isAura
        ? parseInt(document.getElementById('armor-aura-as').textContent, 10) || 0
        : parseInt(row.querySelector('.armor-as-select').value, 10) || 0;
      const absInput = row.querySelector('.armor-absorbed');
      const current  = parseInt(absInput.value, 10) || 0;

      if (incBtn && current < as) { absInput.value = current + 1; _onUpdate(); }
      if (decBtn && current > 0)  { absInput.value = current - 1; _onUpdate(); }
    });
  }

  // ─── Modal ────────────────────────────────────────────────────

  function buildModal() {
    const matRows = Object.entries(Schema.ARMOR_MATERIALS).map(([, mat]) =>
      `<tr><td>${mat.label}</td><td>${mat.as}</td></tr>`
    ).join('');

    const overlay     = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id        = 'armor-modal';
    overlay.hidden    = true;
    overlay.innerHTML = `
      <div class="modal" role="dialog" aria-labelledby="armor-modal-title">
        <div class="modal-header">
          <h3 id="armor-modal-title">Armor Reference</h3>
          <button class="btn-icon" id="btn-armor-modal-close" aria-label="Close">×</button>
        </div>
        <div class="modal-body">
          <div class="cols-2">
            <div>
              <p class="ref-section-title">Hit Locations (Base d8)</p>
              <table class="armor-ref-table">
                <thead><tr><th>d8</th><th>Location</th></tr></thead>
                <tbody>
                  <tr><td>1</td><td>Head</td></tr>
                  <tr><td>2–3</td><td>Arms</td></tr>
                  <tr><td>4–5</td><td>Legs</td></tr>
                  <tr><td>6–8</td><td>Center</td></tr>
                </tbody>
              </table>
              <p class="modal-note mt-sm">Center is the most common hit location (3 of 8 results). A Targeted Hit boon lets you choose the location instead.</p>
            </div>
            <div>
              <p class="ref-section-title">AS by Material</p>
              <table class="armor-ref-table">
                <thead><tr><th>Material</th><th>AS</th></tr></thead>
                <tbody>${matRows}</tbody>
              </table>
              <p class="modal-note mt-sm">Armor breaks when Absorbed equals AS. Broken armor provides no protection until repaired.</p>
            </div>
          </div>
          <hr class="mt-md">
          <p class="ref-section-title mt-md">Natural Armor — Armored Aura</p>
          <p class="modal-note mt-sm">The Armored Aura passive gives natural armor with AS equal to XP invested. It applies to any hit regardless of location and regenerates up to 2 points per sleep. The Aura row appears automatically once you have the passive.</p>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.addEventListener('click', e => {
      if (e.target === overlay || e.target.id === 'btn-armor-modal-close') closeModal();
    });
  }

  function openModal()  { document.getElementById('armor-modal').hidden = false; }
  function closeModal() { document.getElementById('armor-modal').hidden = true;  }

  return { init, render, read };
})();
