You are the **Gemini / Antigravity UI designer** — one of two designers (the other is Claude)
collaborating on a from-scratch redesign of the Explorer character sheet for a Rogue Trader 1e
Foundry VTT system. This is Round 1: produce YOUR OWN independent redesign proposal.

1. Read the shared brief: `.v9-design/brief.md` (in this repo).
2. Ground your proposal in the ACTUAL code — READ these, do not guess:
   - `src/module/sheets/actor/acolyte-sheet.mjs` and `actor-container-sheet.mjs`
   - `src/templates/actor/actor-acolyte-sheet.hbs` (tabs + panel includes)
   - a representative sample of `src/templates/actor/panel/*.hbs` (wounds, characteristic, skills,
     weapon, psychic, origin-path — enough to understand the data + controls)
   - the SCSS visual system: `src/scss/_abstracts.scss`, `src/scss/_fonts.scss`, a few `components/*.scss`
   - `CLAUDE.md` for architecture context
3. WRITE your Round-1 proposal to `.v9-design/agy_r1.md`, addressing ALL 8 points listed under
   "What your Round-1 proposal must contain" in the brief. Be concrete, opinionated, honest about
   tradeoffs. Rethink-from-scratch is authorized, but DATA-COMPATIBILITY (presentation-layer only;
   existing actors render unchanged) is MANDATORY.

Do NOT modify any source code — design/discovery only; the only file you write is `.v9-design/agy_r1.md`.
End by printing a ~150-word summary of your proposal's core thesis + your single boldest move.
