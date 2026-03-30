// conditions.js
// Manages the Conditions section. Exposes a single global: Conditions
// Relies on globals: Schema (loaded before this module in index.html)

const Conditions = (() => {

  let _onUpdate = null;

  // ─── Public API ───────────────────────────────────────────────

  function init(onUpdate) {
    _onUpdate = onUpdate;
    document.getElementById('check-wounded').addEventListener('change', onUpdate);
    document.getElementById('btn-add-condition').addEventListener('click', addCondition);
    var list = document.getElementById('conditions-list');
    list.addEventListener('click', handleListClick);
    list.addEventListener('input', handleListInput);
    list.addEventListener('change', handleListChange);
  }

  function render(character) {
    reconcile(character.conditions || []);
    document.getElementById('check-wounded').checked = !!character.wounded;
  }

  function read() {
    var conditions = [];
    document.querySelectorAll('#conditions-list .condition-card').forEach(function(card) {
      conditions.push({
        id:     card.dataset.id,
        type:   card.querySelector('.condition-type').value,
        detail: card.querySelector('.condition-detail').value.trim(),
        rating: parseInt(card.dataset.rating, 10) || 0,
      });
    });
    return {
      wounded:    document.getElementById('check-wounded').checked,
      conditions: conditions,
    };
  }

  // ─── Reconcile ────────────────────────────────────────────────

  function reconcile(conditions) {
    var list = document.getElementById('conditions-list');
    var existing = {};
    list.querySelectorAll('.condition-card').forEach(function(card) {
      existing[card.dataset.id] = card;
    });
    var targetIds = new Set(conditions.map(function(c) { return c.id; }));
    Object.keys(existing).forEach(function(id) {
      if (!targetIds.has(id)) existing[id].remove();
    });
    conditions.forEach(function(c, i) {
      var card = existing[c.id];
      if (!card) card = buildCard(c.id);
      updateCard(card, c);
      if (list.children[i] !== card) list.insertBefore(card, list.children[i] || null);
    });
  }

  function buildCard(id) {
    var opts = Object.entries(Schema.CONDITIONS).map(function(entry) {
      return '<option value="' + entry[0] + '">' + entry[1].label + '</option>';
    }).join('');
    var card = document.createElement('div');
    card.className = 'condition-card item-card';
    card.dataset.id = id;
    card.innerHTML =
      '<div class="condition-row">' +
        '<select class="condition-type">' + opts + '</select>' +
        '<input type="text" class="condition-detail">' +
        '<div class="condition-rating-ctrl">' +
          '<button class="btn btn-sm condition-dec" type="button">\u2212</button>' +
          '<span class="condition-rating">1</span>' +
          '<button class="btn btn-sm condition-inc" type="button">+</button>' +
        '</div>' +
        '<button class="btn-icon condition-delete" type="button" aria-label="Remove">\u00d7</button>' +
      '</div>' +
      '<div class="condition-hint" hidden></div>' +
      '<div class="condition-healed-bar" hidden>' +
        'Healed \u2014 <button class="btn btn-sm btn-accent condition-remove" type="button">Remove</button>' +
      '</div>';
    return card;
  }

  function updateCard(card, data) {
    // Backward compat: old saves use `name` instead of `type`/`detail`
    var type   = data.type   || 'custom';
    var detail = data.detail !== undefined ? data.detail : (data.name || '');
    var rating = data.rating || 0;
    var condDef = Schema.CONDITIONS[type] || Schema.CONDITIONS.custom;

    var typeSelect  = card.querySelector('.condition-type');
    var detailInput = card.querySelector('.condition-detail');
    var ratingSpan  = card.querySelector('.condition-rating');
    var hintEl      = card.querySelector('.condition-hint');
    var healedBar   = card.querySelector('.condition-healed-bar');
    var decBtn      = card.querySelector('.condition-dec');
    var row         = card.querySelector('.condition-row');

    if (document.activeElement !== typeSelect) typeSelect.value = type;

    var showDetail = !!condDef.hasDetail;
    detailInput.hidden = !showDetail;
    row.classList.toggle('condition-row-no-detail', !showDetail);
    if (showDetail) {
      detailInput.placeholder = condDef.detailPlaceholder || '';
      if (document.activeElement !== detailInput) detailInput.value = detail;
    }

    card.dataset.rating = String(rating);
    ratingSpan.textContent = rating;
    ratingSpan.classList.toggle('condition-rating-zero', rating === 0);
    decBtn.disabled = rating === 0;
    healedBar.hidden = rating > 0;

    var hint = getHint(type, rating);
    hintEl.textContent = hint;
    hintEl.hidden = !hint;
  }

  function getHint(type, rating) {
    if (rating === 0) return '';
    switch (type) {
      case 'weakened':
        if (rating >= 6) return 'Enemy die +' + rating + ' steps \u00b7 complication';
        return 'Enemy die +' + rating + ' step' + (rating === 1 ? '' : 's');
      case 'maimed':
        return rating + ' abilit' + (rating === 1 ? 'y' : 'ies') + ' disabled';
      case 'escalating':
        return rating + ' strain per round';
      case 'sensoryDeprivation':
        return rating + ' sense' + (rating === 1 ? '' : 's') + ' blocked';
      case 'slowed':
        return 'Stride \u2212' + rating;
      default:
        return '';
    }
  }

  // ─── Handlers ─────────────────────────────────────────────────

  function addCondition() {
    var list = document.getElementById('conditions-list');
    var card = buildCard(Schema.newId());
    updateCard(card, { type: 'custom', detail: '', rating: 1 });
    list.appendChild(card);
    card.querySelector('.condition-detail').focus();
    _onUpdate();
  }

  function handleListInput(e) {
    if (e.target.matches('.condition-detail')) _onUpdate();
  }

  function handleListChange(e) {
    if (e.target.matches('.condition-type')) {
      var card    = e.target.closest('.condition-card');
      var type    = e.target.value;
      var condDef = Schema.CONDITIONS[type] || Schema.CONDITIONS.custom;
      var detailInput = card.querySelector('.condition-detail');
      var row     = card.querySelector('.condition-row');
      var showDetail = !!condDef.hasDetail;
      detailInput.hidden = !showDetail;
      row.classList.toggle('condition-row-no-detail', !showDetail);
      detailInput.placeholder = condDef.detailPlaceholder || '';
      detailInput.value = '';
      var rating = parseInt(card.dataset.rating, 10) || 1;
      var hint   = getHint(type, rating);
      var hintEl = card.querySelector('.condition-hint');
      hintEl.textContent = hint;
      hintEl.hidden = !hint;
      _onUpdate();
    }
  }

  function handleListClick(e) {
    var card = e.target.closest('.condition-card');
    if (!card) return;

    if (e.target.closest('.condition-inc')) {
      setRating(card, (parseInt(card.dataset.rating, 10) || 0) + 1);
      _onUpdate();
      return;
    }
    if (e.target.closest('.condition-dec')) {
      var r = parseInt(card.dataset.rating, 10) || 0;
      if (r > 0) { setRating(card, r - 1); _onUpdate(); }
      return;
    }
    if (e.target.closest('.condition-remove') || e.target.closest('.condition-delete')) {
      card.remove();
      _onUpdate();
    }
  }

  function setRating(card, rating) {
    card.dataset.rating = String(rating);
    var ratingSpan = card.querySelector('.condition-rating');
    ratingSpan.textContent = rating;
    ratingSpan.classList.toggle('condition-rating-zero', rating === 0);
    card.querySelector('.condition-healed-bar').hidden = rating > 0;
    card.querySelector('.condition-dec').disabled = rating === 0;
    var type  = card.querySelector('.condition-type').value;
    var hint  = getHint(type, rating);
    var hintEl = card.querySelector('.condition-hint');
    hintEl.textContent = hint;
    hintEl.hidden = !hint;
  }

  return { init, render, read };
})();
