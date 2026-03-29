// strain.js
// Manages the Strain section. Exposes a single global: Strain
// Relies on globals: Schema (loaded before this module in index.html)

const Strain = (() => {

  // ─── Public API ───────────────────────────────────────────────

  function init(onUpdate) {
    document.getElementById('select-strain-xp').addEventListener('change', onUpdate);
    document.getElementById('input-strain-current').addEventListener('input', onUpdate);

    document.getElementById('btn-strain-minus').addEventListener('click', () => {
      const input = document.getElementById('input-strain-current');
      const val   = parseInt(input.value, 10) || 0;
      if (val > 0) {
        input.value = val - 1;
        onUpdate();
      }
    });

    document.getElementById('btn-strain-plus').addEventListener('click', () => {
      const input = document.getElementById('input-strain-current');
      const max   = parseInt(document.getElementById('strain-max').textContent, 10) || 0;
      const val   = parseInt(input.value, 10) || 0;
      if (val < max) {
        input.value = val + 1;
        onUpdate();
      }
    });
  }

  function render(character) {
    const realm   = (character.identity || {}).realm || 0;
    const xp      = (character.strain   || {}).xpInvested || 0;
    const max     = Schema.calcStrainMax(realm, xp);
    const raw     = (character.strain   || {}).current;
    const current = Math.min(Math.max(raw != null ? raw : 0, 0), max);

    setIfNotFocused('select-strain-xp',     String(xp));
    setIfNotFocused('input-strain-current',  String(current));

    document.getElementById('input-strain-current').max = max;
    document.getElementById('strain-max').textContent         = String(max);
    document.getElementById('strain-max-derived').textContent = String(max);

    const atMax   = current >= max;
    const wounded = !!character.wounded;
    document.getElementById('strain-unconscious-warning').hidden = !(atMax && !wounded);
    document.getElementById('strain-dying-warning').hidden       = !(atMax && wounded);
  }

  function read() {
    const xp = parseInt(document.getElementById('select-strain-xp').value, 10) || 0;
    return {
      strain: {
        xpInvested: xp,
        current:    parseInt(document.getElementById('input-strain-current').value, 10) || 0,
      },
    };
  }

  // ─── Private helpers ──────────────────────────────────────────

  function setIfNotFocused(id, value) {
    const el = document.getElementById(id);
    if (el && document.activeElement !== el) el.value = value;
  }

  return { init, render, read };
})();
