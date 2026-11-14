#!/usr/bin/env python3
"""Live-verify (0.9.29): NPC Unnatural Characteristic bonuses and Initiative after the
printed-total -> extra conversion. Imports real NPCs from the packs into temp actors and
reads the engine-derived characteristic bonus and initiative bonus.
Expect: Kabalite Warrior AgB 10 / Init 15 (Lightning Reflexes, x2 -> 5x3);
Farseer Serrenon AgB 10, WP bonus 10, Init 10; Lure Wraithguard SB 10, TB 12, AgB 6;
Koronus Wraithguard SB 10, TB 12; Dark Reaper Ag 50, AgB 10;
Wraithlord SB 16, TB 16 (Errata v1.4); Warp Spider Ag 52, AgB 10.
"""
import json
from playwright.sync_api import sync_playwright

URL = "http://192.168.11.36:30000"
CASES = [
    ("thesoulreaver-npcs", "Kabalite Warrior"),
    ("lureoftheexpanse-npcs", "Farseer Serrenon"),
    ("lureoftheexpanse-npcs", "Wraithguard"),
    ("thekoronusbestiary-npcs", "Wraithguard"),
    ("thekoronusbestiary-npcs", "Dark Reaper"),
    ("corebook-npcs", "Eldar Corsair"),
    ("thekoronusbestiary-npcs", "Wraithlord"),
    ("thekoronusbestiary-npcs", "Warp Spider"),
]
JS = r"""
async (cases) => {
  const out = {};
  for (const [pack, name] of cases) {
    const src = (await game.packs.get('rogue-trader-3rd.' + pack).getDocuments()).find(a => a.name === name);
    const a = await Actor.create({ ...src.toObject(), name: '__unnat_probe__' });
    try {
      const c = a.system.characteristics;
      out[pack + ' :: ' + name] = {
        Ag: [c.agility.total, c.agility.bonus], S: [c.strength.total, c.strength.bonus],
        T: [c.toughness.total, c.toughness.bonus], WP: [c.willpower.total, c.willpower.bonus],
        initBonus: a.system.initiative.bonus,
      };
    } finally { await a.delete(); }
  }
  return out;
}
"""

def run():
    errors = []
    with sync_playwright() as p:
        b = p.chromium.launch(headless=True)
        pg = b.new_page(viewport={"width": 1920, "height": 1080})
        pg.on("pageerror", lambda e: errors.append(str(e)))
        pg.goto(URL + "/join", wait_until="networkidle")
        pg.select_option("select[name='userId']", label="Gamemaster")
        pg.click("button[name='join']")
        pg.wait_for_function("() => window.game && game.ready === true", timeout=60000)
        if not pg.evaluate("() => game.settings.get('core', 'noCanvas')"):
            pg.evaluate("() => game.settings.set('core', 'noCanvas', true)")
            pg.reload(wait_until="networkidle")
            pg.wait_for_function("() => window.game && game.ready === true", timeout=60000)
        out = pg.evaluate(JS, CASES)
        out["page_errors"] = errors
        b.close()
    print(json.dumps(out, indent=1))

if __name__ == "__main__":
    run()
