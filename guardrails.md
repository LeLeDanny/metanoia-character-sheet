---
title: Development Guardrails
---

# Development Guardrails

This document governs how the character sheet application is built. It exists so that any AI assistant working on this project builds incrementally, predictably, and in a way the project owner can follow and verify at each step.

---

## Core Rule

**One feature at a time.**

No feature is introduced until the previous one is complete, committed, and confirmed working by the project owner. Do not anticipate future features by adding scaffolding, abstractions, or "hooks for later." Build exactly what is in scope for the current task.

---

## Feature Introduction Process

1. A feature must exist in `features.md` before it is built.
2. Before building, confirm with the project owner that the feature is the next priority.
3. Build only that feature. Do not refactor adjacent code unless the feature cannot work otherwise.
4. When done, ask the project owner to confirm it works before moving on.

---

## Hosting

The app lives in a **separate public GitHub repository** under the `LeLeDanny` account, deployed via **GitHub Pages**. This keeps the Metanoia vault (private) separate from the publicly accessible app.

The source files in `Software/Character Sheet Application/` in the vault are the working copy. When ready to deploy, they are pushed to the public repo.

---

## Technical Stack

The application uses:

- **Vanilla HTML, CSS, and JavaScript only.** No frameworks (no React, Vue, Svelte, etc.). No build tools (no npm, webpack, vite, etc.).
- **No external dependencies.** The only external resource allowed is the Saira font from Google Fonts (matching the website).
- **A single `index.html`** as the entry point. The app runs by opening this file in a browser.
- **CSS in a single `style.css` file.**
- **JavaScript in a single `app.js` file**, until size demands splitting (which requires project owner approval).

This keeps the project accessible to a non-technical owner: there is nothing to install, nothing to compile, and nothing to configure.

**No ES module syntax (`import`/`export`).** ES modules are blocked by browsers when opening HTML files directly from the filesystem (`file://`). Instead, each module uses an IIFE that exposes a single capitalised global (`Schema`, `FileIO`, `Identity`, etc.). Scripts are loaded via `<script src="...">` tags in `index.html` in dependency order. This ensures the app works by double-clicking `index.html` with no server required.

---

## Visual Design

Match the Metanoia website aesthetic. Use these exact values:

**Font:** Saira (Google Fonts), sans-serif fallback.

**Accent:** `#cc7070`

**Dark mode (default):**
- Background: `#111111`
- Surface: `#1a1a1a`
- Border: `#2a2a2a`
- Text: `#e8e8e8`
- Accent: `#cc7070`
- Accent high: `#f0b8b8`

**Light mode:**
- Background: `#ffffff`
- Surface: `#f5f5f5`
- Border: `#e5e5e5`
- Text: `#333333`
- Accent: `#cc7070`
- Accent high: `#8b4545`

Headings: italic, bold. The theme toggle defaults to dark mode and respects the user's OS preference.

---

## Layout

- **Responsive but desktop-primary.** The layout is designed for a wide screen first. On mobile (phones), everything must still be readable and usable, but the experience is optimized for desktop.
- Do not build a separate mobile layout. Use a single responsive layout with breakpoints.

---

## Code Architecture

The JavaScript is split into small, focused module files. Each module owns exactly one section of the sheet. No module reaches into another module's logic directly.

**Structure:**

```
app.js          (orchestrator only)
modules/
  identity.js
  values.js
  polarities.js
  strain.js
  conditions.js
  armor.js
  stride.js
  activeAbilities.js
  passiveAbilities.js
  favor.js
  notes.js
  fileIO.js     (save / load / new character)
```

**Each module exposes three things and nothing else:**

- `render(character)`: takes the full character object, updates the DOM for that section
- `read()`: reads the DOM for that section, returns a partial character object
- `init(onUpdate)`: sets up event listeners; calls `onUpdate` whenever the user changes something

**The orchestrator (`app.js`) does:**

- Holds the single source of truth: the current character object in memory
- On load: passes the character to every module's `render()`
- On any change (via `onUpdate` callback): calls `read()` on the changed module, merges it into the character object, updates the unsaved-changes flag
- On save: assembles the full character from all modules via `read()`, writes to file
- Never contains section-specific logic

**Rules:**

- If a module is getting long, that is a signal to ask the project owner before splitting it further, not a license to refactor freely.
- No module imports another module. All coordination goes through `app.js`.
- Calculated values (Strain Max, AR, Cast Cost, etc.) are computed in the module that displays them, not in `app.js`.

---

## File Save and Load

- Characters are saved as `.json` files to the user's local drive.
- Save uses the browser's [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API) with a fallback to a standard file download if the API is unavailable.
- Load uses a standard file input (`<input type="file">`).
- The JSON schema is defined before any UI is built (see `features.md`).

---

## Calculated Values

The following values are derived from other fields and must be calculated by the app, not entered manually:

- Strain Max: `4 + (2 × (Realm + XP invested in Strain))`
- Ability Realm (AR): `floor(Total Complexity / 2)`
- Cast Cost: derived from AR vs character Realm
- Stride: `2 + XP invested in Stride`
- Starting Favor pool: `2 + Realm`

Do not ask the user to enter these manually. Surface both the inputs and the derived result.

---

## What Not to Build

- No user accounts, authentication, or server-side storage.
- No multiplayer or real-time sync.
- No separate mobile layout.
- No automatic cloud backup.
- No dice roller until it is listed as a confirmed feature in `features.md`.

---

## Browser Target

Test in Chrome first. The app must also work in Firefox. Safari is a secondary concern.

---

## Commits

Each feature gets its own commit. Commit messages should name the feature. Do not bundle unrelated changes.
