// app.js
// Orchestrator. Holds character state, coordinates modules, manages file I/O.
// Section-specific logic belongs in modules/, not here.
// Relies on globals: Schema, FileIO, Identity (loaded via <script> tags in index.html)

// ─── State ────────────────────────────────────────────────────

let character = Schema.blankCharacter();
let isDirty   = false;

// ─── Module coordination ──────────────────────────────────────
// Add one line per module to each function as features are built.

function mergeFromModules() {
  Object.assign(character, Identity.read());
  Object.assign(character, Values.read());
  Object.assign(character, Awareness.read());
  Object.assign(character, Stride.read());
  Object.assign(character, Armor.read());
  Object.assign(character, Strain.read());
  Object.assign(character, Conditions.read());
  Object.assign(character, ActiveAbilities.read());
}

function renderModules() {
  Identity.render(character);
  Values.render(character);
  Awareness.render(character);
  Stride.render(character);
  Armor.render(character);
  Strain.render(character);
  Conditions.render(character);
  ActiveAbilities.render(character);
}

// ─── Unsaved indicator ────────────────────────────────────────

function setDirty(dirty) {
  isDirty = dirty;
  document.getElementById('unsaved-dot').hidden = !dirty;
}

// ─── Update callback (called by every module on user input) ───

function onUpdate() {
  mergeFromModules();
  renderModules();
  setDirty(true);
}

// ─── File operations ──────────────────────────────────────────

function handleNew() {
  if (isDirty && !confirm('You have unsaved changes. Start a new character anyway?')) return;
  character = Schema.blankCharacter();
  renderModules();
  setDirty(false);
}

function handleLoad(loaded) {
  character = loaded;
  renderModules();
  setDirty(false);
}

// ─── Theme ────────────────────────────────────────────────────

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  document.getElementById('btn-theme').textContent = theme === 'dark' ? '☀' : '☽';
  localStorage.setItem('theme', theme);
}

function initTheme() {
  const saved = localStorage.getItem('theme');
  if (saved) {
    applyTheme(saved);
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(prefersDark ? 'dark' : 'light');
  }
}

document.getElementById('btn-theme').addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  applyTheme(current === 'dark' ? 'light' : 'dark');
});

// ─── Init ─────────────────────────────────────────────────────

initTheme();

FileIO.init({
  onNew:        handleNew,
  onLoad:       handleLoad,
  getCharacter: () => character,
  onSaved:      () => setDirty(false),
});

Identity.init(onUpdate);
Values.init(onUpdate);
Awareness.init(onUpdate);
Stride.init(onUpdate);
Armor.init(onUpdate);
Strain.init(onUpdate);
Conditions.init(onUpdate);
ActiveAbilities.init(onUpdate, function(cost) {
  var strainMax = Schema.calcStrainMax(
    (character.identity || {}).realm || 0,
    (character.strain || {}).xpInvested || 0
  );
  character.strain.current = Math.min((character.strain.current || 0) + cost, strainMax);
  renderModules();
  setDirty(true);
  flashStrainSection(cost);
});

let _snackbarTimer = null;

function flashStrainSection(cost) {
  var section = document.getElementById('section-strain');
  if (section) {
    section.classList.remove('strain-flash');
    void section.offsetWidth; // force reflow to restart animation
    section.classList.add('strain-flash');
    section.addEventListener('animationend', function() {
      section.classList.remove('strain-flash');
    }, { once: true });
  }

  var snackbar = document.getElementById('snackbar');
  if (!snackbar) return;
  snackbar.textContent = '+' + cost + ' strain';
  snackbar.classList.add('snackbar-visible');
  clearTimeout(_snackbarTimer);
  _snackbarTimer = setTimeout(function() {
    snackbar.classList.remove('snackbar-visible');
  }, 2000);
}
renderModules();
