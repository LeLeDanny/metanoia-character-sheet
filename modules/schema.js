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

  const INTENTS = {
    harm:      { label: 'Harm',          strain: 1, description: 'Deal damage' },
    guard:     { label: 'Guard',         strain: 2, description: 'Protect against an effect, absorb damage' },
    dodge:     { label: 'Dodge',         strain: 2, description: 'Avoid an effect entirely, up to your stride' },
    heal:      { label: 'Heal',          strain: 1, description: 'Repair a wound, clear a condition, stabilize' },
    recover:   { label: 'Recover',       strain: 3, description: 'Enhance Strain recovery during rest' },
    seize:     { label: 'Seize',         strain: 1, description: 'Grab, hold, restrain, immobilize' },
    move:      { label: 'Move',          strain: 1, description: 'Physically displace self up to your stride' },
    displace:  { label: 'Displace',      strain: 1, description: 'Physically displace target' },
    teleport:  { label: 'Teleport',      strain: 2, description: 'Instant relocation' },
    condition: { label: 'Condition [X]', strain: 1, description: 'Apply a status effect or debuff' },
    hide:      { label: 'Hide',          strain: 1, description: 'Conceal something, disguise, obscure' },
    know:      { label: 'Know',          strain: 1, description: 'Gain information, detect, perceive, analyze' },
    convince:  { label: 'Convince',      strain: 1, description: 'Influence a mind, persuade, intimidate, deceive' },
    create:    { label: 'Create',        strain: 0, description: 'Make something from materials' },
    manifest:  { label: 'Manifest',      strain: 1, description: 'Make something without materials' },
    castX:     { label: 'Cast [X]',      strain: 1, description: 'Only for created or manifested things. The creation casts this ability on its own.' },
  };

  const ABILITY_AWARENESS = {
    suppressed: {
      label: 'Suppressed',
      description: 'Originates from your body. Self, touch, or traveling outward.',
      substates: {
        touch: { label: 'Touch', strain: 0, description: 'Self or direct contact' },
        arc:   { label: 'Arc',   strain: 1, description: 'Cone or sweep outward from you' },
        line:  { label: 'Line',  strain: 1, description: 'Beam from you through targets in its path' },
      },
    },
    extended: {
      label: 'Extended',
      description: 'Radiates outward from you in all directions. Radius scales with Realm.',
      substates: {
        aura: { label: 'Aura', strain: 1, description: 'Radial field around you' },
      },
      allowedIntents: ['harm', 'guard', 'move', 'displace', 'heal', 'recover', 'condition', 'hide', 'know', 'convince'],
    },
    focused: {
      label: 'Focused',
      description: 'Targets or manifests at a specific location, entity, or point at range.',
      substates: {
        single:    { label: 'Single',    strain: 1, description: 'One target at range' },
        ricochet:  { label: 'Ricochet',  strain: 2, description: 'Hits a total of 2 targets' },
        chain:     { label: 'Chain',     strain: 3, description: 'Hits a total of 3 targets' },
        narrow:    { label: 'Narrow',    strain: 2, description: 'Around a point at range (radius 1)', dimension: 'r1' },
        wide:      { label: 'Wide',      strain: 3, description: 'Around a point at range (radius 3)', dimension: 'r3' },
        massive:   { label: 'Massive',   strain: 4, description: 'Around a point at range (radius 5)', dimension: 'r5' },
      },
    },
  };

  const DURATIONS = {
    instant:    { label: 'Instant',    strain: 0, description: 'Resolves immediately. One round of action, a single swing, a single moment.' },
    charged:    { label: 'Charged',    strain: 1, description: 'Lies dormant until triggered, activates once, then disappears.' },
    sustained:  { label: 'Sustained',  strain: 1, description: 'Lasts a frame. A tavern negotiation, a battle, a chase through the streets.' },
    persistent: { label: 'Persistent', strain: 2, description: 'Lasts across multiple scenes, a stretch of travel, or longer.' },
    permanent:  { label: 'Permanent',  strain: 4, description: 'Until destroyed or dispelled. Outlasts the caster.' },
  };

  const CONDITIONS = {
    weakened:           { label: 'Weakened',            hasDetail: false, description: 'Enemy die steps down by strain value' },
    maimed:             { label: 'Maimed',              hasDetail: false, description: 'Disables abilities equal to strain value' },
    escalating:         { label: 'Escalating',          hasDetail: true,  detailPlaceholder: 'e.g. Burning, Bleeding', description: 'Loses strain equal to condition value each round' },
    sensoryDeprivation: { label: 'Sensory Deprivation', hasDetail: true,  detailPlaceholder: 'e.g. Sight, Hearing',   description: 'Blocks senses equal to strain value; rolls using blocked senses lose a die' },
    slowed:             { label: 'Slowed',              hasDetail: false, description: 'Stride reduced by strain value' },
    custom:             { label: 'Custom',              hasDetail: true,  detailPlaceholder: 'Condition name',         description: 'A custom condition' },
  };

  const MAX_ACTIVE_ABILITIES = 20;

  const FAVOR_TYPES = ['Local Faction', 'Personal', 'Organizational'];

  const FAVOR_STATUSES = [
    { value: 'Good terms, good health',        label: 'Good terms, good health' },
    { value: 'They hate you, but in good health', label: 'They hate you, but in good health' },
    { value: 'Far away by choice',             label: 'Far away by choice' },
    { value: 'Addiction',                      label: 'Addiction' },
    { value: 'Crippled',                       label: 'Crippled' },
    { value: 'Taken or disappeared',           label: 'Taken or disappeared' },
    { value: 'Ruined or debt-bound',           label: 'Ruined or debt-bound' },
    { value: 'Broken mind',                    label: 'Broken mind' },
    { value: 'Imprisoned',                     label: 'Imprisoned' },
    { value: 'Killed in war',                  label: 'Killed in war' },
    { value: 'Fatal accident or disease',      label: 'Fatal accident or disease' },
    { value: 'Murdered, killer unknown',       label: 'Murdered, killer unknown' },
    { value: 'Murdered, you know who',         label: 'Murdered, you know who' },
    { value: 'You caused their death',         label: 'You caused their death' },
  ];

  const FAVOR_FACTION_STATUSES = [
    { value: 'Tolerated',          label: 'Tolerated — your presence is permitted, not welcomed' },
    { value: 'Hunted',             label: 'Hunted — openly pursued by this faction' },
    { value: 'Secretly Hunted',    label: 'Secretly Hunted — they pursue you without your knowledge' },
    { value: 'Protected',          label: 'Protected — they shelter you from outside threats' },
    { value: 'Secretly Protected', label: 'Secretly Protected — protection is real but not acknowledged' },
    { value: 'Sponsored',          label: 'Sponsored — they support you; return is expected' },
    { value: 'Secretly Sponsored', label: 'Secretly Sponsored — support flows quietly; strings attached' },
    { value: 'Watched',            label: 'Watched — they monitor you without committing either way' },
    { value: 'Independent',        label: 'Independent — no formal ties, no protection' },
    { value: 'Affiliated',         label: 'Affiliated — cooperative, no obligation' },
    { value: 'Secretly Affiliated',label: 'Secretly Affiliated — you work together; the connection is concealed' },
    { value: 'Agent',              label: 'Agent — sent to act on their behalf' },
    { value: 'Secretly an Agent',  label: 'Secretly an Agent — you act for them; your role is hidden' },
    { value: 'Bound',              label: 'Bound — you owe a debt and cannot freely leave' },
    { value: 'Secretly Bound',     label: 'Secretly Bound — a hidden obligation holds you' },
    { value: 'Member',             label: 'Member — you belong and operate under their rules' },
    { value: 'Secretly a Member',  label: 'Secretly a Member — full membership, concealed from outsiders' },
  ];

  const REN_TEXTURES = {
    Tranquil: {
      label:          'Tranquil',
      description:    'Smooth, stable Ren. Rarely produces boons or complications.',
      boons:          'Min only',
      complications:  'Max only',
    },
    Volatile: {
      label:          'Volatile',
      description:    'Unstable but functional. Moderate boon and complication frequency.',
      boons:          'Min, Min+1',
      complications:  'Max\u22121, Max',
    },
    Rampant: {
      label:          'Rampant',
      description:    'Swingy and unruly. Produces boons and complications frequently.',
      boons:          'Min, Min+1, Min+2',
      complications:  'Max\u22122, Max\u22121, Max',
    },
  };

  const DAMAGE_TYPES = [
    { name: 'Heat',     desc: 'Fire, heat, lasers, light — anything from being too hot.' },
    { name: 'Cold',     desc: 'Ice, freezing, and all chilling sources.' },
    { name: 'Electric', desc: 'Electricity and shocking effects.' },
    { name: 'Decay',    desc: 'Poisons, diseases, withering.' },
    { name: 'Mental',   desc: 'Emotional distress, mind tricks, psychic attacks.' },
    { name: 'Sharp',    desc: 'Piercing and slashing, including telekinetic cuts.' },
    { name: 'Blunt',    desc: 'Impacts, falls, clubs, and blunt telekinesis.' },
    { name: 'Physical', desc: 'Covers both Sharp and Blunt damage.',             covers: ['Sharp', 'Blunt'],                            xpPerLevel: 2 },
    { name: 'Ren',      desc: 'Covers any Ren-sourced damage type.',             covers: ['Heat', 'Cold', 'Electric', 'Decay', 'Mental'], xpPerLevel: 5 },
    { name: 'Divine',   desc: 'Existential "holy" damage; may appear as another type.' },
    { name: 'Void',     desc: 'Inexistence, null, entropic damage.' },
    { name: 'Profane',  desc: 'Existential "unholy" damage; may appear as another type.' },
  ];

  // costType: 'flat' = 1 XP once; 'leveled' = 1 XP per level; 'multi-instance' = 1 XP per instance (different target each time)
  // maxLevel: null means no cap
  const PASSIVE_ABILITIES = [
    { name: 'Resistant',               costType: 'leveled',        maxLevel: null },
    { name: 'Juggernaut',              costType: 'flat',           maxLevel: 1    },
    { name: 'Advanced Awareness',      costType: 'leveled',        maxLevel: null },
    { name: 'Stability',               costType: 'leveled',        maxLevel: null },
    { name: 'Advanced Sense',          costType: 'multi-instance', maxLevel: 1    },
    { name: 'Never at Loss',           costType: 'flat',           maxLevel: 1    },
    { name: 'Armored Aura',            costType: 'leveled',        maxLevel: null },
    { name: 'Freedom of Movement',     costType: 'flat',           maxLevel: 1    },
    { name: 'Unconstrained Mind',      costType: 'flat',           maxLevel: 1    },
    { name: 'Focused Execution',       costType: 'flat',           maxLevel: 1    },
    { name: 'Undetected Awareness',    costType: 'multi-instance', maxLevel: 1    },
    { name: 'Buildup',                 costType: 'flat',           maxLevel: 1    },
    { name: 'Shared Assurance',        costType: 'flat',           maxLevel: 1    },
    { name: 'Item Proficiency',        costType: 'leveled',        maxLevel: 5    },
    { name: 'Invigorated',             costType: 'flat',           maxLevel: 1    },
    { name: 'Polarity Attunement',     costType: 'multi-instance', maxLevel: 1    },
    { name: 'No Wound, All Condition', costType: 'flat',           maxLevel: 1    },
    { name: 'Compounding',             costType: 'flat',           maxLevel: 1    },
    { name: 'Relentless Application',  costType: 'flat',           maxLevel: 1    },
    { name: 'Unmeasured Response',     costType: 'leveled',        maxLevel: 5    },
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
      { name: 'Anger',    description: 'Directed aggression seeking forceful change.', spirit: 'Gorrab'      },
      { name: 'Sorrow',   description: 'Grief that weighs and endures.',              spirit: 'Terricen'    },
      { name: 'Joy',      description: 'Expansive positive vitality.',                spirit: 'Sura'        },
      { name: 'Surprise', description: 'Sudden disruption of expectation.',           spirit: 'Zythim'      },
      { name: 'Disgust',  description: 'Instinctive rejection and separation.',       spirit: 'Norfek'      },
      { name: 'Fear',     description: 'Anticipation of harm driving caution.',       spirit: 'Dremok'      },
    ]},
    { category: 'Principles', entries: [
      { name: 'Space',       description: 'Distance, dimensional positioning.',              spirit: 'Xalyr'    },
      { name: 'Thought',     description: 'Cognitive processing and reasoning.',             spirit: 'Veldrit'  },
      { name: 'Life',        description: 'Animating vitality and persistence.',             spirit: 'Aelethi'  },
      { name: 'Death',       description: 'Finality, cessation, release.',                  spirit: 'Morzed'   },
      { name: 'Severance',   description: 'Clean separation of what was joined.',           spirit: 'Kalivar'  },
      { name: 'Piercing',    description: 'Focused penetration through resistance.',        spirit: 'Kalivar'  },
      { name: 'Trajectory',  description: 'Directed path across space.',                    spirit: 'Arkovir'  },
      { name: 'Division',    description: 'Splitting into distinct parts.',                 spirit: 'Kalivar'  },
      { name: 'Ruin',        description: 'Structural degradation or collapse.',            spirit: 'Shirei'   },
      { name: 'Growth',      description: 'Increase in scale or complexity.',              spirit: 'Shirei'   },
      { name: 'Secrets',     description: 'Concealed knowledge or truth.',                  spirit: 'Sorvesh'  },
      { name: 'Conflict',    description: 'Active opposition producing change.',            spirit: 'Cordix'   },
      { name: 'Illusion',    description: 'Distorted or false perception.',                 spirit: 'Perdath'  },
      { name: 'Protection',  description: 'Prevention or mitigation of harm.',             spirit: 'Moridan'  },
      { name: 'Order',       description: 'Structured predictability.',                     spirit: 'Umrido'   },
      { name: 'Randomness',  description: 'Unpredictable outcome.',                         spirit: 'Murinek'  },
      { name: 'Equilibrium', description: 'Balance of opposing forces in stable tension.',  spirit: 'Irdimet'  },
      { name: 'Peace',       description: 'Lack of Conflict.',                              spirit: 'Chalema'  },
    ]},
    { category: 'Loci', entries: [
      { name: 'Sea',      description: 'Vast, deep, shifting waters.',       spirit: 'Marvem'  },
      { name: 'Sky',      description: 'Open aerial expanse.',               spirit: 'Aerlic'  },
      { name: 'Forest',   description: 'Dense, interconnected life system.', spirit: 'Ilvraf'  },
      { name: 'Desert',   description: 'Scarcity and harsh exposure.',       spirit: 'Akhram'  },
      { name: 'Mountain', description: 'Immovable elevated mass.',           spirit: 'Durgoth' },
    ]},
    { category: 'Mores', entries: [
      { name: 'Truth',      description: 'Alignment with reality.',           spirit: 'Ylath'    },
      { name: 'Deceit',     description: 'Intentional distortion of belief.', spirit: 'Thasatur' },
      { name: 'Redemption', description: 'Restoration after moral failure.',  spirit: 'Ylual'    },
      { name: 'Corruption', description: 'Twisting decay of integrity.',      spirit: 'Ingridrid'},
      { name: 'Mercy',      description: 'Compassion overriding punishment.', spirit: 'Ylath'    },
      { name: 'Judgement',  description: 'Assignment of consequence.',        spirit: 'Ylindis'  },
      { name: 'Pride',      description: 'Elevation of self-worth.',          spirit: 'Parthil'  },
      { name: 'Humility',   description: 'Lowering of self in perspective.',  spirit: 'Ylual'    },
      { name: 'Faith',      description: 'Hope in things unseen.',            spirit: 'Ylindis'  },
    ]},
    { category: 'Cives', entries: [
      { name: 'Architecture',  description: 'Design and structure of built space.',              spirit: 'Lunott'  },
      { name: 'Infrastructure', description: 'Foundational support frameworks.',                 spirit: 'Lunott'  },
      { name: 'Art',           description: 'Expressive cultural creation.',                     spirit: 'Vedrali' },
      { name: 'Assembly',      description: 'Organized construction from parts.',                spirit: 'Fothian' },
      { name: 'Mechanisms',    description: 'Functional engineered motion.',                     spirit: 'Olizmur' },
      { name: 'Computation',   description: 'Logical processing systems.',                       spirit: 'Olizmur' },
      { name: 'Systems',       description: 'Interdependent structured networks.',               spirit: 'Olizmur' },
      { name: 'Alchemy',       description: 'Transformation of matter through refined process.', spirit: 'Qetra'   },
      { name: 'Commerce',      description: 'Exchange of value between parties.',                spirit: 'Delanor' },
      { name: 'Carving',       description: 'Removal of material to reveal form.',              spirit: 'Fothian' },
      { name: 'Smithing',      description: 'Shaping of metal through heat and force.',         spirit: 'Fothian' },
      { name: 'Refinement',    description: 'Purification and improvement of raw material.',    spirit: 'Fothian' },
    ]},
    { category: 'Elements', entries: [
      { name: 'Animals', description: 'Instinct-driven living beings.',     spirit: 'Eratra'      },
      { name: 'Blood',   description: 'Vital lineage and life-fluid.',      spirit: 'Lygwithinin' },
      { name: 'Poison',  description: 'Toxins and Venom.',                  spirit: 'Torvipil'    },
      { name: 'Sound',   description: 'Vibrational energy through medium.', spirit: 'Zepharan'    },
      { name: 'Wind',    description: 'Moving air force.',                  spirit: 'Ramasil'     },
      { name: 'Cloud',   description: 'Suspended vapor mass.',              spirit: 'Vaersh'      },
      { name: 'Plants',  description: 'Rooted organic growth.',             spirit: 'Celdirine'   },
      { name: 'Spirit',  description: 'Non-material animating essence.',    spirit: 'Throshon'    },
      { name: 'Remains', description: 'Ash, bone, physical residue.',       spirit: 'Urwek'       },
    ]},
    { category: 'Interstitials', entries: [
      { name: 'Bonds',      description: 'Connections that link entities.',  spirit: 'Caldryp' },
      { name: 'Names',      description: 'Identity given form and power.',   spirit: 'Idrath'  },
      { name: 'Writing',    description: 'Inscribed persistent meaning.',    spirit: 'Batia'   },
      { name: 'Dreams',     description: 'Subconscious symbolic space.',     spirit: 'Nureth'  },
      { name: 'Comfort',    description: 'Felt safety and reassurance.',     spirit: 'Jaquir'  },
      { name: 'Relaxation', description: 'Release of tension.',              spirit: 'Jaquir'  },
      { name: 'Agony',      description: 'Intense acute suffering.',         spirit: 'Zabrik'  },
      { name: 'Suffering',  description: 'Sustained hardship over time.',    spirit: 'Zabrik'  },
    ]},
    { category: 'Seasons', entries: [
      { name: 'Spring', description: 'Renewal and emergence.',       spirit: "V'ri"     },
      { name: 'Summer', description: 'Peak vitality and intensity.', spirit: 'Khaelda'  },
      { name: 'Fall',   description: 'Decline and harvest.',         spirit: 'Morvel'   },
      { name: 'Winter', description: 'Dormancy and preservation.',   spirit: 'Rimdatal' },
    ]},
    { category: 'Forces', entries: [
      { name: 'Gravity',          description: 'Attraction and weight.',                spirit: "Ra'avorn" },
      { name: 'Heat',             description: 'Energetic excitation and combustion.',  spirit: 'Abdithen' },
      { name: 'Light',            description: 'Illumination and revelation.',          spirit: 'Haprox'   },
      { name: 'Electromagnetism', description: 'Charge-based attraction and repulsion.',spirit: 'Chaazid'  },
      { name: 'Kinetics',         description: 'Motion and momentum transfer.',         spirit: 'Kyrveth'  },
    ]},
    { category: 'Materials', entries: [
      { name: 'Earth', description: 'Natural stone and soil.',      spirit: 'Golborod'  },
      { name: 'Metal', description: 'Refined durable matter.',      spirit: 'Talmuriz'  },
      { name: 'Water', description: 'Fluid cohesive substance.',    spirit: 'Irilineth' },
      { name: 'Wood',  description: 'Organic structural material.', spirit: 'Vrikiniel' },
      { name: 'Glass', description: 'Transparent brittle solid.',   spirit: 'Witrex'    },
    ]},
    { category: 'Inversions', entries: [
      { name: 'Shadow', description: 'Absence or obstruction of light.',  spirit: 'Endabras' },
      { name: 'Cold',   description: 'Absence of heat.',                  spirit: 'Hemaesh'  },
      { name: 'Void',   description: 'Absence of substance or presence.', spirit: 'Naethis'  },
    ]},
    { category: 'States', entries: [
      { name: 'Solid',  description: 'Fixed structural form.',      spirit: 'Dorthim'  },
      { name: 'Liquid', description: 'Flowing cohesive form.',      spirit: 'Meratz'   },
      { name: 'Gas',    description: 'Diffuse expansive form.',     spirit: 'Thelvath' },
      { name: 'Plasma', description: 'Energized unstable matter.',  spirit: 'Pyrrek'   },
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

  function calcCarryWeight(xpInvested) {
    return 6 + xpInvested * 2;
  }

  function calcAbilityStrainCost(ability) {
    const intents = ability.intents ?? [];
    const intentStrain = intents.reduce((sum, key) => {
      if (key === 'condition') {
        const count = (ability.conditionDetails || []).length;
        return sum + Math.max(1, count);
      }
      return sum + ((INTENTS[key] || {}).strain ?? 0);
    }, 0);
    const state    = ABILITY_AWARENESS[ability.awarenessState];
    const substate = state && state.substates[ability.awarenessSubstate];
    const awarenessStrain = substate ? substate.strain : 0;
    const durationStrain  = (DURATIONS[ability.duration] || {}).strain ?? 0;
    return intentStrain + awarenessStrain + durationStrain;
  }

  function calcXpSpent(character) {
    const strainXp    = (character.strain    || {}).xpInvested ?? 0;
    const strideXp       = (character.stride       || {}).xpInvested ?? 0;
    const carryWeightXp  = (character.carryWeight  || {}).xpInvested ?? 0;
    const awarenessXp = (character.awareness || {}).xpInvested ?? 0;
    const lineageXp   = ((character.identity || {}).lineages ?? [])
      .reduce((sum, l) => sum + (l.level ?? 0), 0);
    const passiveXp   = (character.passiveAbilities ?? [])
      .reduce((sum, p) => {
        if (p.name === 'Resistant') {
          const dt   = DAMAGE_TYPES.find(d => d.name === p.notes);
          const mult = dt ? (dt.xpPerLevel || 1) : 1;
          return sum + (p.level ?? 0) * mult;
        }
        return sum + (p.level ?? 0);
      }, 0);
    return strainXp + strideXp + carryWeightXp + awarenessXp + lineageXp + passiveXp;
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
        { rank: 1, name: '', polarities: [], experiences: [] },
        { rank: 2, name: '', polarities: [], experiences: [] },
        { rank: 3, name: '', polarities: [], experiences: [] },
        { rank: 4, name: '', polarities: [], experiences: [] },
      ],
      strain:           { current: 0, xpInvested: 0 },
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
      carryWeight:      { xpInvested: 0 },
      awareness:        { xpInvested: 0, state: 'suppressed' },
      activeAbilities:  [],
      passiveAbilities: [],
      favor:            [],
      renTexture:       'Tranquil',
      weapons:          [],
      ammo:             { text: '', used: 0, max: 0 },
      background: {
        firstRenMoment:           '',
        territoryRaisedIn:        '',
        environmentRaisedIn:      '',
        upbringing:               '',
        primaryCaretakerBackground: '',
        whyLearnedRen:            '',
        howLearnedRen:            '',
        adventures:               '',
        backstory:                '',
      },
      trinkets:         [],
      money:            '',
      notes:            '',
    };
  }

  // ─── Public API ─────────────────────────────────────────────

  return {
    LINEAGES, REALM_NAMES, ARMOR_MATERIALS, HIT_LOCATIONS,
    INTENTS, ABILITY_AWARENESS, DURATIONS, CONDITIONS, MAX_ACTIVE_ABILITIES,
    FAVOR_TYPES, FAVOR_STATUSES, FAVOR_FACTION_STATUSES, PASSIVE_ABILITIES, DAMAGE_TYPES, LINEAGE_POLARITIES,
    REN_TEXTURES,
    VALUE_RANK_DIE, BASELINE_VALUES, POLARITIES_BY_CATEGORY,
    LINEAGE_POLARITY_DIE, STANDARD_XP_DIE,
    calcStrainMax, calcStride, calcAwarenessRange, calcStartingFavor, calcCarryWeight,
    calcAbilityStrainCost, calcXpSpent,
    newId, blankCharacter,
  };
})();
