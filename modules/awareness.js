// awareness.js
// Manages the Awareness section. Exposes a single global: Awareness
// Relies on globals: Schema (loaded before this module in index.html)

const Awareness = (() => {

  // ─── Public API ───────────────────────────────────────────────

  function init(onUpdate) {
    buildModal();
    document.getElementById('select-awareness-xp').addEventListener('change', onUpdate);
    document.getElementById('select-awareness-state').addEventListener('change', onUpdate);
    document.getElementById('btn-awareness-ref').addEventListener('click', openModal);
  }

  function render(character) {
    const aw           = character.awareness || {};
    const xp           = aw.xpInvested || 0;
    const state        = aw.state || 'suppressed';
    const hasAwareness = ((character.identity || {}).realm || 0) > 0;

    const xpSelect    = document.getElementById('select-awareness-xp');
    const stateSelect = document.getElementById('select-awareness-state');

    xpSelect.disabled    = !hasAwareness;
    stateSelect.disabled = !hasAwareness;

    xpSelect.value    = String(xp);
    stateSelect.value = state;
    document.getElementById('awareness-range').textContent = hasAwareness
      ? Schema.calcAwarenessRange(xp)
      : '—';
  }

  function read() {
    return {
      awareness: {
        xpInvested: parseInt(document.getElementById('select-awareness-xp').value, 10) || 0,
        state:      document.getElementById('select-awareness-state').value,
      },
    };
  }

  // ─── Modal ────────────────────────────────────────────────────

  function buildModal() {
    const overlay     = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id        = 'awareness-modal';
    overlay.hidden    = true;
    overlay.innerHTML = `
      <div class="modal" role="dialog" aria-labelledby="awareness-modal-title">
        <div class="modal-header">
          <h3 id="awareness-modal-title">Awareness States</h3>
          <button class="btn-icon" id="btn-awareness-modal-close" aria-label="Close">×</button>
        </div>
        <div class="modal-body">
          <p class="modal-note">
            Range (3 + XP invested) is in Range Bands. It applies as the radius for Extended
            and the targeting distance for Focused.
          </p>
          <table class="awareness-ref-table">
            <thead>
              <tr><th>State</th><th>What It Does</th></tr>
            </thead>
            <tbody>
              <tr>
                <td>Cloaked</td>
                <td>You appear to have no Ren. Casting costs +1 Strain. Others cannot identify
                    you as Rennim without extraordinary means. Range does not apply.</td>
              </tr>
              <tr>
                <td>Suppressed</td>
                <td>Ren held inward. The default polite state. Extended detection reveals your
                    Realm and texture; Focused detection reveals your polarities.
                    Range does not apply.</td>
              </tr>
              <tr>
                <td>Extended</td>
                <td>Radial outward sense within your range radius. Detects Ren density, Realm,
                    and texture in the surrounding area. Loose directional sense only. Others
                    who are Extended or Focused will notice you scanning.</td>
              </tr>
              <tr>
                <td>Focused</td>
                <td>Concentrated on one specific target within range. Reveals their Realm,
                    texture, and polarities. Deeply invasive — using Focused outside of combat
                    is likely to start a fight.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.addEventListener('click', e => {
      if (e.target === overlay || e.target.id === 'btn-awareness-modal-close') closeModal();
    });
  }

  function openModal()  { document.getElementById('awareness-modal').hidden = false; }
  function closeModal() { document.getElementById('awareness-modal').hidden = true;  }

  // ─── Private helpers ──────────────────────────────────────────

  function setIfNotFocused(id, value) {
    const el = document.getElementById(id);
    if (el && document.activeElement !== el) el.value = value;
  }

  return { init, render, read };
})();
