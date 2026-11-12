# Antigravity's Round-1 Design Proposal: The "Command Bridge" Dashboard

## 1. A Clear POV: Rethink from Scratch
**POV: Rethink from scratch.** The current 7-tab architecture fragments in-play flow. Mid-firefight, a player needs to check their Wounds/Fatigue (Combat tab), roll a Ballistic Skill (Main tab), see their ammo (Gear tab), and maybe push a Psychic Power (Psychic tab). The cognitive load of hunting for data across tabs slows down the game. I propose a **Single-Scroll Dashboard with a Sticky Context Sidebar**. This prioritizes operational efficiency—putting the character's immediate vitals and reactive capabilities front-and-center, while allowing instant access to all other data without losing context of their health and status.

## 2. Information Architecture & Navigation Model
Abandon the horizontal tab group. Replace it with a **two-column layout**:
*   **Left Column (Sticky Sidebar):** ~25% width. This is fixed and never scrolls out of view. It holds the portrait, core vitals, and reactive buttons (Dodge, Parry, Initiative).
*   **Right Column (Main Content Scroll):** ~75% width. A continuous vertical scroll of the character's full sheet, navigated via a persistent sticky "quick-jump" anchor menu at the top of the column.

## 3. Layout of the Primary Views
*   **Always Visible (Sidebar):** 
    *   Portrait, Name, Bio quick-labels.
    *   Wounds, Fatigue, Fate, current Armour display.
    *   Active Effects toggles.
    *   Combat Controls (Initiative, Dodge, Parry, Assign Damage).
*   **Progressively Disclosed (Main Scroll):**
    *   *Anchor 1: Attributes & Skills* (Characteristics roller, Basic/Advanced/Specialist skills merged into one unified, filterable list).
    *   *Anchor 2: Arsenal & Gear* (Weapons, Force Field, Encumbrance, Armour items, Cybernetics, Backpack, Gear).
    *   *Anchor 3: Abilities* (Psychic Powers, Talents, Traits).
    *   *Anchor 4: Progression & Persona* (Origin Path, Advances, Corruption, Insanity, Social/Journal).

## 4. Visual System Direction
*   **Typography:** The current `IM Fell DW Pica` serif is highly thematic for 40k but objectively poor for rapid scanning of data tables (like skill lists and weapon profiles). I propose a **hybrid approach**: retain IM Fell for panel headers, titles, and flavor text to keep the grimdark identity, but shift all tabular data, form inputs, and numeric readouts to a clean, legible sans-serif (e.g., Roboto or Inter). 
*   **Hierarchy & Density:** The current design uses heavy `panel_border.png` borders around *every* panel, creating a dense grid where everything shouts with equal volume. We will remove these heavy borders for inner panels. The parchment background remains, but we will use subtle drop-shadows and translucent overlays (a nod to auspex screens) to group information, reducing visual noise.
*   **Color:** Maintain the signature teal/dark-blue accents, but introduce a stark, high-contrast warning color (e.g., crimson) exclusively for critical states (low Wounds, high Fatigue).

## 5. Mapping Current Tabs (Nothing Lost)
*   **Combat:** Distributed. Vitals, Armour-display, Active-effects, Combat-controls, and Initiative move to the **Sticky Sidebar**. Characteristic-roller and Movement sit at the top of the **Attributes & Skills** section.
*   **Main:** Characteristics, Traits, Skills, and Talents are split. Characteristics and all three Skill panels merge into **Attributes & Skills**. Traits and Talents move to **Abilities**.
*   **Gear:** Weapons, Encumbrance, Armour, Storage, Cybernetics, Backpack, Force-field, Gear map 1:1 into the **Arsenal & Gear** section.
*   **Psychic:** Maps 1:1 into the **Abilities** section.
*   **Advances & Social & Bio:** Combined into the bottom **Progression & Persona** section. Origin-path, bio fields, ship-role, experience, corruption/insanity, journal, peers, enemies.

## 6. Data Compatibility (Zero Migration)
This proposal is strictly presentation-layer. We will continue to use the exact Handlebars data paths (`{{actor.system.wounds.value}}`, `{{actor.skills}}`, etc.). The `<input>` bindings remain completely untouched. Existing actors will load flawlessly. We will simply reorganize `actor-acolyte-sheet.hbs` to change the inclusion order of the existing partials and apply a new CSS Grid structure. No data migration is required.

## 7. Phased Implementation Path
*   **Phase 1: The Grid (Early Value).** Rewrite `actor-acolyte-sheet.hbs`. Remove tabs. Setup the CSS Grid for the Sticky Sidebar and Main Scroll. Slot the existing un-styled `panel/*.hbs` files into the new regions. This immediately validates the UX flow.
*   **Phase 2: Visual De-clutter.** Overhaul `_panel.scss` and `_fonts.scss`. Strip out the repetitive heavy borders. Apply the hybrid typography system.
*   **Phase 3: Deep Consolidation.** Rewrite the inner panel partials. Specifically, merge the three separate skill tables into a single cohesive list, and standardize the item rows (weapons, talents, psychic powers) to use a unified, space-efficient accordion design.

## 8. Honest Risks/Tradeoffs
*   **The "Long Scroll" Risk:** If a character has a massive inventory or a huge spell list, a single-scroll sheet can become unwieldy. 
    *   *Mitigation:* The sticky anchor nav is critical—users shouldn't physically scroll to the bottom, they should click "Progression" to jump there. Furthermore, item descriptions must default to collapsed.
*   **Aesthetic Friction:** Moving away from 100% gothic serif fonts and heavy borders trades some thematic immersion for usability. Purists might initially find the cleaner tabular data "too modern" for 40k. 

***

**Summary / Boldest Move**
My core thesis is that a mid-session player needs immediate, simultaneous access to a cross-section of data (e.g., Wounds, Weapon, Ballistic Skill) that a 7-tab architecture artificially fragments and hides. By abandoning tabs entirely, we remove the cognitive friction of navigating menus during combat. 

My single boldest move is the **Sticky Context Sidebar**. By permanently pinning the character's vitals, active effects, and immediate reactions (Dodge/Parry) to the screen, the player is never blind to their survivability, regardless of whether they are reading a long talent description or checking their inventory.
