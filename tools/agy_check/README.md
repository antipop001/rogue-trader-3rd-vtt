# agy_check — cross-model pre-implementation review (STANDARD)

Before implementing (committing/deploying) a non-trivial fix, have a DIFFERENT model
(Antigravity / Gemini) independently review the change against verbatim canon. Catches
plausible-but-wrong fixes the author's own model would rubber-stamp.

## Use
1. Build the fix — edit the code, do **not** commit.
2. Write `.agy-check/context.md`: the bug, the intended behaviour, and the CANON citation
   (RT 1e rule + RT-DOCS `file:line` or a verbatim quote).
3. `tools/agy_check/agy_check.sh`
4. Read `.agy-check/verdict.md`. First line is `VERDICT: APPROVE` or `VERDICT: REVISE`.
   On REVISE, address the points and re-run. Implement only once APPROVE (or with a
   documented override of a specific point).

Files: `check_fix.agy.md` (reviewer prompt), `agy_check.sh` (driver). Review artifacts land
in `.agy-check/` (gitignored). Sibling of the `loops/antigravity-qa/` loop, same `agy` CLI.
