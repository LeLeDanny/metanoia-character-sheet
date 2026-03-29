---
title: Character Sheet Application
---

# Metanoia Character Sheet

A browser-based character sheet for the Metanoia TTRPG. Players open the app, load or create a character, edit it during play, and save it back to their local drive as a `.json` file.

---

## How to Run

1. Open `index.html` in a browser (Chrome or Firefox recommended).
2. That is it. There is nothing to install.

---

## How to Save and Load Characters

- **Load:** Click "Open Character" and select a `.json` file from your drive.
- **Save:** Click "Save Character" to write the current state back to a `.json` file on your drive.
- **New:** Click "New Character" to start a blank sheet.

---

## Project Structure

```
Character Sheet Application/
  index.html        # Entry point. Open this in a browser.
  style.css         # All styles.
  app.js            # All application logic.
  features.md       # What the app does and what is planned.
  guardrails.md     # Rules for how this project is built.
  README.md         # This file.
```

---

## For AI Assistants

Read these files before doing any work:

1. `guardrails.md` — rules for how to build, what tech to use, and what not to build.
2. `features.md` — what exists, what is in progress, and what is planned.
3. The Metanoia rules at `../Website/site/src/content/docs/rules/` for context on what the sheet needs to represent.

**The core rule: build one feature at a time, confirm it works, then move on.**

---

## Rules Reference

The character sheet is built around the Metanoia ruleset. Key rules files:

| Topic | File |
|---|---|
| Overview | `rules/index.md` |
| Values | `rules/character/values.md` |
| Polarities | `rules/character/polarities.md` |
| Strain | `rules/character/strain.md` |
| Wounds & Conditions | `rules/character/wounds-conditions.md` |
| Armor & Hit Locations | `rules/character/armor-hit-locations.md` |
| Stride | `rules/character/stride.md` |
| Active Abilities | `rules/abilities/active-abilities.md` |
| Passive Abilities | `rules/abilities/passive-abilities.md` |
| Realms | `rules/realms.md` |
| Favor | `rules/favor.md` |

All paths are relative to `../Website/site/src/content/docs/`.
