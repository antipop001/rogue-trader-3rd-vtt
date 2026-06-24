# Ralph loop — one task per iteration (rogue-trader-3rd-vtt)

You are one iteration of an autonomous build loop on the Rogue Trader 3rd Edition
Foundry VTT system. You start from **fresh context** every time. Do exactly one
task, verify it, commit it, stop.

## Read first (the @ files are your authority)
- @fix_plan.md — the mutable TODO list. The next task is the **single
  highest-priority unchecked `[ ]` item** at the top of the active list.
- @specs/README.md — index of the **frozen requirements** in `specs/`. Each task
  cites a requirement ID; open the relevant `specs/*.md` to confirm intended behaviour.
- @CLAUDE.md — project architecture, the V2-sheet gotchas, the Foundry V14 LevelDB
  cache trap, the chargen conventions, and the deploy loop. Obey every landmine.

The current focus of this loop is **fully automating Origin-Path "background"
content** — turning the ~95 background traits the origin-path data grants (Home
World / Birthright / Lure / Trials / Motivation / Warrant & dynasty / Ork-klan /
Kroot-kindred / taint outcomes such as `Mutant`, `Void Accustomed`, `Ill-Starred`,
`Acquisition: …`, `Klan: …`) into **real `src/packs/traits/traits.yml` compendium
items with full mechanical automation (ActiveEffects / conditionalBonuses)**, so
they "work like everything else" (drag-drop onto a sheet, bonuses auto-apply, and
they resolve at chargen-commit instead of stubbing). Plus the 3 talent grants that
still stub. The in-Foundry chargen *wizard* is SHELVED (parked on branch
ralph/chargen, UI disabled) — do NOT build wizard pages here. Canon source: RT
Core + Into the Storm markdown at `/mnt/project_data/RT/RT-DOCS/`. The trait names
to author come from `src/module/chargen/data/*.json` (the grant effects); match
each new item's `name:` EXACTLY so chargen-commit resolves it. Do not invent
mechanics — cite the book.

## The rule: ONE task
1. Pick the single most important unchecked item in @fix_plan.md. **Do only that.**
   Do not start a second item. Do not "while I'm here" anything.
2. Implement the smallest correct change that satisfies the cited requirement.
3. Keep your own context lean (**< 100k tokens**): for anything that returns a lot
   of output — grepping the codebase, reading large files (`origin.mjs`,
   `careers.json` ~339KB, `equipment.json` ~173KB, `chargen-wizard.mjs`), reading
   the RTT_MAKER `.py` reference, surveying tests — **spawn a subagent** (Agent
   tool) and consume its summary, not the raw dump.

## Architecture landmines (a green gate does NOT license violating these)
- **The chargen engine stays pure JS, no Foundry globals.** Everything under
  `src/module/chargen/` (characteristics/state/mapping/origin/commit/data/xp/…)
  must run under `node --test` with dice injected. Foundry-only glue lives in
  `src/module/applications/chargen-wizard.mjs` and the Foundry half of `commit.mjs`.
- **Chargen data is VENDORED from RTT_MAKER** via `tools/sync_chargen_data.py`.
  Do NOT hand-edit the JSON in `src/module/chargen/data/` — add the file to the
  sync script's FILES list and re-vendor (`python3 tools/sync_chargen_data.py
  --execute`). If a fix can't come from RTT_MAKER, log the deviation. (ARCH-002.)
- **Replay model:** wizard decisions live in `this.inputs`; `ChargenState` is
  rebuilt from scratch on every change. Don't mutate committed state in place.
- **Commit conventions:** `bio.homeWorld` is deliberately NEVER written (DH2
  collision). Unmapped skills/specialities go to bio notes, never dropped.
- **AppV2 gotcha:** the builder state property is `chargenState`, NOT `state`
  (read-only getter). SCSS for the wizard imports at top level, outside `.rt-wrapper`.

## Backpressure (a change is rejected unless the gate is green)
Run, from the repo root, IN ORDER:
1. `npm run build:check` — must exit 0 (`gulp compile`: clean + SCSS + copy +
   packs; catches SCSS/template/pack/syntax breakage. This is the lean gate target —
   it skips the release-zip step that `npm run build` does).
2. `npm test` — `node --test tests/chargen/*.test.mjs` — must pass.
   **New engine logic MUST ship with node tests** under `tests/chargen/`.
3. E2E (Playwright `tests/e2e/`, run with the RTT_MAKER venv python — system
   python lacks playwright; needs a deployed build + live rt-smoke world + free
   GM seat) — **NOT run in the inner loop.** When your change lands a wizard-UI
   stage, add a follow-up item to run/extend the matching `verify_*.py` E2E.
All required checks (1 and 2) must be green. **If either fails, the change is
REJECTED — never commit a red gate, and never leave your edits in the tree.** Do
this, in order, exactly:
1. **Discard ALL of your task's edits** so the working tree matches HEAD:
   `git checkout -- .` then `git clean -fd`. Do NOT delete anything under `.ralph/`.
2. Append a reflection to `.ralph/errors.log` (format below).
3. Record the rejection and keep the tree clean:
   `git add .ralph/errors.log && git commit -m "ralph(iter <N>): REJECTED <task> — <cause>"`.
4. Confirm `git status --porcelain` is **empty**, then **stop**.

## Compendium content you DO hand-author (the deliverable)
The new trait/talent items go directly into `src/packs/traits/traits.yml` and
`src/packs/talents/talents.yml` (hand-edited YAML — that IS the work; the `.db` is
a build artifact rebuilt by `build:check`). This is the ONE exception to the
"don't hand-edit data" rule, which still applies to `src/module/chargen/data/*.json`
(vendored — never hand-edit those; they are the read-only worklist + canon text source).

The green gate canNOT verify RT-rules correctness of authored content. So whenever
you author/modify compendium entries, append a one-line entry to
`@.ralph/data-vendor-queue.md` (`iter N | traits.yml → N items authored (names) →
REQ-ID → canon cites`) for separate RT-rules review, and cite the RT-DOCS page in
each entry's `source:` field. (PROC-003.)

## On success
- `git add -A` and commit with this structured message:
  ```
  ralph(iter <N>): <one-line what changed>

  Requirement: <REQ-ID(s)>
  Verified: build OK, node test <count> passed (<key test(s) that prove it>)

  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  ```
  `<N>` is the current iteration from the `$RALPH_ITER` env var (fallback: count
  prior `ralph(iter` commits + 1).
- In @fix_plan.md: check the item `[x]`, and append any concrete follow-ups you
  discovered to the bottom of the active list (small, single-iteration each).
- Then **stop** (the outer loop starts a fresh iteration).

## errors.log format (on failure)
```
## iter <N> · <UTC timestamp> · <task title>
cause: <what failed — the gate + the actual error, one or two lines>
reflection: <why it happened and what the next attempt should do differently>
```

## Stop condition
If @fix_plan.md has no unchecked `[ ]` items in the active list (everything left is
under "Needs clarification" / "Decisions"), create an empty file `.ralph/STOP` and
exit without committing — the loop will halt.
