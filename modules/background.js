// background.js
// Manages the Background / Backstory modal. Exposes a single global: Background

const Background = (() => {

  let _onUpdate = null;

  const FIELDS = [
    { id: 'bg-first-ren-moment',    key: 'firstRenMoment',            label: 'What caused you to first feel Ren?', rows: 2 },
    { id: 'bg-territory',          key: 'territoryRaisedIn',          label: 'Territory Raised In',                rows: 1 },
    { id: 'bg-environment',        key: 'environmentRaisedIn',        label: 'Environment Raised In',              rows: 1 },
    { id: 'bg-upbringing',         key: 'upbringing',                 label: 'Upbringing',                         rows: 2 },
    { id: 'bg-caretaker',          key: 'primaryCaretakerBackground', label: "Primary Caretaker's Background",     rows: 2 },
    { id: 'bg-why-ren',            key: 'whyLearnedRen',              label: 'Why you learned Ren',               rows: 2 },
    { id: 'bg-how-ren',            key: 'howLearnedRen',              label: 'How you learned Ren',               rows: 2 },
    { id: 'bg-adventures',         key: 'adventures',                 label: 'Adventures',                         rows: 4 },
    { id: 'bg-fears',              key: 'fears',                      label: 'Fears',                              rows: 4 },
    { id: 'bg-goals',              key: 'goals',                      label: 'Goals',                              rows: 4 },
    { id: 'bg-backstory',          key: 'backstory',                  label: 'Backstory',                          rows: 6 },
  ];

  // ─── Public API ───────────────────────────────────────────────

  function init(onUpdate) {
    _onUpdate = onUpdate;
    document.getElementById('bg-fields').addEventListener('input', function() {
      _onUpdate();
    });
  }

  function render(character) {
    var bg = character.background || {};
    FIELDS.forEach(function(f) {
      var el = document.getElementById(f.id);
      if (el && document.activeElement !== el) el.value = bg[f.key] || '';
    });
  }

  function read() {
    var bg = {};
    FIELDS.forEach(function(f) {
      var el = document.getElementById(f.id);
      bg[f.key] = el ? el.value : '';
    });
    return { background: bg };
  }

  return { init, render, read };
})();
