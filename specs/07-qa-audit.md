# 07 — QA / correctness audit loop

A **discovery** loop (not a fix loop): systematically hunt the whole system for (a)
leftover **Dark Heresy 2e** mechanics that should be RT 1e, and (b) general
correctness/automation gaps — **things described in the rules/data/UI that the engine
does not actually do** ("not automated but should be"). The product is a triaged
findings file, `QA_FINDINGS.md`, that a human (or a later fix-loop) acts on. This loop
**files findings; it does not fix** (except a trivially-safe, obviously-correct change
— and only when gate-green).

Canon: RT Core + Into the Storm at `/mnt/project_data/RT/RT-DOCS/`. Background: the
"2026-05-13 System audit findings" + "Not yet done" / "Known gaps" sections in
`CLAUDE.md` are a starting map (some items there are now DONE — re-verify against
current code before filing). Already-fixed engine bugs live in `BUGS.md` (BUG-001…010);
don't re-file those.

## The finding format (one block per finding in `QA_FINDINGS.md`)
```
### QA-<NNN> — <one-line title>
- area: rules | schema | weapons | armour | cybernetics | talents | traits | psychic |
        ship | sheet-ui | acquisition | data-quality | naming | other
- kind: dh-leftover | automation-gap | data-quality | cosmetic | not-a-bug
- severity: P0 (wrong result in play) | P1 (missing automation, manual workaround) |
            P2 (cosmetic / data) | P3 (nice-to-have)
- evidence: <file:line(s) you READ> + a short quote/paraphrase of the code/data
- canon: <RT-DOCS page / rule> that says what SHOULD happen (or "n/a — code smell")
- gap: <what the system does vs what it should do>
- fix: <concrete suggested fix> · autofixable: yes/no
```

## Hard rules (backpressure for a discovery loop)
- **Verify before you file.** Every finding MUST cite a real `file:line` you actually
  read (grep + open it) and, for a rules/automation claim, the RT canon that mandates
  the behaviour. NO speculation, NO "probably". If you can't confirm it's broken, don't
  file it.
- **Don't re-file** what's already in `BUGS.md` (fixed) or already in `QA_FINDINGS.md`.
  Re-verify CLAUDE.md's old audit items against current code — many are DONE.
- **Discovery, not fixing.** Default to filing. Only make a code change for a
  trivially-safe, unambiguous fix (e.g. a dead DH2 string, a one-line data typo), and
  only if `build:check` + `npm test` stay green. Anything with rules/judgement → file it.
- Keep context lean (<100k): grep/subagent for wide scans; read excerpts, not whole files.

## Requirements
- **QA-AUDIT (MUST)** Each task audits ONE dimension, appends its verified findings to
  `QA_FINDINGS.md` (numbered QA-NNN), and APPENDS any newly-discovered sub-areas as
  follow-up audit tasks to `fix_plan.md`. Dimensions to cover (seed list; expand as
  found):
  1. **DH2 rules modules** — `rules/{homeworlds,backgrounds,divinations,roles,elite-advances}.mjs`: DH2 content, dead code, anything that leaks DH2 into actors (e.g. `backgroundEffects`, DH2 aptitude pairs). What's still wired vs orphaned by the shelved wizard?
  2. **DH2 schema** — `template.json`: `influence` characteristic, `aptitudes`, `threatLevel`, `subtlety`, DH2 bio fields, parry-as-skill, any unused/DH2-only fields.
  3. **DH2 naming/strings** — `DarkHeresy*` class names (24 files), "Dark Heresy" log/UI strings, fork cruft (cosmetic; low severity but catalogue them).
  4. **DH2 skills/specialties** — any remaining DH2 consolidations or specialty-list drift vs RT canon (Common/Forbidden/Scholastic Lore counts, etc.).
  5. **Weapons automation** — special qualities described but not wired (Snare/Concussive/Toxic/Spray/Hellfire/Recharge/Storm edge cases…), craftsmanship effects, jam/overheat, Blast/Scatter handling.
  6. **Armour / force fields** — force-field overload (Table 3-10), Good/Poor craftsmanship armour, `maxAgility` penalty, coverage.
  7. **Cybernetics** — remaining description-only bonuses not wired (effects-audit did ~9; CLAUDE.md noted ~16).
  8. **Talents/traits** — anything the effects-audit loop left as "narrative" that is actually automatable; per-DoS / per-rank scaling; conditional gaps.
  9. **Psychic** — phenomena/perils auto-roll path correctness, per-DoS damage scaling, Navigator tier progression, range edge cases.
  10. **Ship combat** — homebrew critical-damage tables vs RT Table 8-12, VU positioning, Strategic Round structure, component bonuses coverage.
  11. **Sheet / UI** — fields shown but non-functional; values computed but not displayed; controls that no-op.
  12. **Acquisition / economy** — Profit Factor flows, acquisition modifier coverage.
  13. **Data quality** — NPC math (wounds.max=0, empty weapon `damage`, orphan skills), OCR artifacts in pack descriptions.
  14. **Completeness critic** — re-scan: which dimensions were shallow? what modality wasn't run? append the gaps.

## Gate
`npm run build:check` + `npm test` must stay green (catches any accidental breakage from
a trivial fix; pure-audit iterations pass trivially). Finding *correctness* is not
gate-checkable — that's the point of the verify-before-file rule + human review of
`QA_FINDINGS.md`. Severity-P0/P1 findings that are confirmed engine bugs should be
promoted to `BUGS.md` by a human (or noted for the fix-loop).

## Out of scope
- Fixing (beyond trivially-safe). The chargen wizard (shelved). Re-litigating
  already-fixed BUGS.md items. Inventing rules not in RT Core + ItS.
