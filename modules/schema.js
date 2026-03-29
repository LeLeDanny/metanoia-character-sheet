// schema.js
// Single source of truth for all game constants, valid values, and derived calculations.
// Exposes a single global: Schema

const Schema = (() => {

  // ─── Enumerations ──────────────────────────────────────────

  const LINEAGES = ['Anamor', 'Daruner', 'Elkyr', 'Haqol', 'Janim', 'Nyl', 'Okoi'];

  const REALM_NAMES = {
    0: 'Void', 1: 'Spark', 2: 'Flame', 3: 'Star', 4: 'Constellation', 5: 'Galaxy',
  };

  const ARMOR_MATERIALS = {
    none:    { label: 'None',    as: 0 },
    cloth:   { label: 'Cloth',   as: 0 },
    leather: { label: 'Leather', as: 1 },
    amalgam: { label: 'Amalgam', as: 2 },
    half:    { label: 'Half',    as: 3 },
    scale:   { label: 'Scale',   as: 4 },
    splint:  { label: 'Splint',  as: 5 },
    plate:   { label: 'Plate',   as: 6 },
  };

  // Ordered by base d8 hit result (1=Head, 2-3=Arms, 4-5=Legs, 6-8=Center)
  const HIT_LOCATIONS = ['head', 'arms', 'legs', 'center'];

  const AWARENESS_STATES = {
    cloaked:  { label: 'Cloaked / Suppressed' },
    extended: { label: 'Extended' },
    focused:  { label: 'Focused' },
  };

  const INTENTS = [
    'Know', 'Hide', 'Convince', 'Create', 'Recover', 'Seize',
    'Dodge', 'Guard', 'Harm', 'Condition', 'Teleport', 'Move', 'Cast[X]',
  ];

  const DURATION_TYPES = {
    sparked:    { label: 'Sparked',    complexity: 0 },
    maintained: { label: 'Maintained', complexity: 1 },
    charged:    { label: 'Charged',    complexity: 2 },
    stabilized: { label: 'Stabilized', complexity: 3 },
  };

  const DURATION_FRAMES = {
    exchange:    { label: 'Exchange',    complexity: 1 },
    encounter:   { label: 'Encounter',   complexity: 2 },
    engagement:  { label: 'Engagement',  complexity: 3 },
    exploration: { label: 'Exploration', complexity: 4 },
    expedition:  { label: 'Expedition',  complexity: 5 },
    permanent:   { label: 'Permanent',   complexity: 6 },
  };

  const AREA_SIZES = {
    none:     { label: 'N/A',        complexity: 0 },
    targets3: { label: '3 Targets',  complexity: 1 },
    d2:       { label: '2D',         complexity: 2 },
    d3:       { label: '3D',         complexity: 3 },
  };

  const AREA_RADII = {
    none:      { label: 'N/A',           complexity: 0 },
    band2:     { label: 'Band 2',        complexity: 1 },
    band3:     { label: 'Band 3',        complexity: 2 },
    band4zone: { label: 'Band 4 / Zone', complexity: 3 },
    band56:    { label: 'Band 5-6',      complexity: 4 },
  };

  const ABILITY_TYPES = {
    effect:    { label: 'Effect or Projectile', complexity: 0 },
    construct: { label: 'Construct',            complexity: 1 },
  };

  const FAVOR_TYPES = ['Local Faction', 'Personal', 'Organizational'];

  const PASSIVE_ABILITY_NAMES = [
    'Circulation', 'Resistant', 'Juggernaut', 'Advanced Awareness', 'Stability',
    'Advanced Sense', 'Never at Loss', 'Armored Aura', 'Freedom of Movement',
    'Unconstrained Mind', 'Focused Execution', 'Undetected Awareness', 'Buildup',
    'No Damage, All Condition', 'Shared Assurance', 'Self-Sustaining Summons',
    'All Condition, No Strain', 'Item Proficiency',
  ];

  // Theridim (Emergence) unlocks when all 7 base lineages are present.
  const LINEAGE_POLARITIES = {
    Anamor:   'Conversion',
    Daruner:  'Coalescence',
    Elkyr:    'Flux',
    Haqol:    'Harmony',
    Janim:    'Elasticity',
    Nyl:      'Influence',
    Okoi:     'Recurrence',
    Theridim: 'Emergence',
  };

  const VALUE_RANK_DIE = { 1: 'd4', 2: 'd6', 3: 'd8', 4: 'd10' };

  const POLARITIES_BY_CATEGORY = [
    { category: 'Emotions', entries: [
      { name: 'Anger',    description: 'Directed aggression seeking forceful change.' },
      { name: 'Sorrow',   description: 'Grief that weighs and endures.' },
      { name: 'Joy',      description: 'Expansive positive vitality.' },
      { name: 'Surprise', description: 'Sudden disruption of expectation.' },
      { name: 'Disgust',  description: 'Instinctive rejection and separation.' },
      { name: 'Fear',     description: 'Anticipation of harm driving caution.' },
    ]},
    { category: 'Principles', entries: [
      { name: 'Space',      description: 'Distance, dimensional positioning.' },
      { name: 'Thought',    description: 'Cognitive processing and reasoning.' },
      { name: 'Life',       description: 'Animating vitality and persistence.' },
      { name: 'Death',      description: 'Finality, cessation, release.' },
      { name: 'Severance',  description: 'Clean separation of what was joined.' },
      { name: 'Piercing',   description: 'Focused penetration through resistance.' },
      { name: 'Trajectory', description: 'Directed path across space.' },
      { name: 'Division',   description: 'Splitting into distinct parts.' },
      { name: 'Ruin',       description: 'Structural degradation or collapse.' },
      { name: 'Growth',     description: 'Increase in scale or complexity.' },
      { name: 'Secrets',    description: 'Concealed knowledge or truth.' },
      { name: 'Conflict',   description: 'Active opposition producing change.' },
      { name: 'Illusion',   description: 'Distorted or false perception.' },
      { name: 'Protection', description: 'Prevention or mitigation of harm.' },
      { name: 'Order',      description: 'Structured predictability.' },
      { name: 'Randomness', description: 'Unpredictable outcome.' },
    ]},
    { category: 'Loci', entries: [
      { name: 'Sea',      description: 'Vast, deep, shifting waters.' },
      { name: 'Sky',      description: 'Open aerial expanse.' },
      { name: 'Forest',   description: 'Dense, interconnected life system.' },
      { name: 'Desert',   description: 'Scarcity and harsh exposure.' },
      { name: 'Mountain', description: 'Immovable elevated mass.' },
    ]},
    { category: 'Mores', entries: [
      { name: 'Truth',      description: 'Alignment with reality.' },
      { name: 'Deceit',     description: 'Intentional distortion of belief.' },
      { name: 'Redemption', description: 'Restoration after moral failure.' },
      { name: 'Corruption', description: 'Twisting decay of integrity.' },
      { name: 'Mercy',      description: 'Compassion overriding punishment.' },
      { name: 'Judgement',  description: 'Assignment of consequence.' },
      { name: 'Pride',      description: 'Elevation of self-worth.' },
      { name: 'Humility',   description: 'Lowering of self in perspective.' },
    ]},
    { category: 'Cives', entries: [
      { name: 'Infrastructure', description: 'Foundational support frameworks.' },
      { name: 'Art',            description: 'Expressive cultural creation.' },
      { name: 'Assembly',       description: 'Organized construction from parts.' },
      { name: 'Mechanisms',     description: 'Functional engineered motion.' },
      { name: 'Computation',    description: 'Logical processing systems.' },
      { name: 'Systems',        description: 'Interdependent structured networks.' },
    ]},
    { category: 'Elements', entries: [
      { name: 'Animals', description: 'Instinct-driven living beings.' },
      { name: 'Blood',   description: 'Vital lineage and life-fluid.' },
      { name: 'Poison',  description: 'Toxic internal corruption.' },
      { name: 'Sound',   description: 'Vibrational energy through medium.' },
      { name: 'Wind',    description: 'Moving air force.' },
      { name: 'Cloud',   description: 'Suspended vapor mass.' },
      { name: 'Plants',  description: 'Rooted organic growth.' },
      { name: 'Spirit',  description: 'Non-material animating essence.' },
      { name: 'Remains', description: 'Ash, bone, physical residue.' },
    ]},
    { category: 'Interstitials', entries: [
      { name: 'Bonds',      description: 'Connections that link entities.' },
      { name: 'Names',      description: 'Identity given form and power.' },
      { name: 'Writing',    description: 'Inscribed persistent meaning.' },
      { name: 'Dreams',     description: 'Subconscious symbolic space.' },
      { name: 'Comfort',    description: 'Felt safety and reassurance.' },
      { name: 'Relaxation', description: 'Release of tension.' },
      { name: 'Agony',      description: 'Intense acute suffering.' },
      { name: 'Suffering',  description: 'Sustained hardship over time.' },
    ]},
    { category: 'Seasons', entries: [
      { name: 'Spring', description: 'Renewal and emergence.' },
      { name: 'Summer', description: 'Peak vitality and intensity.' },
      { name: 'Fall',   description: 'Decline and harvest.' },
      { name: 'Winter', description: 'Dormancy and preservation.' },
    ]},
    { category: 'Forces', entries: [
      { name: 'Gravity',          description: 'Attraction and weight.' },
      { name: 'Heat',             description: 'Energetic excitation and combustion.' },
      { name: 'Light',            description: 'Illumination and revelation.' },
      { name: 'Electromagnetism', description: 'Charge-based attraction and repulsion.' },
      { name: 'Kinetics',         description: 'Motion and momentum transfer.' },
    ]},
    { category: 'Materials', entries: [
      { name: 'Earth', description: 'Natural stone and soil.' },
      { name: 'Metal', description: 'Refined durable matter.' },
      { name: 'Water', description: 'Fluid cohesive substance.' },
      { name: 'Wood',  description: 'Organic structural material.' },
      { name: 'Glass', description: 'Transparent brittle solid.' },
    ]},
    { category: 'Inversions', entries: [
      { name: 'Shadow', description: 'Absence or obstruction of light.' },
      { name: 'Cold',   description: 'Absence of heat.' },
      { name: 'Void',   description: 'Absence of substance or presence.' },
    ]},
    { category: 'States', entries: [
      { name: 'Solid',  description: 'Fixed structural form.' },
      { name: 'Liquid', description: 'Flowing cohesive form.' },
      { name: 'Gas',    description: 'Diffuse expansive form.' },
      { name: 'Plasma', description: 'Energized unstable matter.' },
    ]},
    { category: 'Archetypes', entries: [
      { name: 'Adjudicator', description: 'Judgment, arbitration. Verdicts, bindings, conditional effects.' },
      { name: 'King',        description: 'Sovereignty, command. Hierarchy, authority, loyalty.' },
      { name: 'Slayer',      description: 'Precision elimination of specific targets. Marked enemies.' },
      { name: 'Destroyer',   description: 'Annihilation. Breaks structures, shatters defenses. Catastrophic.' },
      { name: 'Healer',      description: 'Restoration, renewal. Repairs bodies, systems, states.' },
      { name: 'Caster',      description: 'Deliberate projection. Structured, ranged, controlled.' },
      { name: 'Marksman',    description: 'Ranged precision. Single-target, trajectory mastery.' },
      { name: 'Hunter',      description: 'Pursuit, inevitability. Tracking, marking, cornering.' },
      { name: 'Seer',        description: 'Perception beyond the present. Truth, patterns, future, hidden forces.' },
      { name: 'Paladin',     description: 'Righteous force. Offensive power justified by oath or value.' },
      { name: 'Priest',      description: 'Devotion, intercession. Buffing, warding, invoking.' },
      { name: 'Berserker',   description: 'Unleashed fury. Escalates through damage or emotion. Trades control for force.' },
      { name: 'Warrior',     description: 'Disciplined combat mastery. Balanced, reliable, adaptable.' },
      { name: 'Soldier',     description: 'Formation, coordination. Stronger in squads and systems. Group warfare.' },
      { name: 'Monk',        description: 'Internal mastery. Body, breath, awareness producing precise force.' },
      { name: 'Swordsman',   description: 'Dueling precision. Timing, counters, clean strikes. One-on-one.' },
      { name: 'Spearman',    description: 'Reach, space control. Punishes entry, dominates approach vectors.' },
      { name: 'Alchemist',   description: 'Transformation of substances. Reactive and catalytic effects.' },
      { name: 'Inventor',    description: 'Engineered solutions. Tools, mechanisms, devices. Preparation.' },
      { name: 'Blacksmith',  description: 'Forging, reinforcement. Strengthens materials, enhances gear.' },
      { name: 'Scientist',   description: 'Systematic understanding. Hypotheses, laws, optimization.' },
      { name: 'Merchant',    description: 'Exchange, leverage. Trades, manipulates value, exploits scarcity.' },
      { name: 'Carpenter',   description: 'Structural assembly. Frameworks, supports, platforms.' },
      { name: 'Architect',   description: 'Large-scale design. Spaces, systems, long-term structures. Blueprints.' },
    ]},
  ];

  const BASELINE_VALUES = [
    { name: 'Love / Sacrifice', description: 'Deep bonds. The willingness to give what matters for others.' },
    { name: 'Faith',            description: 'Devotion, belief in something greater, spiritual conviction.' },
    { name: 'Knowledge',        description: 'Truth, learning, understanding, curiosity.' },
    { name: 'Order',            description: 'Law, codes, hierarchy, structure, discipline, authority.' },
    { name: 'Justice / Honor',  description: 'Righting wrongs. Accountability. Consequences for harm.' },
    { name: 'Growth',           description: 'Self-improvement, mastery, innovation, becoming more.' },
    { name: 'Freedom',          description: 'Autonomy, independence, rejecting control or imposed identity.' },
    { name: 'Power',            description: 'Strength, dominance, ambition, status, legacy.' },
    { name: 'Peace',            description: 'Harmony, de-escalation, balance, preservation of stability.' },
    { name: 'Tradition',        description: 'Ancestral ways, superstition, cultural continuity, inherited wisdom.' },
    { name: 'Beauty',           description: 'Aesthetic creation, expression, refinement, artistic pursuit.' },
    { name: 'Wealth',           description: 'Material gain, assets, financial power.' },
  ];

  // Die granted by XP level for lineage polarities (level 0 = baseline d20)
  const LINEAGE_POLARITY_DIE = { 0: 'd20', 1: 'd12', 2: 'd10', 3: 'd8', 4: 'd6', 5: 'd4' };

  // Die granted by XP level in most other contexts (level 0 = nothing)
  const STANDARD_XP_DIE = { 0: null, 1: 'd12', 2: 'd10', 3: 'd8', 4: 'd6', 5: 'd4' };

  // ─── Derived calculations ───────────────────────────────────

  function calcStrainMax(realm, xpInvestedInStrain) {
    return 4 + 2 * (realm + xpInvestedInStrain);
  }

  function calcStride(xpInvestedInStride) {
    return 2 + xpInvestedInStride;
  }

  function calcAwarenessRange(xpInvestedInAwareness) {
    return 3 + xpInvestedInAwareness;
  }

  function calcStartingFavor(realm) {
    return 2 + realm;
  }

  function calcAbilityComplexity(ability) {
    const intentCount   = (ability.intents ?? []).length;
    const durationType  = (DURATION_TYPES[ability.durationType]  || {}).complexity ?? 0;
    const durationFrame = (DURATION_FRAMES[ability.durationFrame] || {}).complexity ?? 0;
    const area          = (AREA_SIZES[ability.area]               || {}).complexity ?? 0;
    const areaRadius    = (AREA_RADII[ability.areaRadius]         || {}).complexity ?? 0;
    const type          = (ABILITY_TYPES[ability.type]            || {}).complexity ?? 0;
    return intentCount + durationType + durationFrame + area + areaRadius + type;
  }

  function calcAbilityRealm(complexity) {
    return Math.floor(complexity / 2);
  }

  function calcCastCost(abilityRealm, characterRealm) {
    const diff = abilityRealm - characterRealm;
    if (diff <= -2) return 0;
    if (diff === -1) return 1;
    if (diff === 0)  return 2;
    return 4;
  }

  function calcXpSpent(character) {
    const strainXp    = (character.strain    || {}).xpInvested ?? 0;
    const strideXp    = (character.stride    || {}).xpInvested ?? 0;
    const awarenessXp = (character.awareness || {}).xpInvested ?? 0;
    const lineageXp   = ((character.identity || {}).lineages ?? [])
      .reduce((sum, l) => sum + (l.level ?? 0), 0);
    const passiveXp   = (character.passiveAbilities ?? [])
      .reduce((sum, p) => sum + (p.level ?? 0), 0);
    return strainXp + strideXp + awarenessXp + lineageXp + passiveXp;
  }

  // ─── ID generation ─────────────────────────────────────────

  function newId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  }

  // ─── Blank character factory ────────────────────────────────

  function blankCharacter() {
    return {
      meta:     { schemaVersion: 1, lastSaved: null },
      identity: { name: '', lineages: [], realm: 0, xpTotal: 0 },
      values: [
        { rank: 1, name: '', polarities: [] },
        { rank: 2, name: '', polarities: [] },
        { rank: 3, name: '', polarities: [] },
        { rank: 4, name: '', polarities: [] },
      ],
      strain:           { current: 0, xpInvested: 0 },
      wounded:          false,
      conditions:       [],
      armor: {
        head:      { as: 0, absorbed: 0 },
        shoulders: { as: 0, absorbed: 0 },
        wrists:    { as: 0, absorbed: 0 },
        legs:      { as: 0, absorbed: 0 },
        feet:      { as: 0, absorbed: 0 },
        center:    { as: 0, absorbed: 0 },
        aura:         { absorbed: 0 },
        environmental: { hot: false, cold: false, decay: false, electric: false },
      },
      stride:           { xpInvested: 0 },
      awareness:        { xpInvested: 0, state: 'suppressed' },
      activeAbilities:  [],
      passiveAbilities: [],
      favor:            [],
      notes:            '',
    };
  }

  // ─── Public API ─────────────────────────────────────────────

  return {
    LINEAGES, REALM_NAMES, ARMOR_MATERIALS, HIT_LOCATIONS,
    AWARENESS_STATES, INTENTS, DURATION_TYPES, DURATION_FRAMES,
    AREA_SIZES, AREA_RADII, ABILITY_TYPES, FAVOR_TYPES,
    PASSIVE_ABILITY_NAMES, LINEAGE_POLARITIES,
    VALUE_RANK_DIE, BASELINE_VALUES, POLARITIES_BY_CATEGORY,
    LINEAGE_POLARITY_DIE, STANDARD_XP_DIE,
    calcStrainMax, calcStride, calcAwarenessRange, calcStartingFavor,
    calcAbilityComplexity, calcAbilityRealm, calcCastCost, calcXpSpent,
    newId, blankCharacter,
  };
})();
