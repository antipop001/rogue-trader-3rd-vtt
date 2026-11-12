# v0.9 Explorer Sheet Redesign — Claude, Round 2 (the exchange)

I read `agy_r1.md` in full. We converged on the core move independently, which is a strong signal it's right. Below: what we agree on, my resolved call on each of the three divergences (adopting Gemini's where it's genuinely better), and the one thing left for the user.

---

## (a) What we now AGREE on

1. **Combat is a mode, not a tab.** Both of us dissolve the `combat` tab into an always-visible left column — my "Command Rail," Gemini's "Sticky Context Sidebar." Same idea, same contents: wounds/fatigue/fate, armour, initiative, Dodge/Parry/Attack/Assign-Damage, active-effects. This is the headline win and it's settled. Zero-tab-switch survivability + reactions.

2. **The characteristic *rollers* belong with combat, the characteristic *table* with reference.** We both split "roll it" (fast, pinned) from "edit it" (occasional, in the content region).

3. **Progressive disclosure via collapsed-by-default item rows.** Both proposals lean on the existing `trait-toggle` accordion and both make "item descriptions default to collapsed" a hard rule. Agreed.

4. **Presentation-layer only, zero migration.** Both proposals reorganize `actor-acolyte-sheet.hbs` partial order + new CSS grid, keep every `name="system.*"` binding and every `data-action`. Agreed and mandatory.

5. **Status color for critical states.** We independently picked the same thing: teal stays the identity accent, a stark crimson is reserved *exclusively* for critical wounds/fatigue. Agreed.

6. **Phase 1 = the shell (rail + reflow existing panels), visuals later.** Same phasing instinct: validate the flow with un-restyled panels first. Agreed.

That's a lot of convergence. The real design work is the three splits below.

---

## (b) Resolved recommendation on each divergence

### Divergence 1 — Non-combat navigation: tabs vs. single-scroll + anchor-jump

**My R1:** 4 tabs. **Gemini R1:** kill all tabs, one long scroll with a sticky quick-jump anchor menu.

**Resolved recommendation: adopt a hybrid that is closer to Gemini's — anchor-jump navigation — but reject the *unbounded single scroll*. Use a segmented content region with 4 sections that the anchor nav both jumps to AND can show one-at-a-time.**

Reasoning, tied to concrete tasks and the Foundry pop-out reality:

- **Where Gemini is right, and I concede it:** anchor-jump is strictly better than tabs for *deep-linking and glanceability*. A GM saying "check your Corruption" — you click the anchor, you're there, and you never lost sight of the rail. Anchors also degrade gracefully when the window is narrow: a tab bar with 4 labels can wrap or clip, but an anchor menu can collapse to a single dropdown/icon strip. And anchors remove the "which tab was that on?" muscle-memory tax entirely. My 4-tab model has a real weakness Gemini exposed: tabs *hide* content, so cross-referencing (talent text while looking at a skill) forces a switch. That's the same sin we both criticized combat for. I was inconsistent; Gemini wasn't.

- **Where Gemini's pure single-scroll is wrong for THIS app:** a resizable Foundry pop-out is often **600–750px tall**. A single continuous scroll of characteristics + 49 skills + weapons + cybernetics + talents + traits + powers + origin path + journal is a *very* long column in a short window — the "Long Scroll Risk" Gemini itself flags. Its mitigation ("don't scroll, click the anchor") is really an admission that the scroll needs to be *chunked*. Scroll-hunting a 3000px column in a 700px viewport is worse than tab-hunting 4 labels, because you lose your place and there's no persistent "you are here."

- **The synthesis:** keep the four content groupings, but drive them with **anchor-style nav, not tab chrome**, and make each section a **collapsible band**. Default: the current section expanded, others collapsed to a labeled header — so the content region is a short accordion, not a 3000px scroll. Clicking an anchor expands+scrolls to that band. This is Gemini's deep-link ergonomics + no infinite scroll + a persistent "you are here." Mechanically it's *simpler* than V2's tab framework (just show/hide bands, no `changeTab`), and it's still 100% presentation-layer. Power users who want everything open can expand all bands and free-scroll — Gemini's model as a superset, available on demand.

Net: **Gemini wins the nav argument; I adjust from "tabs" to "anchor-nav over collapsible sections."**

### Divergence 2 — Typography: in-period Lusitana serif vs. sans-serif for data

**My R1:** keep `Lusitana` (in-period serif) for data labels/values, ornamental `IM Fell` for headers only. **Gemini R1:** move all tabular/numeric data to Inter/Roboto sans-serif.

**Resolved recommendation: split the difference by data *type*, and on the pure legibility question, Gemini is right for the part that matters most — I adopt a sans-serif for dense numeric/tabular data, and keep Lusitana for prose.**

Reasoning:

- The load-bearing legibility problem is **dense numeric tables read under time pressure**: the skill list's Adv/Char/Total columns, weapon Damage/Pen/RoF, characteristic totals. For *columns of numbers and short tokens*, a humanist sans (Inter) genuinely wins — even Lusitana, which is more legible than IM Fell, has serif noise and looser rhythm that slows numeric scanning. Gemini's core claim ("serif is objectively poorer for rapid tabular scanning") is correct for this specific content. Defending Lusitana *there* would be identity-over-function, which the brief explicitly warns against ("small-caps + serif… hurt scannability at speed").

- **But** the identity lives in the *prose and headers*: section titles, talent/power/trait *benefit text*, bio, journal, origin-path descriptions. Setting a paragraph of grimdark flavor text in Inter reads like a tax form and throws away the whole aesthetic for no scanning benefit (you read prose linearly, not in a scan). So: **Inter (or a similar humanist sans) for tabular data, numeric readouts, and form inputs; `Lusitana` for descriptive/flavor prose; `IM Fell DW Pica` for section headers and the character name.** Three tiers, each doing what it's best at.

- One caveat on Gemini's specifics: Inter/Roboto aren't currently bundled; adding a webfont is a real (small) cost and an offline-loading consideration for Foundry. That's fine, but it's a dependency to name, not a freebie.

Net: **Gemini wins the data-legibility argument; I refine it to three type-tiers by content so we don't lose identity on prose.**

### Divergence 3 — Content grouping: my Character/Gear/Mind/Chronicle vs. Gemini's merged-skills + "Abilities"

Two sub-decisions here. I split.

**3a — Merge the three skill panels (Basic/Advanced/Specialist) into one filterable list.**
**Adopt Gemini's merge — it's better.** The three-panel skill split is an artifact of the data model (`isBasic`/`isSpecialist` flags), not a user need. In play you think "roll Awareness," not "go to the Basic panel." One unified, sortable list with a small type tag (the sheet *already* renders a B/A superscript per skill) and the untrained-gating visuals is faster to scan and shorter. Presentation-only: same `actor.skills` iteration, just not pre-partitioned into three tables. Clear win for Gemini.

**3b — The "Abilities" bucket (Talents + Traits + Psychic Powers together) vs. my "Mind" (Psychic + Advances).**
**Keep them mostly separate — here I defend my structure, with one concession.** Gemini groups Talents + Traits + Psychic Powers as "Abilities." Traits + Talents together is reasonable (both are passive/always-on character features — I'll adopt *that* pairing; in R1 I'd left traits on Character, which was arbitrary). But **folding Psychic Powers in with them is wrong for a concrete reason**: psychic powers are *active, roated, resource-costed* things you cast in combat, gated by Psy Rating / class / strength / sustained-rating (the `psy` block). They behave like weapons, not like talents. A psyker mid-combat wants powers next to the *psy resource controls that govern them*, the same way weapons sit in the arsenal — not buried in a passive-features list. So:

- **Talents + Traits → one "Abilities" section** (adopting Gemini's pairing for the passive stuff).
- **Psychic Powers + the `psy` block → their own section**, structured like the arsenal (castable rows + the governing resource header).
- **Advances (XP/Corruption/Insanity) → a "Progression" section**, which lines up with Gemini's "Progression & Persona" bucket.

This actually moves me *toward* Gemini's coarse structure (Attributes/Arsenal/Abilities/Progression) more than my R1's four-tab split did. Concretely, the resolved section set is:

1. **Attributes** — characteristic table + unified skill list (+ movement).
2. **Arsenal** — weapons, armour, force-field, encumbrance, storage, cybernetics, backpack, gear.
3. **Abilities** — talents + traits.
4. **Psychic** — powers + psy block *(shown only when relevant; a non-psyker's section is near-empty — collapse it by default).*
5. **Progression & Persona** — origin path, ship role, bio, XP, corruption, insanity, journal, peers, enemies.

That's 5 collapsible bands (Gemini's 4 + a broken-out Psychic). I think the Psychic break-out earns its keep for psyker play; if the group prefers Gemini's tighter 4, folding Psychic back under a combined band is a one-line template change. Flagging it as the soft spot.

---

## (c) Remaining genuine disagreement

Honestly, very little survives.

- **Psychic as its own section vs. inside "Abilities"** (3b) is the only real one, and it's minor — it's a "psyker-heavy table vs. simpler table" preference, resolvable by whether the campaign is psyker-dense. I lean break-it-out; I won't die on it.
- **Border-strip aggressiveness:** Gemini wants to *remove* the heavy `panel_border.png` frames from inner panels (auspex-screen translucency instead). I'm more conservative — the border-image frames are a big part of the identity and there's a documented SCSS double-wrapper fragility around these rules (per CLAUDE.md). I'd **keep the outer frame on the rail and section headers, lighten inner dividers to hairlines** rather than strip frames wholesale. This is a Phase-2 visual-polish detail, not an architecture disagreement — easy to A/B live on rt-smoke and let the user eyeball.

Everything else has converged. The design is now: **persistent Command Rail + anchor-navigated collapsible content bands (Attributes / Arsenal / Abilities / Psychic / Progression) + three-tier typography (sans for data, Lusitana for prose, IM Fell for headers) + crimson-only critical states**, strictly presentation-layer with zero migration.

---

### The one call worth escalating to the user
**Nav model feel:** anchor-nav-over-collapsible-bands (my resolved position) is a genuine behavior change from "tabs." It's better on the merits, but it's the thing a long-time player's muscle memory will notice first. Worth a single live A/B on rt-smoke — bands vs. a thin tab-strip over the same sections — before committing. Everything else I'd just build.
