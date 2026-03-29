// stride.js
// Manages the Stride section. Exposes a single global: Stride
// Relies on globals: Schema (loaded before this module in index.html)

const Stride = (() => {

  // ─── Public API ───────────────────────────────────────────────

  function init(onUpdate) {
    buildModal();
    document.getElementById('input-stride-xp').addEventListener('input', onUpdate);
    document.getElementById('btn-stride-ref').addEventListener('click', openModal);
  }

  function render(character) {
    const xp = (character.stride || {}).xpInvested || 0;
    setIfNotFocused('input-stride-xp', String(xp));
    document.getElementById('stride-value').textContent = Schema.calcStride(xp);
  }

  function read() {
    return {
      stride: {
        xpInvested: parseInt(document.getElementById('input-stride-xp').value, 10) || 0,
      },
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
          <h3 id="stride-modal-title">Range Bands</h3>
          <button class="btn-icon" id="btn-stride-modal-close" aria-label="Close">×</button>
        </div>
        <div class="modal-body">
          <p class="modal-note">
            Stride is how far you can move in one turn. You can also spend your resolution
            to gain +1 additional Range Band of movement instead of taking an action.
          </p>
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

  // ─── Private helpers ──────────────────────────────────────────

  function setIfNotFocused(id, value) {
    const el = document.getElementById(id);
    if (el && document.activeElement !== el) el.value = value;
  }

  return { init, render, read };
})();
