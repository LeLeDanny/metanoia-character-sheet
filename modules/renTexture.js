// renTexture.js
// Manages the Ren Texture section.
// Exposes global: RenTexture

const RenTexture = (() => {

  let _onUpdate = null;

  // ─── Render ────────────────────────────────────────────────

  function render(character) {
    const texture = character.renTexture || 'Tranquil';
    document.getElementById('select-ren-texture').value = texture;
    _updateTriggerDisplay(texture);
  }

  // ─── Read ──────────────────────────────────────────────────

  function read() {
    return {
      renTexture: document.getElementById('select-ren-texture').value,
    };
  }

  // ─── Init ──────────────────────────────────────────────────

  function init(onUpdate) {
    _onUpdate = onUpdate;

    document.getElementById('select-ren-texture').addEventListener('change', function() {
      _updateTriggerDisplay(this.value);
      _onUpdate();
    });

    document.getElementById('btn-ren-texture-ref').addEventListener('click', function() {
      document.getElementById('ren-texture-modal').hidden = false;
    });

    document.getElementById('btn-ren-texture-modal-close').addEventListener('click', function() {
      document.getElementById('ren-texture-modal').hidden = true;
    });

    document.getElementById('ren-texture-modal').addEventListener('click', function(e) {
      if (e.target === this) this.hidden = true;
    });
  }

  // ─── Internal ──────────────────────────────────────────────

  function _updateTriggerDisplay(texture) {
    var info = Schema.REN_TEXTURES[texture];
    if (!info) return;
    document.getElementById('ren-texture-boons').textContent        = info.boons;
    document.getElementById('ren-texture-complications').textContent = info.complications;
  }

  // ─── Public API ────────────────────────────────────────────

  return { render, read, init };

})();
