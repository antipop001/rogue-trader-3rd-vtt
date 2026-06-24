# fix_plan — QA / correctness audit

A **discovery** loop. One task per iteration = audit ONE dimension per
`specs/07-qa-audit.md`: grep + read the relevant code/data, VERIFY each issue against
the source (and RT canon for rules claims), append numbered findings to
`QA_FINDINGS.md`, append any newly-found sub-areas as tasks here, gate green
(`build:check` + `npm test`), commit. **File findings; don't fix** (except a
trivially-safe, gate-green change). Don't re-file `BUGS.md` (fixed) items. Re-verify
CLAUDE.md's old audit list against current code — many are DONE.

## Active list

- [x] QA-DH-RULES — Audited. 3 findings (QA-001..003): DH2 background/homeworld/role/divination pipeline still runs in live `prepareData()` (dormant but latent-leak), `divinations.mjs` = Emperor's Tarot (no RT analog), `elite-advances` dead-store. All DH2 modules confirmed live-imported by `acolyte.mjs` + `config.mjs` but no UI/pack data sets the legacy bio fields. (QA-AUDIT)
- [x] QA-DH-SCHEMA — Audited. 5 findings (QA-004..008): aptitude system still live (acolyte field + `aptitude` Item type + Aptitudes panel on the active V2 sheet) (QA-004); talent schema DH2 `aptitudes`/`tier` rendered on item sheet, `tier` consumed by nothing (QA-005); fixed dangling `"Inf"` (removed Influence char) on `charm.characteristics` (QA-006, trivial fix, gate green); `threatLevel` getters with no consumer (QA-007); not-a-bug rollup — `subtlety` correctly absent, `influence` characteristic removed, parry-as-skill a deliberate documented deviation (QA-008). (QA-AUDIT)
- [ ] QA-DH-NAMING — Catalogue `DarkHeresy*` class names (24 files) + "Dark Heresy" log/UI strings + fork cruft. Cosmetic; one rollup finding with the list. (QA-AUDIT)
- [ ] QA-DH-SKILLS — RT-canon check of the skill list + specialty lists (Common/Forbidden/Scholastic Lore, Trade, Linguistics split) vs RT Core; flag any DH2 drift. (QA-AUDIT)
- [ ] QA-WEAPONS — Weapon special qualities described in `weapons.yml`/`attack-specials` but NOT wired in `rolls/*.mjs` (Snare/Concussive/Toxic/Spray/Hellfire/Recharge/Blast/Scatter…); craftsmanship, jam/overheat edges. (QA-AUDIT)
- [ ] QA-ARMOUR-FIELDS — Force-field overload (Table 3-10), Good/Poor craftsmanship armour, `maxAgility` penalty, coverage gaps. (QA-AUDIT)
- [ ] QA-CYBERNETICS — Description-only cybernetic bonuses still unwired after the effects-audit pass (CLAUDE.md noted ~16). (QA-AUDIT)
- [ ] QA-TALENTS-TRAITS — Talents/traits the effects-audit loop recorded as "narrative" that are actually automatable; per-DoS/per-rank scaling; conditional gaps. (QA-AUDIT)
- [ ] QA-PSYCHIC — Phenomena/Perils auto-roll path correctness, per-DoS damage scaling, Navigator tier progression, range edges. (QA-AUDIT)
- [ ] QA-SHIP — Homebrew critical-damage tables vs RT Table 8-12, VU positioning, Strategic Round, component-bonus coverage. (QA-AUDIT)
- [ ] QA-SHEET-UI — Sheet fields shown but non-functional; computed-but-not-displayed; no-op controls. (QA-AUDIT)
- [ ] QA-ACQUISITION — Profit Factor flows + acquisition modifier coverage vs RT Core p.270. (QA-AUDIT)
- [ ] QA-DATA-QUALITY — NPC math (wounds.max=0, empty weapon `damage`, orphan skills), OCR artifacts in pack descriptions. (QA-AUDIT)
- [ ] QA-DH-BONUSES-PANEL — `bonuses-panel.hbs` (renders `backgroundEffects.abilities`) is registered as a preload partial (`handlebars-manager.mjs:20`) but is NOT invoked by any sheet template (`{{> ...bonuses}}` appears nowhere). Verify it's truly dead and catalogue other registered-but-uninvoked partials. (QA-AUDIT)
- [ ] QA-CRITIC — Completeness pass: which dimensions were shallow / which modality wasn't run? Append the gaps as new tasks. (QA-AUDIT)

## Notes
- Findings → `QA_FINDINGS.md` (numbered QA-NNN, format in `specs/07`). Confirmed P0/P1
  engine bugs get promoted to `BUGS.md` by a human afterward.
- Verify before filing (file:line read + canon cite). No speculation. Discovery only.

## Out of scope
- Fixing (beyond trivially-safe gate-green); the chargen wizard (shelved); re-filing
  BUGS.md items; inventing non-RT rules.
