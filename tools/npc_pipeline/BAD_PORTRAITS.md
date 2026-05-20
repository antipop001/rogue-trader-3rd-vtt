# BAD NPC portraits — manual cleanup queue

31 NPCs still have a wrong-subject portrait (subject mismatch, incoherent
mush, or duplicate-art swap with another NPC) after the colorize +
verification + rematch + rename pass.

Three additional entries from earlier sweeps — Requirescant In Pace, Taking
Trophies, Strangler — have been **dropped** from the compendia entirely
(they're flavor sidebars, not real stat blocks).

Bone Conqueror (formerly "Guardian Of The Dead") was given a fresh portrait
from `img-83.jpeg` during the rename pass and is **pending re-verification**
— no longer on this list.

Page numbers are computed from the parser's recorded stat-block line via
per-page markdown boundary counts, so they reflect the actual canonical
page (not a word-frequency guess like the earlier draft).

Triage path: open `/mnt/project_data/RT/RT-DOCS/<book>.pdf/pages/page-N/`
to see what art (if any) actually depicts the NPC, then either:

- **Reassign a different reference**: pick a better `img-N.jpeg` from the
  same or adjacent page, update the entry in `/tmp/npc_verified/<book>.json`,
  and re-run `tools/npc_pipeline/comfy_npc_colorize.py`.
- **Drop the portrait entirely**: delete
  `src/images/npcs/<book>/<slug>.png`. The YAML builder will leave `img`
  blank and Foundry will fall back to its default `icons/svg/mystery-man.svg`.

| Book | NPC | Page |
|---|---|---|
| The Navis Primer | Squig | p.58 |
| The Navis Primer | Inquisitor Havelock Blackheel | p.112 |
| The Navis Primer | Culexus Assassin | p.114 |
| The Navis Primer | Ork Weirdboy | p.129 |
| The Navis Primer | Ork Warphead | p.130 |
| The Navis Primer | Plaguebearer | p.140 |
| Twilight Crusade | Forgefiend | p.109 |
| Twilight Crusade | Maulerfiend | p.109 |
| Citadel of Skulls | Iniquity-Pattern Combat Servitor | p.61 |
| Citadel of Skulls | Tunnel Horror | p.65 |
| The Soul Reaver | Grotesque | p.125 |
| The Soul Reaver | Fleshwrought Drake | p.131 |
| Stars of Inequity | Gretchin Headhunter | p.75 |
| Stars of Inequity | Kanrak | p.130 |
| Stars of Inequity | Skabgob | p.133 |
| Lure of the Expanse | Gun-Master | p.126 |
| Lure of the Expanse | Priest-King Ansai | p.127 |
| Lure of the Expanse | Pathfinder | p.130 |
| Hostile Acquisitions | The Criminal Mastermind | p.127 |
| Hostile Acquisitions | Lathe-Pattern Murder Servitor | p.87 |
| RT Core Rulebook | Warp Predator (Ebon Geist) | p.176 |
| RT Core Rulebook | Renegade | p.171 |
| Edge of the Abyss | Master Shaper Ashak Kor Of The Misthound Kindred | p.66 |
| The Frozen Reaches | Attack Squig | p.59 |
| The Frozen Reaches | Damaris Skitarii Tech-Guard | p.62 |
| The Frozen Reaches | Warboss Snokgritz | p.61 |
| Fallen Suns | Farseer Caille | p.62 |
| Fallen Suns | Warlock Bhaine Dhûn | p.63 |
| Shedding Light | Cryptek | p.16 |
| Faith and Coin | Guardian of the Inner Sanctum | p.141 |
| Game Master's Kit | Statues Of The Dark Lament | p.17 |

## Failure-mode breakdown

**Duplicate art** (two or more NPCs share one canonical reference and got
identical-or-near-identical low-denoise output):
- Forgefiend / Maulerfiend (both inherited the Heldrake dragon art)
- Iniquity-Pattern Combat Servitor (inherited the Heretek's robed Mechanicus image)
- Cryptek (inherited the Canoptek Wraith art)
- Ork Weirdboy / Ork Warphead (both got the same Chaos-sorcerer-styled image)
- Gretchin Headhunter (got the Stranded Ork brawl)
- Attack Squig / Warboss Snokgritz (both got the hulking Ork art)
- Pathfinder, Priest-King Ansai, Gun-Master — each shares with another Lure NPC

**Reference is wrong subject** (the ref-selection algorithm picked an image
that's near the stat block but not actually the NPC):
- Squig (got a robed psyker with lightning)
- Culexus Assassin (incoherent mush — no clear assassin)
- Plaguebearer (incoherent star/tentacle shape)
- Master Shaper Ashak Kor (got Space Marines with flamers, no Kroot)
- Warp Predator (Ebon Geist) (got a starscape, no creature)
- Statues Of The Dark Lament (got an architectural floor-plan)
- Tunnel Horror (got a horned dragon head, should be arachnid)
- Grotesque (got tentacle-mech)
- Fleshwrought Drake (got Kroot art)
- Damaris Skitarii Tech-Guard (got a plain Guardsman, no augmetics)
- Guardian of the Inner Sanctum (incoherent mush)

**Subject drift / partial match** (image is in the right family but doesn't
specifically depict the named NPC):
- Inquisitor Havelock Blackheel (got a psychic banner-figure)
- Kanrak (Ork mob scene, not the named character)
- Skabgob (fantasy goblin, not gretchin)
- The Criminal Mastermind (got the same image as The Inquisitor)
- Renegade (got the same image as Free Trader Captain)
- Farseer Caille / Warlock Bhaine Dhûn (both look identical, only one is canon)

## Re-roll workflow

If you want to reassign refs in bulk, the pipeline still has all the tools:
1. Edit `/tmp/npc_verified/<book>.json` — change `reference` to a new path
   (or set `verdict: "WRONG"` to drop the portrait)
2. `python3 tools/npc_pipeline/comfy_npc_colorize.py --upload`
3. `npm run build` → rsync `images/` + `packs/` to the test server
4. Cache-clear + restart Foundry

Existing portraits at `src/images/npcs/<book>/<slug>.png` need to be deleted
first if you want them re-rolled, since the colorize script is idempotent.
