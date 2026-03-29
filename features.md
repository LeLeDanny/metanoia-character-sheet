---
title: Features
---

# Character Sheet App: Features

This document is the authoritative list of what the app does, what is planned, and in what order things get built. Nothing gets built without appearing here first.

**Status labels:** `done` | `in progress` | `planned` | `future`

---

## Hosting & Deployment

- Separate public GitHub repo under `LeLeDanny` (name TBD)
- Deployed via GitHub Pages (free)
- Source files developed here in the vault, pushed to the public repo when ready to deploy

---

## MVP: Build Order

Features are built in this sequence. Do not skip ahead.

---

### 1. Data Model (JSON Schema)

**Status:** `done`

Define the full structure of a character JSON file before any UI is built. Every field the sheet will ever need must be accounted for here. The schema is the contract between the data and the interface.

Fields to include:

- `meta`: app version, schema version, last saved date
- `identity`: name, lineage (one of 7 lineages), realm (0-5), xp total, xp allocated
- `values`: array of 4 objects, each with rank (1-4) and value name (free text)
- `polarities`: array of objects, each with name, linked value rank, and a flag for whether it is the lineage polarity
- `strain`: current strain, xp invested in strain (max is calculated)
- `conditions`: array of objects, each with a name and a strain rating
- `armor`: object with 6 hit location keys (head, shoulders, center, wrists, legs, feet), each with material and absorbed strain
- `stride`: xp invested in stride (stride value is calculated)
- `activeAbilities`: array of ability objects (see Active Ability Builder feature)
- `passiveAbilities`: array of objects with name, level, and notes
- `favor`: array of objects with type (local/personal/organizational), entity name, and rating
- `notes`: free text string

---

### 2. App Shell

**Status:** `done`

The structural frame of the app with no character data yet. This is what gets built first so every subsequent feature has a home.

- `index.html`, `style.css`, `app.js` files created
- Saira font loaded from Google Fonts
- Dark/light mode toggle, defaulting to dark, respecting OS preference
- Header with app name and theme toggle
- Placeholder sections for each sheet area (empty, labeled)
- No character data, no interactivity yet

---

### 3. New / Load / Save

**Status:** `done`

The core file workflow. A character is one JSON file on the player's drive.

- **New Character:** Creates a blank character with all fields at their defaults
- **Load Character:** Opens a file picker, reads a `.json` file, populates the sheet
- **Save Character:** Writes the current sheet state to a `.json` file using the File System Access API, with a download fallback for browsers that do not support it
- The app always shows one character at a time
- Unsaved changes are flagged in the header (e.g., a dot or "unsaved" label)

---

### 4. Identity

**Status:** `done`

Top-of-sheet character information.

- Character name (text input)
- Lineage (dropdown): Anamor, Daruner, Elkyr, Haqol, Janim, Nyl, Okoi
- Realm (dropdown 0-5, labeled with realm names: Void, Spark, Flame, Star, Constellation, Galaxy)
- XP total (number input)
- XP spent (calculated from all XP allocations across the sheet, displayed read-only)
- XP remaining (calculated, displayed read-only)

---

### 5. Values + Polarities

**Status:** `done`

Four ranked values and their associated polarities. Polarities are nested directly under the value they are tied to — there is no separate Polarities section.

**Values:**
- Four value slots, each with:
  - Rank (1-4, derived from row position)
  - Value name (free text)
  - Die size displayed (d4/d6/d8/d10, derived from rank)
- Rows are reordered by drag-and-drop; rank is always derived from position, not stored separately
- Up/down arrow buttons on each row as a touch/mobile fallback for reordering
- Visual hierarchy: rank 1 most prominent (accent colour), rank 4 most subdued

**Polarities (nested under each value):**
- Each value holds up to 4 polarities
- Add button is disabled once 4 polarities exist under a value (hard cap)
- Each polarity has a free-text name input and a delete button
- Die size is inherited from the parent value's rank — no separate field needed
- Lineage polarities are tracked in the Identity section, not here

**Reference modal (shared `?` button):**
- Section 1: the 12 baseline values with descriptions
- Section 2: all 110+ polarities organized by category with descriptions, for inspiration

---

### 6. Awareness Range

**Status:** `done`

Base Awareness range expanded through direct XP investment. Applies as a radius to all four Awareness states.

- At Realm 0 (Void): no Awareness. State and XP inputs are disabled; range displays `—`
- At Realm 1+: Awareness is active
- Current state dropdown (Cloaked / Suppressed / Extended / Focused), defaults to Suppressed
- XP invested in Awareness (number input, counts against XP spent)
- Awareness range (calculated: `3 + XP invested`, displayed read-only, in Range Bands)
- Reference tooltip showing the four states (Cloaked, Suppressed, Extended, Focused) and what the range means for each

---

### 7. Stride

**Status:** `done`

Movement range during combat.

- XP invested in Stride (number input, counts against XP spent)
- Stride value (calculated: `2 + XP invested`, displayed read-only)
- Reference tooltip showing Range Band distances

---

### 8. Armor & Hit Locations

**Status:** `done`

Per-location armor tracking for physical combat.

Six locations displayed as a structured panel:

| Location | Material | Armor Strain (AS) | Absorbed | Status |
|---|---|---|---|---|
| Head | (dropdown) | (calculated) | (input) | (ok/broken) |
| Shoulders | ... | ... | ... | ... |
| Center | ... | ... | ... | ... |
| Wrists | ... | ... | ... | ... |
| Legs | ... | ... | ... | ... |
| Feet | ... | ... | ... | ... |

- Locations displayed in die-roll order, with die number shown inline: Head (1), Shoulders (2), Wrists (3), Legs (4), Feet (5), Center (6–8)
- AS is a direct dropdown (0–10) per location; no material tracking
- Absorbed tracks how much strain the piece has taken, input from 0 to AS max
- Status is auto-calculated: if absorbed equals AS and AS > 0, the piece is shown as broken
- Quick +1 button on absorbed for tracking hits during play
- Aura row: hidden by default; appears automatically when the Armored Aura passive has XP invested; AS derives from the passive level; tracks absorbed separately; not tied to a specific hit location
- Reference modal (`?`): hit location die table, materials table, Armored Aura explanation

---

### 9. Strain

**Status:** `done`

The universal resource tracked during play.

- XP invested in Strain (number input, 0–5, counts against XP spent)
- Strain Max (calculated: `4 + (2 × (Realm + XP invested in Strain))`, displayed read-only)
- Current Strain (number input, 0 to Strain Max)
- Quick +1 / -1 buttons for adjusting current Strain during play
- Visual indicator when current Strain is at 0 (dying/incapacitation warning)

---

### 10. Wounds & Conditions

**Status:** `done`

Named conditions with strain ratings tracking ongoing injuries and effects.

- Add and remove conditions freely
- Each condition has:
  - Name (free text describing the wound or effect)
  - Strain rating (number, tracks severity)
  - Quick +1 / -1 buttons on the rating
- When a condition's rating reaches 0, it is marked for removal (with a confirm step)
- If at least one condition is active and current Strain is 0: dying state warning displayed

---

### 11. Active Ability Builder

**Status:** `planned`

A structured form for creating and storing active abilities. Auto-calculates complexity and AR.

Each ability stores:

- Polarity (dropdown from character's current polarity list)
- Description (text area)
- Awareness state (radio: Cloaked/Suppressed, Extended, Focused)
- Intents (checkboxes, multiple allowed): Know, Hide, Convince, Create, Recover, Seize, Dodge, Guard, Harm, Condition, Teleport, Move, Cast\[X\]
- Duration type (radio): Sparked (0), Maintained (1), Charged (2), Stabilized (3)
- Duration frame (radio): Exchange (1), Encounter (2), Engagement (3), Exploration (4), Expedition (5), Permanent (6)
- Area (radio): N/A (0), 3 Targets (1), 2D (2), 3D (3)
- Area radius (radio): N/A (0), Band 2 (1), Band 3 (2), Band 4/Zone (3), Band 5-6 (4)
- Type (radio): Effect or Projectile (0), Construct (1)

Calculated and displayed:

- Total Complexity (sum of all components)
- Ability Realm / AR (`floor(Complexity / 2)`)
- Cast Cost at character's current Realm (table lookup displayed inline)

Max active abilities: `Realm × 5`, displayed as a counter. Abilities beyond the max are flagged, not blocked.

---

### 12. Passive Abilities

**Status:** `planned`

Permanent upgrades purchased with XP.

- Add and remove passives freely
- Each passive has:
  - Name (dropdown of known passives, with a free-text fallback for custom ones)
  - Level (number, represents XP spent on this passive)
  - Configuration notes (free text for specifics: which polarity for Circulation, which damage type for Resistant, etc.)
- Level counts toward XP spent

---

### 13. Favor

**Status:** `planned`

Social standing and relationship capital.

- Starting Favor pool displayed: `2 + Realm` (calculated, read-only reference)
- Add and remove favor entries freely
- Each entry has:
  - Type (dropdown): Local Faction, Personal, Organizational
  - Entity name (free text: faction, person, or institution)
  - Rating (number input)
- No enforced cap; GM governs spending

---

### 14. Notes

**Status:** `planned`

Free-text space for character background, appearance, session notes, etc.

- Single large text area
- Saves with the character file
- No formatting, no markdown rendering

---

## Post-MVP (Future)

These are confirmed ideas for after the MVP is complete and stable.

| Feature | Notes |
|---|---|
| Dice roller | Build a pool, roll it, count successes against a TN. In-app only, not synced. |
| Print / export view | Clean layout suitable for printing or saving as PDF. |
| Ability reference panel | In-sheet view of all 110+ polarities and all passive ability descriptions. |
