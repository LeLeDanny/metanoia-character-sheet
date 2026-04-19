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
- `values`: array of 4 objects, each with rank (1-4), value name (free text), and an `experiences` array (each experience has an id and free-text description)
- `polarities`: array of objects, each with name, linked value rank, and a flag for whether it is the lineage polarity
- `strain`: current strain, xp invested in strain (max is calculated)
- `conditions`: array of objects, each with a name and a strain rating
- `armor`: object with 6 hit location keys (head, shoulders, center, wrists, legs, feet), each with material and absorbed strain
- `stride`: xp invested in stride (stride value is calculated)
- `activeAbilities`: array of ability objects (see Active Ability Builder feature)
- `passiveAbilities`: array of objects with name, level, and notes
- `favor`: array of objects with type (local/personal/organizational), entity name, and rating
- `renTexture`: string, one of `"Tranquil"` | `"Volatile"` | `"Rampant"`, default `"Tranquil"`
- `weapons`: array of up to 4 objects, each with `name`, `damageType`, and `range` (all free text)
- `ammo`: object with `spent` (number) and `max` (number)
- `carryWeight`: object with `xpInvested` (number); slots value is calculated (`6 + xpInvested * 2`)
- `background`: object with `firstRenMoment`, `territoryRaisedIn`, `environmentRaisedIn`, `upbringing`, `primaryCaretakerBackground`, `whyLearnedRen`, `howLearnedRen`, `backstory` (all free text)
- `adventures`: array of objects, each with `type` (free text) and `notes` (free text)
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
- Tab navigation bar (Sheet, Equipment, Backstory, Notes) below the header

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

### 5b. Experiences (under Values)

**Status:** `done`

Each value holds a list of experiences: the formative moments that led the character to hold that belief. In play, an experience grants a boon when it is relevant to the current scenario and a polarity under its parent value is being used.

- Each value row has an Experiences section below its polarities
- Add and remove experiences freely, max 4 per value (matching the polarity cap)
- Each experience is a free-text description input with a delete button
- Experiences are stored in the character JSON under their parent value object

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
| Arms | ... | ... | ... | ... |
| Center | ... | ... | ... | ... |
| Legs | ... | ... | ... | ... |

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

**Status:** `done`

A structured form for creating and storing active abilities. Auto-calculates Strain cost.

Each ability stores:

- Name (free text)
- Polarity (dropdown from character's current polarity list)
- Description (text area)
- Intents (checkboxes, multiple allowed, Strain cost shown per intent):
  Harm (1), Guard (1), Dodge (1), Heal (1), Recover (3), Seize (1), Move (1), Displace (1), Teleport (2), Condition \[X\] (1), Hide (1), Know (1), Convince (1), Create (0), Manifest (1), Cast \[X\] (1)
- Awareness state (radio: Suppressed, Extended, Focused)
- Awareness substate (radio, options depend on selected state):
  - Suppressed: Touch (+0), Arc (+1), Line (+1)
  - Extended: Aura (+1)
  - Focused: Single (+1), Ricochet (+2), Chain (+3), Cover (+1), Barrier (+2), Narrow (+2), Wide (+3), Massive (+4)
- Duration (radio): Instant (+0), Charged (+1), Sustained (+1), Persistent (+2), Permanent (+4)

Calculated and displayed:

- Strain Cost: sum of intent costs + awareness substate cost + duration cost
- Whether the ability is free at the character's current Realm (free if Strain Cost <= Realm)

Validation notes:

- Extended awareness only allows: Harm, Guard, Move, Displace, Heal, Recover, Condition, Hide, Know, Convince
- Sustained abilities drop if the character's awareness state changes (display as a note, not enforced)

Max active abilities: 20, displayed as a counter. Abilities beyond the max are flagged, not blocked.

---

### 12. Passive Abilities

**Status:** `done`

Permanent upgrades purchased with XP.

- Add and remove passives freely
- Each passive has:
  - Name (dropdown of known passives, with a free-text fallback for custom ones)
  - Level (number, represents XP spent on this passive)
  - Configuration notes (free text for specifics: which polarity for Circulation, which damage type for Resistant, etc.)
- Level counts toward XP spent

---

### 13. Favor

**Status:** `done`

Social standing and relationship capital.

- Starting Favor pool displayed: `2 + Realm` (calculated, read-only reference)
- Add and remove favor entries freely
- Each entry has:
  - Type (dropdown): Local Faction, Personal, Organizational
  - Entity name (free text: faction, person, or institution)
  - Rating (number input)
- No enforced cap; GM governs spending

---

### 14. Ren Texture

**Status:** `done`

The stability of a character's Ren circulation, which determines boon and complication trigger frequency.

- Single dropdown: Tranquil / Volatile / Rampant
- Displays the boon and complication trigger range for the selected texture (e.g., "Boons on Min; Complications on Max")
- Reference tooltip summarizing all three textures and their per-die trigger values

---

### 15. Weapons

**Status:** `done`

Up to 4 weapons managed in the Equipment tab.

- Four weapon slots max, added via "+ Weapon" button up to the cap
- Each weapon has:
  - Name (free text)
  - Damage Type (free text)
  - Range (free text)
- Remove button per slot
- Compact summary displayed on the main sheet above Active Abilities

---

### 16. Ammo

**Status:** `done`

Tracks a single ammunition pool.

- Spent and Max number inputs in the Equipment tab
- Quick +1 on Spent via button on the main sheet summary
- Main sheet shows spent / max at a glance

---

### 17. Carry Weight

**Status:** `done`

How many inventory slots the character contributes to the party pool.

- XP invested in Carry Weight (number input, counts toward XP spent)
- Slots contributed (calculated: `6 + XP invested × 2`, displayed read-only)
- No party inventory tracking in this sheet; this field is for reference only

---

### 18. Background

**Status:** `done`

Structured character history drawn from the lifepath system.

- What caused you to first feel Ren? (free text)
- Territory Raised In (free text)
- Environment Raised In (free text)
- Upbringing (free text)
- Primary Caretaker's Background (free text)
- Why you learned Ren (free text)
- How you learned Ren (free text)
- Written backstory (large text area)

All fields are optional and save with the character file.

---

### 19. Adventures

**Status:** `done`

Pre-play missions and ordeals the character has already survived. Lives in the Backstory modal as a single open text area (stored inside the `background` object). Simplified from the originally planned structured list.

---

### 20. Notes

**Status:** `done`

Free-text space for appearance, session notes, miscellaneous details. Lives in the Notes tab.

- Single large text area
- Saves with the character file
- No formatting, no markdown rendering

---

### 21. Trinkets & Items

**Status:** `done`

Personal possessions that are not party inventory. Opened via a header nav button alongside Backstory and Notes.

- Money field at the top: single free-text input (supports any denomination or format)
- Trinket list below: add and remove freely
- Each trinket has a name (free text) and an optional note (free text)
- No cap on trinket count
- Stored as `character.trinkets` (array of `{ id, name, note }`) and `character.money` (string)

---

### 22. Section Icons

**Status:** `done`

Small inline SVG icons to the left of each section heading on the main character sheet for faster visual scanning.

- 14 sections receive an icon: Identity, Awareness, Ren Texture, Stride & Carry Weight, Values, Armor, Strain, Environmental Protection, Conditions, Favor, Weapons, Ammo, Passive Abilities, Active Abilities
- Icons are custom SVGs (48x48 viewBox, stroke-based) inlined directly in the HTML
- Icons inherit the accent color via `currentColor`, adapting to both light and dark themes
- No external dependencies added
- Modal headings are intentionally left without icons

---

## Post-MVP (Future)

These are confirmed ideas for after the MVP is complete and stable.

| Feature | Notes |
|---|---|
| Dice roller | Build a pool, roll it, count successes against a TN. In-app only, not synced. |
| Print / export view | Clean layout suitable for printing or saving as PDF. |
| Ability reference panel | In-sheet view of all 110+ polarities and all passive ability descriptions. |
