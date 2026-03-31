// stride.js
// Manages the Stride & Carry Weight section. Exposes a single global: Stride
// Relies on globals: Schema (loaded before this module in index.html)

const Stride = (() => {

  // ─── Public API ───────────────────────────────────────────────

  function init(onUpdate) {
    buildModal();
    document.getElementById('select-stride-xp').addEventListener('change', onUpdate);
    document.getElementById('select-carry-weight-xp').addEventListener('change', onUpdate);
    document.getElementById('btn-stride-ref').addEventListener('click', openModal);
  }

  function render(character) {
    const strideXp = (character.stride || {}).xpInvested || 0;
    document.getElementById('select-stride-xp').value = String(strideXp);
    document.getElementById('stride-value').textContent = Schema.calcStride(strideXp);

    const cwXp = (character.carryWeight || {}).xpInvested || 0;
    document.getElementById('select-carry-weight-xp').value = String(cwXp);
    document.getElementById('carry-weight-value').textContent = Schema.calcCarryWeight(cwXp);
  }

  function read() {
    const strideXp = parseInt(document.getElementById('select-stride-xp').value, 10) || 0;
    const cwXp     = parseInt(document.getElementById('select-carry-weight-xp').value, 10) || 0;

    // Update derived displays on read so they stay in sync
    document.getElementById('stride-value').textContent = Schema.calcStride(strideXp);
    document.getElementById('carry-weight-value').textContent = Schema.calcCarryWeight(cwXp);

    return {
      stride:      { xpInvested: strideXp },
      carryWeight: { xpInvested: cwXp },
    };
  }

  // ─── Modal ────────────────────────────────────────────────────

  function buildModal() {
    const overlay     = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id        = 'stride-modal';
    overlay.hidden    = true;
    overlay.innerHTML = `
      <div class="modal" role="dialog" aria-labelledby="stride-modal-title">
        <div class="modal-header">
          <h3 id="stride-modal-title">Stride and Carry Weight</h3>
          <button class="btn-icon" id="btn-stride-modal-close" aria-label="Close">×</button>
        </div>
        <div class="modal-body">
          <div class="stride-modal-stats">
            <div class="stride-modal-stat">
              <span class="stride-modal-stat-name">Stride</span>
              <span class="stride-modal-stat-desc">How far you can move in one turn. You can also spend your resolution to gain +1 Range Band of movement instead of taking an action.</span>
            </div>
            <div class="stride-modal-stat">
              <span class="stride-modal-stat-name">Carry Weight</span>
              <span class="stride-modal-stat-desc">The number of inventory slots you contribute to the party pool. The party draws from the combined total when determining what they can carry.</span>
            </div>
          </div>
          <table class="stride-ref-table">
            <thead>
              <tr><th>Band</th><th>Name</th><th>Distance</th></tr>
            </thead>
            <tbody>
              <tr><td>1</td><td>Immediate</td><td>0–1m</td></tr>
              <tr><td>2</td><td>Melee</td><td>1–2m</td></tr>
              <tr><td>3</td><td>Close</td><td>2–5m</td></tr>
              <tr><td>4</td><td>Nearby</td><td>5–10m</td></tr>
              <tr><td>5</td><td>Around</td><td>10–30m</td></tr>
              <tr><td>6</td><td>Far</td><td>30–100m</td></tr>
              <tr><td>7</td><td>Distant</td><td>100–1,000m</td></tr>
              <tr><td>8</td><td>Extreme</td><td>1,000m+</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.addEventListener('click', e => {
      if (e.target === overlay || e.target.id === 'btn-stride-modal-close') closeModal();
    });
  }

  function openModal()  { document.getElementById('stride-modal').hidden = false; }
  function closeModal() { document.getElementById('stride-modal').hidden = true;  }

  return { init, render, read };
})();
