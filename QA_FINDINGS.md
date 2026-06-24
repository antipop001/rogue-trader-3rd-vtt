# QA findings — Rogue Trader 3rd (correctness / DH2-leftover / automation-gap audit)

Filed by the QA-audit Ralph loop (`specs/07-qa-audit.md`, `fix_plan.md`). Each finding
is verified against the source (file:line read) + RT canon. This is a triage list for a
human / a later fix-loop — confirmed P0/P1 engine bugs get promoted to `BUGS.md`.
Already-fixed bugs live in `BUGS.md` (BUG-001…010) and are NOT re-filed here.

Format per finding:
```
### QA-<NNN> — <title>
- area: <rules|schema|weapons|armour|cybernetics|talents|traits|psychic|ship|sheet-ui|acquisition|data-quality|naming|other>
- kind: <dh-leftover|automation-gap|data-quality|cosmetic|not-a-bug>
- severity: <P0|P1|P2|P3>
- evidence: <file:line> — <quote/paraphrase>
- canon: <RT-DOCS ref or "n/a — code smell">
- gap: <does X, should do Y>
- fix: <suggestion> · autofixable: <yes|no>
```

---

<!-- findings appended below, numbered QA-001, QA-002, … -->
