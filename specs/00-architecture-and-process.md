# 00 — Architecture & Process

## ARCH — architecture invariants

- **ARCH-001 (MUST)** The chargen *engine* — everything under
  `src/module/chargen/` (`characteristics.mjs`, `state.mjs`, `mapping.mjs`,
  `origin.mjs`, `commit.mjs` planning half, `data.mjs`, and any new module such as
  `xp.mjs` / `equipment.mjs`) — is **pure JS with no Foundry globals**. Dice are
  injected. All engine behaviour MUST be exercisable under `node --test` without a
  Foundry runtime. Foundry-only glue (document CRUD, pack loading, UI) lives in
  `src/module/applications/chargen-wizard.mjs` and the Foundry half of `commit.mjs`.

- **ARCH-002 (MUST)** Chargen rules-data is **vendored from RTT_MAKER** via
  `tools/sync_chargen_data.py`. The JSON in `src/module/chargen/data/` is a
  generated artifact: do NOT hand-edit it. To change data, add/keep the file in the
  sync script's FILES list and run `python3 tools/sync_chargen_data.py --execute`.
  Each vendored file carries `_meta.vendored_from/on/by`. If a needed fix does not
  exist in RTT_MAKER, fix it there first, or record the deviation explicitly.

- **ARCH-003 (MUST)** **Replay model.** All wizard decisions live in `this.inputs`;
  `ChargenState` is rebuilt from scratch on every change so editing an earlier step
  auto-invalidates downstream picks (dropped picks surface as warnings, never
  silent). New stages (career XP, equipment) MUST store their decisions in
  `this.inputs` and participate in the rebuild, not mutate a persisted state.

- **ARCH-004 (MUST)** **Commit conventions** (`commit.mjs`): `system.bio.homeWorld`
  is deliberately never written (avoids DH2 `homeworlds()` backgroundEffects
  collision). Unmapped skills/specialities are appended to bio notes, never dropped.
  Talents resolve compendium-exact → alias → pickable+`system.choice` → stub; traits
  resolve compendium → stub with rules text. New grant types (career skills/talents/
  traits, starting gear) MUST follow the same never-drop, stub-on-gap discipline.

- **ARCH-005 (MUST)** **The 500-XP pool is a single shared budget.** Origin-option
  `xp_cost` and career advances both debit it. Overspend handling follows the
  existing origin pattern (the one warn-don't-block exception): surface an error,
  don't silently truncate. `experience.used` on the committed actor reflects total
  spend (origin + career advances).

## PROC — process / quality gates

- **PROC-001 (MUST)** A change is accepted only if the gate is green, in order:
  (1) `npm run build:check` exits 0 (`gulp compile` — clean + SCSS + copy + packs,
  no release zip); (2) `npm test` (`node --test tests/chargen/*.test.mjs`) passes.
  New engine logic ships with node tests under `tests/chargen/`.

- **PROC-002 (MUST)** One task per iteration (the top unchecked `fix_plan.md` item).
  Never batch. Never commit a red or dirty tree; on failure revert, log to
  `.ralph/errors.log`, commit that, stop.

- **PROC-003 (MUST)** Any re-vendor of `src/module/chargen/data/*.json` is logged to
  `.ralph/data-vendor-queue.md` for separate RT-rules/OCR review — the green gate
  cannot see content correctness. Verify against `/mnt/project_data/RT/RT-DOCS/`.

- **PROC-004 (SHOULD)** Wizard-UI changes get an E2E verification (Playwright,
  `tests/e2e/verify_*.py`, run with the RTT_MAKER venv python against the rt-smoke
  world). E2E is NOT part of the inner gate (it needs a deployed build + live world
  + free GM seat); land it as a follow-up item when a UI stage ships.
