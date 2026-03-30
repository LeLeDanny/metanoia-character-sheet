// activeAbilities.js
// Manages the Active Abilities section. Exposes a single global: ActiveAbilities
// Relies on globals: Schema (loaded before this module in index.html)

const ActiveAbilities = (() => {

  let _onUpdate = null;
  let _onStrainSpend = null;
  let _lastCharacter = null;
  let _editingCard = null;

  // ─── Public API ───────────────────────────────────────────────

  function init(onUpdate, onStrainSpend) {
    _onUpdate = onUpdate;
    _onStrainSpend = onStrainSpend || null;
    buildModal();
    document.getElementById('btn-add-ability').addEventListener('click', addAbility);
    document.getElementById('abilities-list').addEventListener('click', handleListClick);
  }

  function render(character) {
    _lastCharacter = character;
    reconcile(character.activeAbilities || [], character);
    var count = document.querySelectorAll('#abilities-list .ability-card').length;
    var counter = document.getElementById('ability-counter');
    counter.textContent = count + ' / ' + Schema.MAX_ACTIVE_ABILITIES;
    counter.classList.toggle('text-danger', count > Schema.MAX_ACTIVE_ABILITIES);
    if (_editingCard) {
      populatePolaritySelect(character);
      updateModalStrain(character);
    }
  }

  function read() {
    var abilities = [];
    document.querySelectorAll('#abilities-list .ability-card').forEach(function(card) {
      try { abilities.push(JSON.parse(card.dataset.abilityData)); }
      catch (e) { /* skip malformed */ }
    });
    return { activeAbilities: abilities };
  }

  // ─── Modal construction ───────────────────────────────────────

  function buildModal() {
    var intentChecks = Object.entries(Schema.INTENTS).map(function(entry) {
      var key = entry[0], def = entry[1];
      var hiddenAttr = key === 'castX' ? ' hidden' : '';
      return '<label class="ability-intent-label"' + hiddenAttr + '>' +
        '<input type="checkbox" class="modal-intent-check" value="' + key + '">' +
        '<span class="ability-intent-info">' +
          '<span>' + def.label + ' <span class="ability-intent-cost">(' + def.strain + ')</span></span>' +
          '<span class="ability-intent-desc">' + def.description + '</span>' +
        '</span>' +
      '</label>';
    }).join('');

    var awStateRadios = Object.entries(Schema.ABILITY_AWARENESS).map(function(entry) {
      var key = entry[0], def = entry[1];
      return '<label class="ability-radio-label">' +
        '<input type="radio" name="modal-aw-state" value="' + key + '"' +
        (key === 'suppressed' ? ' checked' : '') + '>' +
        def.label +
      '</label>';
    }).join('');

    var durRadios = Object.entries(Schema.DURATIONS).map(function(entry) {
      var key = entry[0], def = entry[1];
      return '<label class="ability-radio-label">' +
        '<input type="radio" name="modal-dur" value="' + key + '"' +
        (key === 'instant' ? ' checked' : '') + '>' +
        def.label + ' <span class="ability-intent-cost">(+' + def.strain + ')</span>' +
      '</label>';
    }).join('');

    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'ability-modal';
    overlay.hidden = true;
    overlay.innerHTML =
      '<div class="modal ability-modal" role="dialog" aria-labelledby="ability-modal-title">' +
        '<div class="modal-header">' +
          '<h3 id="ability-modal-title">Edit Ability</h3>' +
          '<button class="btn-icon ability-modal-close-btn" id="btn-ability-modal-close" aria-label="Close">\u00d7</button>' +
        '</div>' +
        '<div class="modal-body">' +
          '<div class="field">' +
            '<label for="modal-ability-name">Name</label>' +
            '<input type="text" id="modal-ability-name" placeholder="Ability name">' +
          '</div>' +
          '<div class="field mt-sm">' +
            '<label for="modal-ability-polarity">Polarity</label>' +
            '<select id="modal-ability-polarity">' +
              '<option value="">\u2014 select \u2014</option>' +
            '</select>' +
          '</div>' +
          '<div class="field mt-sm">' +
            '<label for="modal-ability-desc">Description</label>' +
            '<textarea id="modal-ability-desc" class="ability-modal-desc" placeholder="What does this ability do?"></textarea>' +
          '</div>' +
          '<details class="ability-accordion" open>' +
            '<summary class="ability-accordion-summary">Intents</summary>' +
            '<div class="ability-accordion-content">' +
              '<div class="ability-intents-grid">' + intentChecks + '</div>' +
              '<div id="modal-condition-details-section" class="ability-detail-section" hidden>' +
                '<div class="ability-detail-header">' +
                  '<span class="ability-detail-label">Conditions applied</span>' +
                  '<button type="button" id="btn-add-condition" class="btn ability-detail-add-btn">+ Add</button>' +
                '</div>' +
                '<div id="modal-condition-list"></div>' +
              '</div>' +
              '<div id="modal-cast-details-section" class="ability-detail-section" hidden>' +
                '<div class="ability-detail-header">' +
                  '<span class="ability-detail-label">Abilities cast</span>' +
                  '<button type="button" id="btn-add-cast" class="btn ability-detail-add-btn">+ Add</button>' +
                '</div>' +
                '<div id="modal-cast-list"></div>' +
              '</div>' +
              '<div class="ability-intent-warning warning" id="modal-intent-warning" hidden></div>' +
            '</div>' +
          '</details>' +
          '<details class="ability-accordion" open>' +
            '<summary class="ability-accordion-summary">Awareness</summary>' +
            '<div class="ability-accordion-content">' +
              '<div class="ability-awareness-states">' + awStateRadios + '</div>' +
              '<p class="ability-selection-desc" id="modal-aw-desc"></p>' +
              '<div class="ability-awareness-substates" id="modal-substates"></div>' +
            '</div>' +
          '</details>' +
          '<details class="ability-accordion" open>' +
            '<summary class="ability-accordion-summary">Duration</summary>' +
            '<div class="ability-accordion-content">' +
              '<div class="ability-duration-group">' + durRadios + '</div>' +
              '<p class="ability-selection-desc" id="modal-dur-desc"></p>' +
              '<div class="ability-sustained-note" id="modal-sustained-note" hidden>' +
                'Sustained abilities drop if awareness state changes' +
              '</div>' +
            '</div>' +
          '</details>' +
        '</div>' +
        '<div class="ability-cost-footer">' +
          '<span class="ability-strain-label">Strain Cost:</span>' +
          '<span class="ability-strain-value" id="modal-strain-value">0</span>' +
          '<span class="ability-free-tag" id="modal-free-tag" hidden>Free</span>' +
          '<div class="ability-footer-actions">' +
            '<button class="btn btn-danger" id="btn-ability-delete" type="button">Delete</button>' +
            '<button class="btn btn-accent" id="btn-ability-save" type="button">Save</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);

    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) closeModal();
    });

    document.getElementById('btn-ability-modal-close').addEventListener('click', closeModal);
    document.getElementById('btn-ability-save').addEventListener('click', closeModal);
    document.getElementById('btn-ability-delete').addEventListener('click', deleteEditing);

    var body = overlay.querySelector('.modal-body');
    body.addEventListener('input', handleModalInput);
    body.addEventListener('change', handleModalChange);
    body.addEventListener('click', handleModalBodyClick);
  }

  // ─── Modal open / close / delete ─────────────────────────────

  function openModal(card) {
    _editingCard = card;
    var data;
    try { data = JSON.parse(card.dataset.abilityData); } catch (e) { data = {}; }

    document.getElementById('modal-ability-name').value = data.name || '';
    populatePolaritySelect(_lastCharacter, data.polarity);
    document.getElementById('modal-ability-desc').value = data.description || '';

    document.querySelectorAll('.modal-intent-check').forEach(function(cb) {
      cb.checked = (data.intents || []).indexOf(cb.value) !== -1;
    });

    var stateKey = data.awarenessState || 'suppressed';
    var stateRadio = document.querySelector('input[name="modal-aw-state"][value="' + stateKey + '"]');
    if (stateRadio) stateRadio.checked = true;

    rebuildModalSubstates(stateKey);
    var subKey = data.awarenessSubstate;
    if (subKey) {
      var subRadio = document.querySelector('input[name="modal-aw-sub"][value="' + subKey + '"]');
      if (subRadio) subRadio.checked = true;
    }

    var durKey = data.duration || 'instant';
    var durRadio = document.querySelector('input[name="modal-dur"][value="' + durKey + '"]');
    if (durRadio) durRadio.checked = true;

    updateModalIntentValidation();
    updateCastXVisibility();
    updateIntentDetails(data);
    updateModalAwDescription();
    updateModalDurDescription();
    updateModalSustainedNote();
    updateModalStrain(_lastCharacter);
    syncModalToCard();

    document.getElementById('ability-modal').hidden = false;
    document.getElementById('modal-ability-name').focus();
  }

  function closeModal() {
    document.getElementById('ability-modal').hidden = true;
    _editingCard = null;
  }

  function deleteEditing() {
    if (!_editingCard) return;
    var id = _editingCard.dataset.id;
    closeModal();
    var card = document.querySelector('.ability-card[data-id="' + id + '"]');
    if (card) card.remove();
    _onUpdate();
  }

  // ─── Modal helpers ────────────────────────────────────────────

  function populatePolaritySelect(character, selected) {
    var select = document.getElementById('modal-ability-polarity');
    var polarities = gatherPolarities(character || {});
    var saved = selected !== undefined ? selected : select.value;
    var opts = '<option value="">\u2014 select \u2014</option>';
    polarities.forEach(function(p) {
      opts += '<option value="' + p + '"' + (p === saved ? ' selected' : '') + '>' + p + '</option>';
    });
    if (saved && polarities.indexOf(saved) === -1) {
      opts += '<option value="' + saved + '" selected>' + saved + ' (removed)</option>';
    }
    select.innerHTML = opts;
  }

  function rebuildModalSubstates(stateKey) {
    var container = document.getElementById('modal-substates');
    var state = Schema.ABILITY_AWARENESS[stateKey];
    if (!state) { container.innerHTML = ''; return; }
    container.innerHTML = Object.entries(state.substates).map(function(entry, i) {
      var key = entry[0], def = entry[1];
      return '<label class="ability-radio-label ability-radio-with-desc">' +
        '<input type="radio" name="modal-aw-sub" value="' + key + '"' +
        (i === 0 ? ' checked' : '') + '>' +
        '<span class="ability-radio-info">' +
          '<span>' + def.label + ' <span class="ability-intent-cost">(+' + def.strain + ')</span></span>' +
          '<span class="ability-radio-desc">' + def.description + '</span>' +
        '</span>' +
      '</label>';
    }).join('');
  }

  function buildConditionItem(data) {
    // data = { type, variant } or null for a blank entry
    var type    = (data && data.type)    || Object.keys(Schema.CONDITIONS).find(function(k) { return k !== 'custom'; });
    var variant = (data && data.variant) || '';
    var condDef = Schema.CONDITIONS[type] || {};

    var div = document.createElement('div');
    div.className = 'ability-detail-item';

    var select = document.createElement('select');
    select.className = 'ability-condition-select';
    Object.entries(Schema.CONDITIONS).forEach(function(entry) {
      if (entry[0] === 'custom') return;
      var def = entry[1];
      var opt = document.createElement('option');
      opt.value = entry[0];
      opt.textContent = def.description ? def.label + ' \u2014 ' + def.description : def.label;
      if (entry[0] === type) opt.selected = true;
      select.appendChild(opt);
    });

    var variantInput = document.createElement('input');
    variantInput.type = 'text';
    variantInput.className = 'ability-condition-variant';
    variantInput.placeholder = condDef.detailPlaceholder || '';
    variantInput.value = variant;
    variantInput.hidden = !condDef.hasDetail;

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-icon ability-detail-remove';
    btn.setAttribute('aria-label', 'Remove');
    btn.textContent = '\u00d7';

    div.appendChild(select);
    div.appendChild(variantInput);
    div.appendChild(btn);
    return div;
  }

  function buildCastItem(selectedId) {
    var abilities = (_lastCharacter && _lastCharacter.activeAbilities) || [];
    var currentId = _editingCard ? _editingCard.dataset.id : null;
    var others = abilities.filter(function(a) { return a.id !== currentId && a.name; });

    var div = document.createElement('div');
    div.className = 'ability-detail-item';

    var select = document.createElement('select');
    select.className = 'ability-cast-select';

    var blank = document.createElement('option');
    blank.value = '';
    blank.textContent = '\u2014 select ability \u2014';
    select.appendChild(blank);

    others.forEach(function(a) {
      var opt = document.createElement('option');
      opt.value = a.id;
      opt.textContent = a.name;
      if (a.id === selectedId) opt.selected = true;
      select.appendChild(opt);
    });

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-icon ability-detail-remove';
    btn.setAttribute('aria-label', 'Remove');
    btn.textContent = '\u00d7';

    div.appendChild(select);
    div.appendChild(btn);
    return div;
  }

  function readCastList() {
    var vals = [];
    document.querySelectorAll('#modal-cast-list .ability-cast-select').forEach(function(select) {
      if (select.value) vals.push(select.value);
    });
    return vals;
  }

  function readConditionList() {
    var vals = [];
    document.querySelectorAll('#modal-condition-list .ability-detail-item').forEach(function(item) {
      var select = item.querySelector('.ability-condition-select');
      var variantInput = item.querySelector('.ability-condition-variant');
      if (!select) return;
      vals.push({
        type:    select.value,
        variant: (variantInput && !variantInput.hidden) ? variantInput.value.trim() : '',
      });
    });
    return vals;
  }

  function readDetailList(listId) {
    var vals = [];
    document.querySelectorAll('#' + listId + ' .ability-detail-input').forEach(function(input) {
      var v = input.value.trim();
      if (v) vals.push(v);
    });
    return vals;
  }

  function updateIntentDetails(initialData) {
    var conditionChecked = !!document.querySelector('.modal-intent-check[value="condition"]:checked');
    var castXCheck = document.querySelector('.modal-intent-check[value="castX"]');
    var castXChecked = castXCheck && castXCheck.checked && !castXCheck.closest('.ability-intent-label').hidden;

    var condSection = document.getElementById('modal-condition-details-section');
    var castSection = document.getElementById('modal-cast-details-section');
    var condWasHidden = condSection.hidden;
    var castWasHidden = castSection.hidden;

    condSection.hidden = !conditionChecked;
    castSection.hidden = !castXChecked;

    if (conditionChecked && (condWasHidden || initialData)) {
      var condList = document.getElementById('modal-condition-list');
      condList.innerHTML = '';
      var cvals = (initialData && initialData.conditionDetails && initialData.conditionDetails.length)
        ? initialData.conditionDetails : [null];
      cvals.forEach(function(v) {
        // v may be a legacy string or a { type, variant } object
        var data = (v && typeof v === 'object') ? v : null;
        condList.appendChild(buildConditionItem(data));
      });
    }

    if (castXChecked && (castWasHidden || initialData)) {
      var castList = document.getElementById('modal-cast-list');
      castList.innerHTML = '';
      var kavals = (initialData && initialData.castDetails && initialData.castDetails.length)
        ? initialData.castDetails : [null];
      kavals.forEach(function(v) {
        castList.appendChild(buildCastItem(v || null));
      });
    }
  }

  function readModalAbility() {
    var intents = [];
    document.querySelectorAll('.modal-intent-check:checked').forEach(function(cb) {
      if (!cb.closest('.ability-intent-label').hidden) intents.push(cb.value);
    });
    var awState = document.querySelector('input[name="modal-aw-state"]:checked');
    var awSub   = document.querySelector('input[name="modal-aw-sub"]:checked');
    var dur     = document.querySelector('input[name="modal-dur"]:checked');
    return {
      id:                _editingCard ? _editingCard.dataset.id : '',
      name:              document.getElementById('modal-ability-name').value.trim(),
      polarity:          document.getElementById('modal-ability-polarity').value,
      description:       document.getElementById('modal-ability-desc').value.trim(),
      intents:           intents,
      awarenessState:    awState ? awState.value : 'suppressed',
      awarenessSubstate: awSub ? awSub.value : 'touch',
      duration:          dur ? dur.value : 'instant',
      conditionDetails:  !document.getElementById('modal-condition-details-section').hidden
                           ? readConditionList() : [],
      castDetails:       !document.getElementById('modal-cast-details-section').hidden
                           ? readCastList() : [],
    };
  }

  function syncModalToCard() {
    if (!_editingCard) return;
    var data = readModalAbility();
    data.id = _editingCard.dataset.id;
    _editingCard.dataset.abilityData = JSON.stringify(data);
    updateCardDisplay(_editingCard, data, _lastCharacter);
    _onUpdate();
  }

  function updateModalIntentValidation() {
    var stateRadio = document.querySelector('input[name="modal-aw-state"]:checked');
    var stateKey = stateRadio ? stateRadio.value : 'suppressed';
    var stateDef = Schema.ABILITY_AWARENESS[stateKey];
    var allowed = stateDef.allowedIntents || null;
    var warningEl = document.getElementById('modal-intent-warning');
    var hasInvalid = false;

    document.querySelectorAll('.modal-intent-check').forEach(function(cb) {
      var label = cb.closest('.ability-intent-label');
      if (allowed && allowed.indexOf(cb.value) === -1) {
        label.classList.add('ability-intent-disabled');
        if (cb.checked) hasInvalid = true;
      } else {
        label.classList.remove('ability-intent-disabled');
      }
    });

    warningEl.textContent = hasInvalid ? 'Extended awareness does not support the selected intent(s)' : '';
    warningEl.hidden = !hasInvalid;
  }

  function updateCastXVisibility() {
    var hasCreateOrManifest = false;
    document.querySelectorAll('.modal-intent-check:checked').forEach(function(cb) {
      if (cb.value === 'create' || cb.value === 'manifest') hasCreateOrManifest = true;
    });
    var castXCheck = document.querySelector('.modal-intent-check[value="castX"]');
    if (!castXCheck) return;
    var castXLabel = castXCheck.closest('.ability-intent-label');
    castXLabel.hidden = !hasCreateOrManifest;
    if (!hasCreateOrManifest) castXCheck.checked = false;
  }

  function updateModalAwDescription() {
    var stateRadio = document.querySelector('input[name="modal-aw-state"]:checked');
    var stateKey = stateRadio ? stateRadio.value : 'suppressed';
    var stateDef = Schema.ABILITY_AWARENESS[stateKey];
    document.getElementById('modal-aw-desc').textContent = stateDef ? stateDef.description : '';
  }

  function updateModalDurDescription() {
    var durRadio = document.querySelector('input[name="modal-dur"]:checked');
    var durKey = durRadio ? durRadio.value : 'instant';
    var durDef = Schema.DURATIONS[durKey];
    document.getElementById('modal-dur-desc').textContent = durDef ? durDef.description : '';
  }

  function updateModalSustainedNote() {
    var durRadio = document.querySelector('input[name="modal-dur"]:checked');
    document.getElementById('modal-sustained-note').hidden =
      !(durRadio && durRadio.value === 'sustained');
  }

  function updateModalStrain(character) {
    var data = readModalAbility();
    var cost = Schema.calcAbilityStrainCost(data);
    document.getElementById('modal-strain-value').textContent = cost;
    var realm = ((character || {}).identity || {}).realm || 0;
    var freeTag = document.getElementById('modal-free-tag');
    if (cost > 0 && cost <= realm) {
      freeTag.textContent = 'Free at Realm ' + realm;
      freeTag.hidden = false;
    } else {
      freeTag.hidden = true;
    }
  }

  // ─── Modal event handlers ─────────────────────────────────────

  function handleModalInput(e) {
    if (e.target.matches('input[type="text"], textarea')) {
      syncModalToCard();
    }
  }

  function handleModalChange(e) {
    if (e.target.matches('input[name="modal-aw-state"]')) {
      rebuildModalSubstates(e.target.value);
      updateModalIntentValidation();
      updateModalAwDescription();
    }
    if (e.target.matches('.modal-intent-check')) {
      updateModalIntentValidation();
      updateCastXVisibility();
      updateIntentDetails();
    }
    if (e.target.matches('input[name="modal-dur"]')) {
      updateModalSustainedNote();
      updateModalDurDescription();
    }
    if (e.target.matches('.ability-condition-select')) {
      var condDef = Schema.CONDITIONS[e.target.value] || {};
      var item = e.target.closest('.ability-detail-item');
      var variantInput = item.querySelector('.ability-condition-variant');
      variantInput.hidden = !condDef.hasDetail;
      variantInput.placeholder = condDef.detailPlaceholder || '';
      if (!condDef.hasDetail) variantInput.value = '';
    }
    updateModalStrain(_lastCharacter);
    syncModalToCard();
  }

  function handleModalBodyClick(e) {
    if (e.target.closest('#btn-add-condition')) {
      document.getElementById('modal-condition-list').appendChild(buildConditionItem(null));
      syncModalToCard();
      return;
    }
    if (e.target.closest('#btn-add-cast')) {
      document.getElementById('modal-cast-list').appendChild(buildCastItem(null));
      syncModalToCard();
      return;
    }
    if (e.target.closest('.ability-detail-remove')) {
      var item = e.target.closest('.ability-detail-item');
      var list = item.parentNode;
      item.remove();
      if (!list.querySelector('.ability-detail-item')) {
        if (list.id === 'modal-condition-list') {
          list.appendChild(buildConditionItem(null));
        } else {
          list.appendChild(buildCastItem(null));
        }
      }
      syncModalToCard();
      return;
    }
  }

  // ─── Compact cards & reconcile ────────────────────────────────

  function reconcile(abilities, character) {
    var list = document.getElementById('abilities-list');
    var existing = {};
    list.querySelectorAll('.ability-card').forEach(function(card) {
      existing[card.dataset.id] = card;
    });
    var targetIds = new Set(abilities.map(function(a) { return a.id; }));
    Object.keys(existing).forEach(function(id) {
      if (!targetIds.has(id)) {
        if (_editingCard && _editingCard.dataset.id === id) closeModal();
        existing[id].remove();
      }
    });
    abilities.forEach(function(a, i) {
      var card = existing[a.id];
      if (!card) card = buildCard(a.id);
      card.dataset.abilityData = JSON.stringify(a);
      updateCardDisplay(card, a, character);
      if (list.children[i] !== card) list.insertBefore(card, list.children[i] || null);
    });
  }

  function buildCard(id) {
    var card = document.createElement('div');
    card.className = 'ability-card item-card';
    card.dataset.id = id;
    card.innerHTML =
      '<div class="ability-card-row">' +
        '<button class="btn ability-use-btn" type="button" aria-label="Use ability">Use</button>' +
        '<div class="ability-card-info">' +
          '<span class="ability-card-name">New Ability</span>' +
          '<span class="ability-card-summary"></span>' +
          '<span class="ability-card-desc"></span>' +
        '</div>' +
        '<span class="ability-card-cost"></span>' +
        '<span class="ability-free-tag" hidden>Free</span>' +
        '<button class="btn-icon ability-edit" type="button" aria-label="Edit" title="Edit ability">&#9998;</button>' +
      '</div>';
    return card;
  }

  function updateCardDisplay(card, data, character) {
    var nameEl = card.querySelector('.ability-card-name');
    nameEl.textContent = data.name || 'New Ability';
    nameEl.classList.toggle('text-muted', !data.name);

    var parts = [];
    if (data.polarity) parts.push(data.polarity);
    var intentLabels = (data.intents || []).map(function(key) {
      if (key === 'condition') {
        var cds = data.conditionDetails && data.conditionDetails.length ? data.conditionDetails : null;
        if (!cds) return 'Condition';
        var labels = cds.map(function(c) {
          if (!c) return '';
          var def = Schema.CONDITIONS[c.type];
          return c.variant ? c.variant : (def ? def.label : c.type);
        }).filter(Boolean);
        return 'Condition [' + (labels.length ? labels.join(', ') : 'X') + ']';
      }
      if (key === 'castX') {
        var cas = data.castDetails && data.castDetails.filter(Boolean);
        if (!cas || !cas.length) return 'Cast';
        var abilities = (character && character.activeAbilities) || [];
        var names = cas.map(function(id) {
          var a = abilities.find(function(x) { return x.id === id; });
          return a ? a.name : id;
        });
        return 'Cast [' + names.join(', ') + ']';
      }
      return (Schema.INTENTS[key] || {}).label || key;
    });
    if (intentLabels.length) parts.push(intentLabels.join(', '));
    var state = Schema.ABILITY_AWARENESS[data.awarenessState];
    var sub = state && state.substates[data.awarenessSubstate];
    if (sub) parts.push(sub.dimension ? sub.label + ' (' + sub.dimension + ')' : sub.label);
    var dur = Schema.DURATIONS[data.duration];
    if (dur && data.duration !== 'instant') parts.push(dur.label);
    card.querySelector('.ability-card-summary').textContent = parts.join(' \u00b7 ');

    var descEl = card.querySelector('.ability-card-desc');
    descEl.textContent = data.description || '';
    descEl.hidden = !data.description;

    var cost = Schema.calcAbilityStrainCost(data);
    var realm = ((character || {}).identity || {}).realm || 0;
    var isFree = cost === 0 || cost <= realm;
    var costEl = card.querySelector('.ability-card-cost');
    var freeTag = card.querySelector('.ability-free-tag');
    if (isFree) {
      costEl.textContent = '';
      costEl.hidden = true;
      freeTag.textContent = 'Free';
      freeTag.hidden = false;
    } else {
      costEl.textContent = cost + ' strain';
      costEl.hidden = false;
      freeTag.hidden = true;
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────

  function gatherPolarities(character) {
    var polarities = [];
    (character.values || []).forEach(function(v) {
      (v.polarities || []).forEach(function(p) {
        if (p.name) polarities.push(p.name);
      });
    });
    ((character.identity || {}).lineages || []).forEach(function(l) {
      var law = Schema.LINEAGE_POLARITIES[l.name];
      if (law) polarities.push(law);
    });
    var seen = {};
    return polarities.filter(function(p) {
      if (seen[p]) return false;
      seen[p] = true;
      return true;
    });
  }

  // ─── List handlers ────────────────────────────────────────────

  function addAbility() {
    var list = document.getElementById('abilities-list');
    var id = Schema.newId();
    var data = {
      id: id, name: '', polarity: '', description: '',
      intents: [], awarenessState: 'suppressed',
      awarenessSubstate: 'touch', duration: 'instant',
      conditionDetails: [], castDetails: [],
    };
    var card = buildCard(id);
    card.dataset.abilityData = JSON.stringify(data);
    updateCardDisplay(card, data, _lastCharacter);
    list.appendChild(card);
    _onUpdate();
    openModal(card);
  }

  function handleListClick(e) {
    var card = e.target.closest('.ability-card');
    if (!card) return;

    if (e.target.closest('.ability-edit')) {
      openModal(card);
      return;
    }

    if (e.target.closest('.ability-use-btn')) {
      var data;
      try { data = JSON.parse(card.dataset.abilityData); } catch (err) { return; }
      var cost = Schema.calcAbilityStrainCost(data);
      var realm = ((_lastCharacter || {}).identity || {}).realm || 0;
      if (cost > 0 && cost > realm && _onStrainSpend) {
        _onStrainSpend(cost);
      }
    }
  }

  return { init, render, read };
})();
