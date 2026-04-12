// passiveAbilities.js
// Manages the Passive Abilities section. Exposes a single global: PassiveAbilities
// Relies on globals: Schema (loaded before this module in index.html)

const PassiveAbilities = (() => {

  let _onUpdate            = null;
  let _passives            = [];
  let _editingId           = null;
  let _currentForm         = null;
  let _characterPolarities = [];
  let _buildupState        = {}; // { [id]: step 0-4 }, ephemeral – not persisted

  const BUILDUP_DIES = ['d12', 'd10', 'd8', 'd6', 'd4'];

  // ─── Helpers ──────────────────────────────────────────────────

  function esc(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function getMeta(name) {
    return Schema.PASSIVE_ABILITIES.find(function(p) { return p.name === name; }) || null;
  }

  function levelToDie(level) {
    return ['d12', 'd10', 'd8', 'd6', 'd4'][Math.min(Math.max((level || 1) - 1, 0), 4)];
  }

  function awarenessOpts(selected) {
    return ['Cloaked', 'Suppressed', 'Extended', 'Focused'].map(function(s) {
      return '<option value="' + s + '"' + (s === selected ? ' selected' : '') + '>' + s + '</option>';
    }).join('');
  }

  // ─── Form utilities ───────────────────────────────────────────

  function descBlock(text) {
    return '<p class="pf-desc">' + text + '</p>';
  }

  function costNote(text) {
    return '<p class="pf-cost-note">' + text + '</p>';
  }

  function pfLevel() {
    var el = document.getElementById('pf-level');
    return el ? Math.max(1, parseInt(el.value, 10) || 1) : 1;
  }

  function pfVal(id) {
    var el = document.getElementById(id);
    return el ? el.value : '';
  }

  function setPfDerived(text) {
    var el = document.getElementById('pf-derived');
    if (el) el.textContent = text;
  }

  function levelFields(value, max) {
    var maxAttr = max ? ' max="' + max + '"' : '';
    return (
      '<div class="field">' +
        '<label for="pf-level">XP Invested</label>' +
        '<input type="number" id="pf-level" min="1"' + maxAttr + ' value="' + (value || 1) + '">' +
      '</div>'
    );
  }

  function derivedField(label, id, value, extraClass) {
    var cls = extraClass ? ' ' + extraClass : '';
    return (
      '<div class="field">' +
        '<label>' + label + '</label>' +
        '<span class="derived' + cls + '" id="' + id + '">' + value + '</span>' +
      '</div>'
    );
  }

  function polarityOpts(selected) {
    if (_characterPolarities.length === 0) {
      return '<option value="">— No polarities defined yet —</option>';
    }
    return _characterPolarities.map(function(p) {
      return '<option value="' + esc(p) + '"' + (p === selected ? ' selected' : '') + '>' + esc(p) + '</option>';
    }).join('');
  }

  function polarityCheckboxes(selectedList, inputName) {
    if (_characterPolarities.length === 0) {
      return '<p class="pf-cost-note">No polarities defined on this character yet.</p>';
    }
    return _characterPolarities.map(function(p) {
      var checked = selectedList.indexOf(p) !== -1 ? ' checked' : '';
      return (
        '<label class="pf-polarity-item">' +
          '<input type="checkbox" name="' + inputName + '" value="' + esc(p) + '"' + checked + '>' +
          '<span>' + esc(p) + '</span>' +
        '</label>'
      );
    }).join('');
  }

  // ─── Row rendering helpers ────────────────────────────────────

  function levelBadge(level) {
    return '<span class="passive-row-level">Lv\u00a0' + level + '</span>';
  }

  function notesBadge(text) {
    return '<span class="passive-row-tag">' + esc(text) + '</span>';
  }

  function derivedBadge(text) {
    return '<span class="passive-row-derived">' + esc(text) + '</span>';
  }

  // ─── No-edit passives and inline descriptions ─────────────────

  var NO_EDIT_PASSIVES = {
    'Juggernaut':              true,
    'Never at Loss':           true,
    'Freedom of Movement':     true,
    'Unconstrained Mind':      true,
    'Focused Execution':       true,
    'Shared Assurance':        true,
    'Invigorated':             true,
    'No Wound, All Condition': true,
    'Compounding':             true,
  };

  var PASSIVE_INLINE_DESC = {
    'Juggernaut':              'Wound rated 1: slot fills, no condition applied',
    'Never at Loss':           'Complication: regain 1 Strain',
    'Freedom of Movement':     'Ignore terrain Stride penalties',
    'Unconstrained Mind':      'Immune to mind control',
    'Focused Execution':       '\u22643 source pool: +1 success',
    'Shared Assurance':        'Same negative effect as ally: +1 success on next action',
    'Invigorated':             '+1 wound slot',
    'No Wound, All Condition': 'On wound: apply 2 conditions instead',
    'Compounding':             '2nd condition also applies Destabilized (1 Strain)',
  };

  // ─── Per-passive row detail builder ──────────────────────────

  function rowDetails(passive) {
    var name  = passive.name;
    var level = passive.level || 1;
    var notes = passive.notes || '';

    if (PASSIVE_INLINE_DESC[name]) {
      return '<span class="passive-row-desc">' + esc(PASSIVE_INLINE_DESC[name]) + '</span>';
    }

    switch (name) {

      case 'Stability':
        return levelBadge(level) + derivedBadge('\u2212' + level + ' band' + (level !== 1 ? 's' : ''));

      case 'Armored Aura':
        return levelBadge(level) + derivedBadge('AS\u00a0' + level);

      case 'Unmeasured Response':
        return levelBadge(level) + derivedBadge(levelToDie(level)) + '<span class="passive-row-desc-small">on wound: bonus die</span>';

      case 'Resistant': {
        var dt     = Schema.DAMAGE_TYPES.find(function(d) { return d.name === notes; });
        var xpMult = dt ? (dt.xpPerLevel || 1) : 1;
        var xpPart = xpMult > 1
          ? '<span class="passive-row-xp">(' + (level * xpMult) + '\u00a0XP)</span>'
          : levelBadge(level);
        return notesBadge(notes || '\u2014') + derivedBadge('\u2212' + level + ' Strain') + xpPart;
      }

      case 'Vulnerability': {
        var vdt     = Schema.DAMAGE_TYPES.find(function(d) { return d.name === notes; });
        var vMult   = vdt ? (vdt.xpPerLevel || 1) : 1;
        var grant   = level * vMult;
        var grantEl = '<span class="passive-row-xp">(+' + grant + '\u00a0XP)</span>';
        return notesBadge(notes || '\u2014') + derivedBadge('+' + level + ' Strain') + grantEl;
      }

      case 'Advanced Awareness':
        return notesBadge(notes || '\u2014') + levelBadge(level) + derivedBadge('+' + level + ' band' + (level !== 1 ? 's' : ''));

      case 'Item Proficiency':
        return notesBadge(notes || '\u2014') + levelBadge(level) + derivedBadge(levelToDie(Math.min(5, level)));

      case 'Advanced Sense': {
        var parts    = notes.split(' | ');
        var polarity = parts[0].trim();
        var desc     = parts.slice(1).join(' | ').trim();
        return (polarity ? notesBadge(polarity) : '') +
               (desc ? '<span class="passive-row-desc-small">' + esc(desc) + '</span>' : '');
      }

      case 'Polarity Attunement': {
        var pols = notes.split(',').filter(Boolean).map(function(p) { return p.trim(); });
        if (pols.length === 0) return '';
        var inner = pols.map(function(p) { return esc(p) + '\u00a01'; }).join('<span class="passive-row-sep"> | </span>');
        return '<span class="passive-row-attunements">' + inner + '</span>';
      }

      case 'Undetected Awareness': {
        var uParts = notes.split(' | ');
        var uState = (uParts[0] || '').trim();
        var uPols  = (uParts[1] || '').split(',').filter(Boolean).map(function(p) { return p.trim(); });
        return (uState ? notesBadge(uState) : '') + uPols.map(function(p) { return notesBadge(p); }).join('');
      }

      case 'Buildup': {
        var step  = _buildupState[passive.id] || 0;
        var die   = BUILDUP_DIES[Math.min(step, 4)];
        var atMax = step >= 4;
        return (
          (notes ? '<span class="passive-row-desc-small">' + esc(notes) + '</span>' : '') +
          '<span class="buildup-die passive-row-derived">' + die + '</span>' +
          '<button class="btn btn-sm buildup-step-btn" type="button"' + (atMax ? ' disabled' : '') + ' title="Advance die">+Step</button>' +
          '<button class="btn btn-sm buildup-use-btn" type="button" title="Use and reset">\u21ba Reset</button>'
        );
      }

      case 'Relentless Application':
        return notes ? notesBadge(notes) : '';

      default: {
        var out = level > 1 ? levelBadge(level) : '';
        if (notes) out += '<span class="passive-row-desc-small">' + esc(notes) + '</span>';
        return out;
      }
    }
  }

  // ─── Per-passive form definitions ─────────────────────────────

  const PASSIVE_FORMS = {

    // ── FLAT, NO CONFIGURATION ────────────────────────────────

    'Juggernaut': {
      buildContent: function(data) {
        return descBlock('When you receive a wound with a Strain rating of 1, the wound slot is filled but no condition is associated with it.') + costNote('1 XP — purchased once.');
      },
      readData: function() { return { level: 1, notes: '' }; },
      onInput:  function() {}
    },

    'Never at Loss': {
      buildContent: function(data) {
        return descBlock('When you would suffer from any complications on a roll, you regain 1 Strain instead.') + costNote('1 XP — purchased once.');
      },
      readData: function() { return { level: 1, notes: '' }; },
      onInput:  function() {}
    },

    'Freedom of Movement': {
      buildContent: function(data) {
        return descBlock('Terrain and environmental effects that would reduce your Stride have no effect on you.') + costNote('1 XP — purchased once.');
      },
      readData: function() { return { level: 1, notes: '' }; },
      onInput:  function() {}
    },

    'Unconstrained Mind': {
      buildContent: function(data) {
        return descBlock('You are immune to mind control and any effect that would override your will or compel your actions.') + costNote('1 XP — purchased once.');
      },
      readData: function() { return { level: 1, notes: '' }; },
      onInput:  function() {}
    },

    'Focused Execution': {
      buildContent: function(data) {
        return descBlock('When your dice pool is built from 3 or fewer sources, you gain +1 success on that roll.') + costNote('1 XP — purchased once.');
      },
      readData: function() { return { level: 1, notes: '' }; },
      onInput:  function() {}
    },

    'Shared Assurance': {
      buildContent: function(data) {
        return descBlock('When you and an ally suffer the same specific negative effect simultaneously, you gain +1 success on your next action.') + costNote('1 XP — purchased once.');
      },
      readData: function() { return { level: 1, notes: '' }; },
      onInput:  function() {}
    },

    'Invigorated': {
      buildContent: function(data) {
        return descBlock('Gain one additional wound slot. An extra pip appears in the Strain section.') + costNote('1 XP — purchased once.');
      },
      readData: function() { return { level: 1, notes: '' }; },
      onInput:  function() {}
    },

    'No Wound, All Condition': {
      buildContent: function(data) {
        return descBlock('When you would successfully wound an enemy, you can choose not to. If you do, apply an initial condition at the Strain you rolled and one additional condition at 1 Strain.') + costNote('1 XP — purchased once.');
      },
      readData: function() { return { level: 1, notes: '' }; },
      onInput:  function() {}
    },

    'Compounding': {
      buildContent: function(data) {
        return descBlock('When you apply a condition to a target that already has at least one condition, they also become Destabilized (1 Strain condition).') + costNote('1 XP — purchased once.');
      },
      readData: function() { return { level: 1, notes: '' }; },
      onInput:  function() {}
    },

    // ── FLAT WITH CONFIGURATION ───────────────────────────────

    'Buildup': {
      buildContent: function(data) {
        return (
          descBlock('Designate one specific trigger. Each time it occurs, gain an escalating die starting at d12 (d12 \u2192 d10 \u2192 d8 \u2192 d6 \u2192 d4). The die caps at d4. Add it to any roll at any time, then it resets.') +
          '<div class="field mt-md">' +
            '<label for="pf-trigger">Trigger</label>' +
            '<input type="text" id="pf-trigger" value="' + esc(data.notes || '') + '" placeholder="e.g. casting a Sustained ability, deflecting an attack">' +
          '</div>' +
          costNote('1 XP — purchased once.')
        );
      },
      readData: function() { return { level: 1, notes: pfVal('pf-trigger').trim() }; },
      onInput:  function() {}
    },

    'Relentless Application': {
      buildContent: function(data) {
        return (
          descBlock('When you roll a null result on a roll to apply a specific condition (not through a wound), that condition still applies at 1 Strain anyway.') +
          '<div class="field mt-md">' +
            '<label for="pf-condition-type">Condition Type</label>' +
            '<input type="text" id="pf-condition-type" value="' + esc(data.notes || '') + '" placeholder="e.g. On Fire, Blinded, Slowed">' +
          '</div>' +
          costNote('1 XP — purchased once per condition type. Add a separate entry for each.')
        );
      },
      readData: function() { return { level: 1, notes: pfVal('pf-condition-type').trim() }; },
      onInput:  function() {}
    },

    // ── LEVELED, NO EXTRA CONFIGURATION ───────────────────────

    'Stability': {
      buildContent: function(data) {
        var l = data.level || 1;
        return (
          descBlock('Each level reduces any forced movement applied to you by 1 Range Band.') +
          '<div class="cols-2 mt-md">' +
            levelFields(l, null) +
            derivedField('Reduction', 'pf-derived', '\u2212' + l + ' band' + (l !== 1 ? 's' : '')) +
          '</div>' +
          costNote('1 XP per level.')
        );
      },
      readData: function() { return { level: pfLevel(), notes: '' }; },
      onInput:  function() {
        var l = pfLevel();
        setPfDerived('\u2212' + l + ' band' + (l !== 1 ? 's' : ''));
      }
    },

    'Armored Aura': {
      buildContent: function(data) {
        var l = data.level || 1;
        return (
          descBlock('You have natural armor with a maximum AS equal to the XP invested. It regenerates up to 2 points every time you rest. Tracked in the Aura row of the Armor section.') +
          '<div class="cols-2 mt-md">' +
            levelFields(l, null) +
            derivedField('Natural Armor AS', 'pf-derived', String(l)) +
          '</div>' +
          costNote('1 XP per level.')
        );
      },
      readData: function() { return { level: pfLevel(), notes: '' }; },
      onInput:  function() { setPfDerived(String(pfLevel())); }
    },

    'Unmeasured Response': {
      buildContent: function(data) {
        var l = data.level || 1;
        return (
          descBlock('When you receive a wound, gain a bonus die on your next roll. Starts at d12 at 1 XP and steps down one size per additional XP (d12 \u2192 d10 \u2192 d8 \u2192 d6 \u2192 d4).') +
          '<div class="cols-2 mt-md">' +
            levelFields(l, null) +
            derivedField('Bonus Die', 'pf-derived', levelToDie(l), 'die-display') +
          '</div>' +
          costNote('1 XP per level.')
        );
      },
      readData: function() { return { level: pfLevel(), notes: '' }; },
      onInput:  function() { setPfDerived(levelToDie(pfLevel())); }
    },

    // ── LEVELED WITH EXTRA CONFIGURATION ──────────────────────

    'Resistant': {
      buildContent: function(data) {
        var l        = data.level || 1;
        var selected = data.notes || Schema.DAMAGE_TYPES[0].name;
        var opts     = Schema.DAMAGE_TYPES.map(function(dt) {
          return '<option value="' + esc(dt.name) + '"' + (dt.name === selected ? ' selected' : '') + '>' + esc(dt.name) + '</option>';
        }).join('');
        var dt       = Schema.DAMAGE_TYPES.find(function(d) { return d.name === selected; });
        var covers   = dt && dt.covers ? dt.covers : null;
        var xpMult   = dt ? (dt.xpPerLevel || 1) : 1;
        var coversHtml = '<div class="pf-covers" id="pf-covers"' + (covers ? '' : ' hidden') + '>' +
          '<span class="pf-covers-label">Covers:</span>' +
          '<span id="pf-covers-list">' + (covers ? covers.map(function(c) { return '<span class="pf-covers-badge">' + esc(c) + '</span>'; }).join('') : '') + '</span>' +
        '</div>';
        var xpNoteHtml = '<p class="pf-xp-note" id="pf-xp-note"' + (xpMult > 1 ? '' : ' hidden') + '>' +
          'Costs <strong id="pf-xp-mult">' + xpMult + '</strong> XP per level (covers <span id="pf-xp-type-count">' + (covers ? covers.length : 0) + '</span> types).' +
        '</p>';
        var totalXpHtml = '<div class="pf-total-xp-row" id="pf-total-xp-row"' + (xpMult > 1 ? '' : ' hidden') + '>' +
          '<span class="pf-total-xp-label">Total XP Cost</span>' +
          '<span class="derived" id="pf-total-xp">' + (l * xpMult) + '</span>' +
        '</div>';
        return (
          descBlock('Gain resistance to a specific damage type. Each level reduces incoming Strain of that type by 1. Each damage type is tracked as a separate entry.') +
          '<div class="field mt-md">' +
            '<label for="pf-damage-type">Damage Type</label>' +
            '<select id="pf-damage-type">' + opts + '</select>' +
          '</div>' +
          '<p class="pf-type-desc" id="pf-type-desc">' + esc(dt ? dt.desc : '') + '</p>' +
          coversHtml + xpNoteHtml +
          '<div class="cols-2 mt-sm">' +
            levelFields(l, null) +
            derivedField('Reduction', 'pf-derived', '\u2212' + l + ' Strain') +
          '</div>' +
          totalXpHtml +
          costNote('Add a separate entry for each damage type.')
        );
      },
      readData: function() { return { level: pfLevel(), notes: pfVal('pf-damage-type') }; },
      onInput: function() {
        var l      = pfLevel();
        var type   = pfVal('pf-damage-type');
        var dt     = Schema.DAMAGE_TYPES.find(function(d) { return d.name === type; });
        var covers = dt && dt.covers ? dt.covers : null;
        var xpMult = dt ? (dt.xpPerLevel || 1) : 1;
        setPfDerived('\u2212' + l + ' Strain');
        var descEl = document.getElementById('pf-type-desc');
        if (descEl) descEl.textContent = dt ? dt.desc : '';
        var coversEl = document.getElementById('pf-covers');
        if (coversEl) {
          coversEl.hidden = !covers;
          var listEl = document.getElementById('pf-covers-list');
          if (listEl) listEl.innerHTML = covers ? covers.map(function(c) { return '<span class="pf-covers-badge">' + esc(c) + '</span>'; }).join('') : '';
        }
        var xpNoteEl = document.getElementById('pf-xp-note');
        if (xpNoteEl) {
          xpNoteEl.hidden = xpMult <= 1;
          var multEl  = document.getElementById('pf-xp-mult');
          var countEl = document.getElementById('pf-xp-type-count');
          if (multEl)  multEl.textContent  = String(xpMult);
          if (countEl) countEl.textContent = String(covers ? covers.length : 0);
        }
        var totalRowEl = document.getElementById('pf-total-xp-row');
        var totalEl    = document.getElementById('pf-total-xp');
        if (totalRowEl) totalRowEl.hidden = xpMult <= 1;
        if (totalEl)    totalEl.textContent = String(l * xpMult);
      }
    },

    'Vulnerability': {
      buildContent: function(data) {
        var l        = Math.min(data.level || 1, 5);
        var selected = data.notes || Schema.DAMAGE_TYPES[0].name;
        var opts     = Schema.DAMAGE_TYPES.map(function(dt) {
          return '<option value="' + esc(dt.name) + '"' + (dt.name === selected ? ' selected' : '') + '>' + esc(dt.name) + '</option>';
        }).join('');
        var dt     = Schema.DAMAGE_TYPES.find(function(d) { return d.name === selected; });
        var covers = dt && dt.covers ? dt.covers : null;
        var xpMult = dt ? (dt.xpPerLevel || 1) : 1;
        var coversHtml = '<div class="pf-covers" id="pf-covers"' + (covers ? '' : ' hidden') + '>' +
          '<span class="pf-covers-label">Covers:</span>' +
          '<span id="pf-covers-list">' + (covers ? covers.map(function(c) { return '<span class="pf-covers-badge">' + esc(c) + '</span>'; }).join('') : '') + '</span>' +
        '</div>';
        return (
          descBlock('Take on increased damage from a specific damage type in exchange for XP. Each level increases incoming Strain of that type by 1 and grants 1 XP back to your pool. Maximum level 5.') +
          '<div class="field mt-md">' +
            '<label for="pf-damage-type">Damage Type</label>' +
            '<select id="pf-damage-type">' + opts + '</select>' +
          '</div>' +
          '<p class="pf-type-desc" id="pf-type-desc">' + esc(dt ? dt.desc : '') + '</p>' +
          coversHtml +
          '<div class="cols-2 mt-sm">' +
            levelFields(l, 5) +
            derivedField('Extra Strain', 'pf-derived', '+' + l + ' Strain') +
          '</div>' +
          '<div class="pf-total-xp-row" id="pf-total-xp-row">' +
            '<span class="pf-total-xp-label">XP Granted</span>' +
            '<span class="derived" id="pf-total-xp">+' + (l * xpMult) + '</span>' +
          '</div>' +
          costNote('Grants XP instead of costing XP. Add a separate entry for each damage type.')
        );
      },
      readData: function() {
        return { level: Math.min(5, pfLevel()), notes: pfVal('pf-damage-type') };
      },
      onInput: function() {
        var l      = Math.min(5, pfLevel());
        var type   = pfVal('pf-damage-type');
        var dt     = Schema.DAMAGE_TYPES.find(function(d) { return d.name === type; });
        var covers = dt && dt.covers ? dt.covers : null;
        var xpMult = dt ? (dt.xpPerLevel || 1) : 1;
        setPfDerived('+' + l + ' Strain');
        var descEl = document.getElementById('pf-type-desc');
        if (descEl) descEl.textContent = dt ? dt.desc : '';
        var coversEl = document.getElementById('pf-covers');
        if (coversEl) {
          coversEl.hidden = !covers;
          var listEl = document.getElementById('pf-covers-list');
          if (listEl) listEl.innerHTML = covers ? covers.map(function(c) { return '<span class="pf-covers-badge">' + esc(c) + '</span>'; }).join('') : '';
        }
        var totalEl = document.getElementById('pf-total-xp');
        if (totalEl) totalEl.textContent = '+' + (l * xpMult);
      }
    },

    'Advanced Awareness': {
      buildContent: function(data) {
        var l     = data.level || 1;
        var state = data.notes || 'Suppressed';
        return (
          descBlock('One state of your Awareness gains a boost to range. Each level increases how far that state reaches. Add separate entries to boost multiple states.') +
          '<div class="field mt-md">' +
            '<label for="pf-state">Awareness State</label>' +
            '<select id="pf-state">' + awarenessOpts(state) + '</select>' +
          '</div>' +
          '<div class="cols-2 mt-sm">' +
            levelFields(l, null) +
            derivedField('Range Boost', 'pf-derived', '+' + l + ' band' + (l !== 1 ? 's' : '')) +
          '</div>' +
          costNote('1 XP per level. Add a separate entry for each state you invest in.')
        );
      },
      readData: function() { return { level: pfLevel(), notes: pfVal('pf-state') }; },
      onInput:  function() {
        var l = pfLevel();
        setPfDerived('+' + l + ' band' + (l !== 1 ? 's' : ''));
      }
    },

    'Item Proficiency': {
      buildContent: function(data) {
        var l    = data.level || 1;
        var item = data.notes || '';
        return (
          descBlock('Choose a specific item or toolset. You gain a bonus die on relevant tasks. Each XP level steps the die down (d12 \u2192 d4 max). Items in the same family get a die one step worse.') +
          '<div class="field mt-md">' +
            '<label for="pf-item">Item or Toolset</label>' +
            '<input type="text" id="pf-item" value="' + esc(item) + '" placeholder="e.g. Longbow, Lockpicks, Alchemist\'s kit">' +
          '</div>' +
          '<div class="cols-2 mt-sm">' +
            levelFields(l, 5) +
            derivedField('Bonus Die', 'pf-derived', levelToDie(l), 'die-display') +
          '</div>' +
          costNote('1 XP per level, max 5. Add a separate entry for each item or toolset.')
        );
      },
      readData: function() { return { level: Math.min(5, pfLevel()), notes: pfVal('pf-item').trim() }; },
      onInput:  function() { setPfDerived(levelToDie(Math.min(5, pfLevel()))); }
    },

    // ── MULTI-INSTANCE ─────────────────────────────────────────

    'Advanced Sense': {
      buildContent: function(data) {
        var parts     = (data.notes || '').split(' | ');
        var polarity  = parts[0].trim();
        var senseDesc = parts.slice(1).join(' | ').trim();
        return (
          descBlock('Gain one enhanced or alternative sense tied to one of your polarities. The polarity shapes what the sense perceives.') +
          '<div class="field mt-md">' +
            '<label for="pf-sense-polarity">Polarity</label>' +
            '<select id="pf-sense-polarity">' + polarityOpts(polarity) + '</select>' +
          '</div>' +
          '<div class="field mt-sm">' +
            '<label for="pf-sense-desc">What the sense does</label>' +
            '<input type="text" id="pf-sense-desc" value="' + esc(senseDesc) + '" placeholder="e.g. see in complete darkness, perceive through a blindfold">' +
          '</div>' +
          costNote('1 XP per sense. Add a separate entry for each.')
        );
      },
      readData: function() {
        var polarity = pfVal('pf-sense-polarity');
        var desc     = pfVal('pf-sense-desc').trim();
        return { level: 1, notes: polarity + (desc ? ' | ' + desc : '') };
      },
      onInput: function() {}
    },

    // Polarity Attunement: one consolidated entry for all attuned polarities
    'Polarity Attunement': {
      buildContent: function(data) {
        var selected = (data.notes || '').split(',').filter(Boolean).map(function(p) { return p.trim(); });
        return (
          descBlock('Choose one or more polarities you own. Each is treated as belonging to a value one rank higher for all purposes. Each polarity costs 1 XP.') +
          '<div class="field mt-md">' +
            '<label>Polarities to attune</label>' +
            '<div class="pf-polarity-list">' + polarityCheckboxes(selected, 'pf-polarity-sel') + '</div>' +
          '</div>' +
          costNote('1 XP per polarity.')
        );
      },
      readData: function() {
        var checked = [];
        document.querySelectorAll('#passive-modal-content input[name="pf-polarity-sel"]:checked').forEach(function(cb) {
          if (cb.value) checked.push(cb.value);
        });
        return { level: checked.length, notes: checked.join(',') };
      },
      onInput: function() {}
    },

    'Undetected Awareness': {
      buildContent: function(data) {
        var parts    = (data.notes || '').split(' | ');
        var state    = (parts[0] || '').trim() || 'Extended';
        var selPols  = (parts[1] || '').split(',').filter(Boolean).map(function(p) { return p.trim(); });
        return (
          descBlock('One state of your Awareness is only detectable to those who share specific polarities you choose. Multiple polarities can be required — a detector needs all of them to find you.') +
          '<div class="field mt-md">' +
            '<label for="pf-uda-state">Awareness State</label>' +
            '<select id="pf-uda-state">' + awarenessOpts(state) + '</select>' +
          '</div>' +
          '<div class="field mt-sm">' +
            '<label>Detectable only by those with polarity:</label>' +
            '<div class="pf-polarity-list">' + polarityCheckboxes(selPols, 'pf-uda-pol') + '</div>' +
          '</div>' +
          costNote('1 XP per instance. Add a separate entry for each Awareness State.')
        );
      },
      readData: function() {
        var state   = pfVal('pf-uda-state');
        var checked = [];
        document.querySelectorAll('#passive-modal-content input[name="pf-uda-pol"]:checked').forEach(function(cb) {
          if (cb.value) checked.push(cb.value);
        });
        var pols = checked.join(',');
        return { level: 1, notes: pols ? (state + ' | ' + pols) : state };
      },
      onInput: function() {}
    },

  }; // end PASSIVE_FORMS

  // ─── Fallback for custom passives ────────────────────────────

  const CUSTOM_FORM = {
    buildContent: function(data) {
      var l = data.level || 1;
      return (
        '<div class="cols-2">' +
          levelFields(l, null) +
          '<div class="field"></div>' +
        '</div>' +
        '<div class="field mt-sm">' +
          '<label for="pf-notes">Notes</label>' +
          '<input type="text" id="pf-notes" value="' + esc(data.notes || '') + '" placeholder="Configuration details">' +
        '</div>'
      );
    },
    readData: function() { return { level: pfLevel(), notes: pfVal('pf-notes').trim() }; },
    onInput:  function() {}
  };

  // ─── Public API ───────────────────────────────────────────────

  function init(onUpdate) {
    _onUpdate = onUpdate;
    document.getElementById('btn-add-passive').addEventListener('click', openModalForNew);
    document.getElementById('btn-passive-modal-close').addEventListener('click', closeModal);
    document.getElementById('btn-passive-modal-cancel').addEventListener('click', closeModal);
    document.getElementById('btn-passive-modal-save').addEventListener('click', saveFromModal);
    document.getElementById('passive-modal').addEventListener('click', handleOverlayClick);
    document.getElementById('passive-modal-name-select').addEventListener('change', handleModalNameChange);
    document.getElementById('passive-modal-content').addEventListener('input', handleContentInput);
    document.getElementById('passives-list').addEventListener('click', handleListClick);
  }

  function render(character) {
    _buildupState = {}; // reset ephemeral state on character load

    _characterPolarities = [];
    (character.values || []).forEach(function(v) {
      (v.polarities || []).forEach(function(pol) {
        if (pol.name && pol.name.trim()) _characterPolarities.push(pol.name.trim());
      });
    });

    var raw = (character.passiveAbilities || []).map(function(p) {
      return { id: p.id, name: p.name, level: p.level, notes: p.notes };
    });

    // Consolidate legacy multi-entry Polarity Attunement into one entry
    var paEntries = raw.filter(function(p) { return p.name === 'Polarity Attunement'; });
    if (paEntries.length > 1) {
      var pols = paEntries.map(function(p) { return p.notes || ''; }).filter(Boolean);
      raw = raw.filter(function(p) { return p.name !== 'Polarity Attunement'; });
      raw.push({ id: paEntries[0].id, name: 'Polarity Attunement', level: pols.length, notes: pols.join(',') });
    }

    _passives = raw;
    renderList();
  }

  function read() {
    return { passiveAbilities: _passives };
  }

  // ─── List rendering ───────────────────────────────────────────

  function renderList() {
    var list = document.getElementById('passives-list');
    if (_passives.length === 0) {
      list.innerHTML = '<p class="passive-empty">No passive abilities</p>';
      return;
    }
    list.innerHTML = _passives.map(function(p) {
      var name    = p.name || 'Unnamed';
      var noEdit  = NO_EDIT_PASSIVES[name];
      var details = rowDetails(p);
      var editBtn = noEdit
        ? ''
        : '<button class="btn btn-sm passive-edit-btn" type="button">Edit</button>';
      return (
        '<div class="passive-row' + (noEdit ? ' passive-row-no-edit' : '') + '" data-id="' + esc(p.id) + '">' +
          '<span class="passive-row-name">' + esc(name) + '</span>' +
          details +
          editBtn +
          '<button class="btn-icon passive-delete-btn" type="button" aria-label="Remove">\u00d7</button>' +
        '</div>'
      );
    }).join('');
  }

  // ─── List event handler ───────────────────────────────────────

  function handleListClick(e) {
    var row = e.target.closest('.passive-row');
    if (!row) return;
    var id = row.dataset.id;

    if (e.target.closest('.buildup-step-btn')) {
      var step = _buildupState[id] || 0;
      _buildupState[id] = Math.min(step + 1, 4);
      renderList();
      return;
    }

    if (e.target.closest('.buildup-use-btn')) {
      _buildupState[id] = 0;
      renderList();
      return;
    }

    if (e.target.closest('.passive-delete-btn')) {
      delete _buildupState[id];
      _passives = _passives.filter(function(p) { return p.id !== id; });
      _onUpdate();
      renderList();
      return;
    }

    if (e.target.closest('.passive-edit-btn')) {
      var passive = _passives.find(function(p) { return p.id === id; });
      if (passive) openModalForEdit(passive);
    }
  }

  // ─── Modal ────────────────────────────────────────────────────

  function buildSelectOptions() {
    var options = Schema.PASSIVE_ABILITIES.map(function(p) {
      return '<option value="' + esc(p.name) + '">' + esc(p.name) + '</option>';
    }).join('');
    options += '<option value="_custom">Custom\u2026</option>';
    document.getElementById('passive-modal-name-select').innerHTML = options;
  }

  function populateContent(name, data) {
    var isCustom = name === '_custom';
    var form = isCustom ? CUSTOM_FORM : (PASSIVE_FORMS[name] || CUSTOM_FORM);
    _currentForm = form;
    document.getElementById('passive-modal-content').innerHTML = form.buildContent(data || { level: 1, notes: '' });
  }

  function openModalForNew() {
    _editingId = null;
    document.getElementById('passive-modal-title').textContent   = 'Add Passive Ability';
    document.getElementById('btn-passive-modal-save').textContent = 'Add';
    document.getElementById('passive-modal-name-row').hidden      = false;
    document.getElementById('passive-modal-custom-wrap').hidden   = true;
    buildSelectOptions();
    var defaultName = Schema.PASSIVE_ABILITIES[0].name;
    document.getElementById('passive-modal-name-select').value = defaultName;
    document.getElementById('passive-modal-name-custom').value  = '';

    // If adding Polarity Attunement and an entry already exists, pre-populate with its data
    var existingPa = _passives.find(function(p) { return p.name === 'Polarity Attunement'; });
    populateContent(defaultName, existingPa && defaultName === 'Polarity Attunement' ? existingPa : { level: 1, notes: '' });
    document.getElementById('passive-modal').hidden = false;
  }

  function openModalForEdit(passive) {
    _editingId = passive.id;
    document.getElementById('passive-modal-title').textContent   = passive.name;
    document.getElementById('btn-passive-modal-save').textContent = 'Save';
    var meta     = getMeta(passive.name);
    var isCustom = !meta;
    document.getElementById('passive-modal-name-row').hidden    = !isCustom;
    document.getElementById('passive-modal-custom-wrap').hidden = !isCustom;
    buildSelectOptions();
    var selectVal = isCustom ? '_custom' : passive.name;
    document.getElementById('passive-modal-name-select').value = selectVal;
    document.getElementById('passive-modal-name-custom').value  = isCustom ? (passive.name || '') : '';
    populateContent(selectVal, passive);
    document.getElementById('passive-modal').hidden = false;
  }

  function closeModal() {
    document.getElementById('passive-modal').hidden = true;
    _editingId   = null;
    _currentForm = null;
  }

  function handleOverlayClick(e) {
    if (e.target === document.getElementById('passive-modal')) closeModal();
  }

  function handleModalNameChange() {
    var val = document.getElementById('passive-modal-name-select').value;
    document.getElementById('passive-modal-custom-wrap').hidden = val !== '_custom';
    if (val === '_custom') document.getElementById('passive-modal-name-custom').focus();
    // Pre-populate PA with existing entry data when switching to it
    var data = { level: 1, notes: '' };
    if (val === 'Polarity Attunement') {
      var existing = _passives.find(function(p) { return p.name === 'Polarity Attunement'; });
      if (existing) data = existing;
    }
    populateContent(val, data);
  }

  function handleContentInput() {
    if (_currentForm && _currentForm.onInput) _currentForm.onInput();
  }

  function saveFromModal() {
    if (!_currentForm) return;
    var selectVal = document.getElementById('passive-modal-name-select').value;
    var name = selectVal === '_custom'
      ? pfVal('passive-modal-name-custom').trim()
      : selectVal;
    if (!name) return;

    var data  = _currentForm.readData();

    // Polarity Attunement: always find-or-create a single consolidated entry
    if (name === 'Polarity Attunement') {
      if (data.level === 0) { closeModal(); return; } // nothing checked
      var existingIdx = _passives.findIndex(function(p) { return p.name === 'Polarity Attunement'; });
      if (existingIdx !== -1) {
        _passives[existingIdx] = { id: _passives[existingIdx].id, name: 'Polarity Attunement', level: data.level, notes: data.notes };
      } else {
        _passives.push({ id: Schema.newId(), name: 'Polarity Attunement', level: data.level, notes: data.notes });
      }
      closeModal();
      _onUpdate();
      renderList();
      return;
    }

    var entry = {
      id:    _editingId !== null ? _editingId : Schema.newId(),
      name:  name,
      level: data.level,
      notes: data.notes,
    };
    if (_editingId === null) {
      _passives.push(entry);
    } else {
      var idx = _passives.findIndex(function(p) { return p.id === _editingId; });
      if (idx !== -1) _passives[idx] = entry;
    }
    closeModal();
    _onUpdate();
    renderList();
  }

  return { init, render, read };

})();
