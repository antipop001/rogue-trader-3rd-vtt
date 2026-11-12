# Antigravity's Round-2 Design Proposal: Refined Command Bridge

## 1. What We Agree On (The Core Convergence)
We have a massive, fundamental agreement that solves the primary UX problem of the V2 sheet: **The Combat tab must die, replaced by a permanent, always-visible "Command Rail."** 
By fixing Wounds, Fatigue, Fate, Armour, and combat actions to the left side of the screen, we create a zero-tab-switch flow for the most common mid-session loops (take a hit → spend fate → roll Toughness). 
We also completely agree on the constraints: this is a presentation-layer only refactor requiring zero data migration, and we must preserve the gothic aesthetic (parchment, teal/slate colors, Material Icons). Claude's idea to make all "rollable" elements visually distinct with a teal accent is brilliant and I enthusiastically adopt it.

## 2. Resolution: Navigation (Tabs vs. Scroll)
**Verdict: Claude wins. I adopt the 4-tab model.**
*Reasoning:* I initially proposed a single-scroll dashboard with a sticky anchor nav to eliminate tab-hunting. However, in the context of a resizable Foundry VTT pop-out window, a single scroll is dangerous. A high-level character with a massive gear list or a psyker with a dozen powers would create an infinitely long scroll, forcing players to constantly hunt for their place. Tabs enforce vertical space constraints and preserve muscle memory. Claude's reduction from 7 to 4 tabs provides the organization of tabs without the fragmentation of the old system.

## 3. Resolution: Typography (Sans-serif vs. Lusitana)
**Verdict: Claude wins. We will use `Lusitana`.**
*Reasoning:* I proposed bringing in Roboto or Inter for tabular data to maximize legibility. Claude rightly pointed out that this abandons too much of the 40k identity. `Lusitana` is already loaded in the system, fits the period aesthetic perfectly, and is significantly more legible at small sizes than the highly ornamental `IM Fell DW Pica`. By reserving `IM Fell` for headers and using `Lusitana` (without ALL-CAPS) for data, we solve the scannability problem without breaking immersion. 

## 4. Resolution: Content Grouping
**Verdict: My grouping is stronger, with modifications.**
*Reasoning:* While I adopted Claude's 4-tab structure, I disagree with Claude's "Mind" tab (Psychic + XP/Corruption) and their placement of Talents/Traits in the "Character" tab.
1. **The "Mind" Tab Problem:** For the ~80% of characters who are not psykers, a "Mind" tab containing only XP and Corruption feels empty and poorly named.
2. **The Merged Skill List:** I strongly defend my Round-1 proposal to merge Basic, Advanced, and Specialist skills into a single, filterable list, rather than keeping them in three separate panels.

**My Refined 4-Tab Proposal:**
*   **Character:** Characteristics and the newly Merged Skill List. This is the "What I can roll" tab.
*   **Abilities:** Talents, Traits, and Psychic Powers. This is the "Special Rules" tab. Psykers see their powers here; non-psykers still have a full tab of Talents and Traits.
*   **Gear:** (Unchanged from Claude). Weapons, Armour, Inventory.
*   **Chronicle:** Bio, Journal, plus XP, Corruption, and Insanity. This is the "Campaign Progress and Narrative" tab.

## 5. Remaining Genuine Disagreement
The only remaining friction point is the grouping of non-gear features. Claude groups Talents and Traits with Characteristics/Skills, and isolates Psychic powers. I argue that grouping all exception-based rules (Talents, Traits, Psychic Powers) into an "Abilities" tab is cleaner and prevents dead tabs for non-psykers.
