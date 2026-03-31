// notes.js
// Manages the Notes modal. Exposes a single global: Notes

const Notes = (() => {

  let _onUpdate = null;

  // ─── Public API ───────────────────────────────────────────────

  function init(onUpdate) {
    _onUpdate = onUpdate;
    document.getElementById('notes-textarea').addEventListener('input', function() {
      _onUpdate();
    });
  }

  function render(character) {
    var el = document.getElementById('notes-textarea');
    if (el && document.activeElement !== el) el.value = character.notes || '';
  }

  function read() {
    var el = document.getElementById('notes-textarea');
    return { notes: el ? el.value : '' };
  }

  return { init, render, read };
})();
