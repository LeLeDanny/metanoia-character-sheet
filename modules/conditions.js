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
    document.getElementById('conditions-list').addEventListener('click', handleListClick);
    document.getElementById('conditions-list').addEventListener('input', onUpdate);
  }

  function render(character) {
    reconcile(character.conditions || []);

    document.getElementById('check-wounded').checked = !!character.wounded;
  }

  function read() {
    const conditions = [];
    document.querySelectorAll('#conditions-list .condition-card').forEach(card => {
      conditions.push({
        id:     card.dataset.id,
        name:   card.querySelector('.condition-name').value.trim(),
        rating: parseInt(card.dataset.rating, 10) || 0,
      });
    });
    return {
      wounded:    document.getElementById('check-wounded').checked,
      conditions,
    };
  }

  // ─── Reconcile ────────────────────────────────────────────────

  function reconcile(conditions) {
    const list = document.getElementById('conditions-list');

    const existing = {};
    list.querySelectorAll('.condition-card').forEach(card => {
      existing[card.dataset.id] = card;
    });

    const targetIds = new Set(conditions.map(c => c.id));

    Object.keys(existing).forEach(id => {
      if (!targetIds.has(id)) existing[id].remove();
    });

    conditions.forEach((c, i) => {
      let card = existing[c.id];
      if (!card) card = buildCard(c.id);
      updateCard(card, c);
      if (list.children[i] !== card) list.insertBefore(card, list.children[i] || null);
    });
  }

  function buildCard(id) {
    const card      = document.createElement('div');
    card.className  = 'condition-card item-card';
    card.dataset.id = id;
    card.innerHTML  = `
      <div class="condition-row">
        <input type="text" class="condition-name" placeholder="Describe the wound or condition">
        <div class="condition-rating-ctrl">
          <button class="btn btn-sm condition-dec" type="button">−</button>
          <span class="condition-rating">1</span>
          <button class="btn btn-sm condition-inc" type="button">+</button>
        </div>
        <button class="btn-icon condition-delete" type="button" aria-label="Remove">×</button>
      </div>
      <div class="condition-healed-bar" hidden>
        Healed — <button class="btn btn-sm btn-accent condition-remove" type="button">Remove</button>
      </div>
    `;
    return card;
  }

  function updateCard(card, data) {
    const nameInput  = card.querySelector('.condition-name');
    const ratingSpan = card.querySelector('.condition-rating');
    const healedBar  = card.querySelector('.condition-healed-bar');
    const decBtn     = card.querySelector('.condition-dec');

    if (document.activeElement !== nameInput) nameInput.value = data.name || '';

    card.dataset.rating = String(data.rating);
    ratingSpan.textContent = data.rating;
    ratingSpan.classList.toggle('condition-rating-zero', data.rating === 0);
    healedBar.hidden = data.rating > 0;
    decBtn.disabled  = data.rating === 0;
  }

  // ─── Handlers ─────────────────────────────────────────────────

  function addCondition() {
    const list = document.getElementById('conditions-list');
    const card = buildCard(Schema.newId());
    updateCard(card, { name: '', rating: 1 });
    list.appendChild(card);
    card.querySelector('.condition-name').focus();
    _onUpdate();
  }

  function handleListClick(e) {
    const card = e.target.closest('.condition-card');
    if (!card) return;

    if (e.target.closest('.condition-inc')) {
      setRating(card, (parseInt(card.dataset.rating, 10) || 0) + 1);
      _onUpdate();
      return;
    }

    if (e.target.closest('.condition-dec')) {
      const r = parseInt(card.dataset.rating, 10) || 0;
      if (r > 0) { setRating(card, r - 1); _onUpdate(); }
      return;
    }

    if (e.target.closest('.condition-remove') || e.target.closest('.condition-delete')) {
      card.remove();
      _onUpdate();
    }
  }

  function setRating(card, rating) {
    const ratingSpan = card.querySelector('.condition-rating');
    const healedBar  = card.querySelector('.condition-healed-bar');
    const decBtn     = card.querySelector('.condition-dec');

    card.dataset.rating = String(rating);
    ratingSpan.textContent = rating;
    ratingSpan.classList.toggle('condition-rating-zero', rating === 0);
    healedBar.hidden = rating > 0;
    decBtn.disabled  = rating === 0;
  }

  return { init, render, read };
})();
