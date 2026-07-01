#!/usr/bin/env python3
"""Live-verify BUG-Q-249 on rt-smoke (page-context, deployed modules).

An NPC with Lightning Reflexes and pre-baked Unnatural Agility (characteristic.unnatural,
no trait item) should get the ×(N+1) Initiative multiplier (RT Core p.102), not ×2.

Ag 41 → rawBonus 4. Unnatural Agility (×2) baked → unnatural 4, bonus 8.
- Buggy (pre-fix): initUnnaturalMult resolves to 1 → initiative.bonus = 4 × (1+1) = 8.
- Fixed:          multiplier recovered from baked = 2 → initiative.bonus = 4 × (2+1) = 12.
"""
import json
from playwright.sync_api import sync_playwright

URL = "http://192.168.11.36:30000"

JS = r"""
async () => {
  const out = {};
  let baked, trait;
  try {
    // (A) NPC with baked Unnatural Agility (no trait item) + Lightning Reflexes.
    baked = await Actor.create({
      name: '__bugq249_baked__', type: 'npc',
      system: { characteristics: { agility: { base: 41, advance: 0, modifier: 0, unnatural: 4 } } },
      items: [{ name: 'Lightning Reflexes', type: 'talent', system: {} }],
    });
    out.baked_ag_bonus = baked.characteristics?.agility?.bonus ?? null;         // expect 8
    out.baked_ag_unnatural = baked.characteristics?.agility?.unnatural ?? null; // expect 4
    out.baked_init_bonus = baked.system.initiative?.bonus ?? null;             // expect 12 (was 8)

    // (B) Control: same but NO Lightning Reflexes → just the full bonus (8).
    const plain = await Actor.create({
      name: '__bugq249_plain__', type: 'npc',
      system: { characteristics: { agility: { base: 41, advance: 0, modifier: 0, unnatural: 4 } } },
    });
    out.plain_init_bonus = plain.system.initiative?.bonus ?? null;             // expect 8
    await plain.delete();
  } catch (e) {
    out.error = String(e); out.stack = e.stack;
  } finally {
    if (baked) await baked.delete();
  }
  return out;
}
"""

def run():
    with sync_playwright() as p:
        b = p.chromium.launch(headless=True)
        pg = b.new_page()
        pg.goto(URL + "/join", wait_until="networkidle")
        try:
            pg.select_option("select[name='userid']", label="Gamemaster")
        except Exception:
            pg.select_option("select[name='userid']", index=1)
        pg.click("button[name='join']")
        pg.wait_for_function("() => window.game && game.ready === true", timeout=60000)
        print(json.dumps(pg.evaluate(JS), indent=2))
        b.close()

if __name__ == "__main__":
    run()
