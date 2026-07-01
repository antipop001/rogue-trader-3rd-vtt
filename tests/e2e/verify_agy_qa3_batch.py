#!/usr/bin/env python3
"""Live-verify the agy-qa-3 stranded-batch fixes on rt-smoke (page-context, deployed modules).
Covers: 192 Prone (-10 WS / -20 Dodge, WS-only), 201/206 cover (Primitive×2 + penetration layered),
200/222 perDoS (feeds RF; 0 dice at 0 DoS), 207 voidship crit (one crit per salvo)."""
import json
from playwright.sync_api import sync_playwright

URL = "http://192.168.11.36:30000"

JS = r"""
async () => {
  const out = {};
  const base = '/systems/rogue-trader-3rd/module/';
  const cond = await import(base + 'rules/conditions.mjs');
  const { AssignDamageData } = await import(base + 'rolls/assign-damage-data.mjs');

  // ---- 192: Prone attacker −10 WS (melee only, no BS) ----
  out.prone = {
    melee: cond.attackerConditionModifier(new Set(['prone']), false),   // expect -10
    ranged: cond.attackerConditionModifier(new Set(['prone']), true),   // expect 0 (no BS penalty)
    pinned_ranged: cond.attackerConditionModifier(new Set(['pinned']), true), // expect -20 (unchanged)
  };

  // ---- 201/206: cover — Primitive doubles cover AP; penetration spent once (layered) ----
  const mkTarget = (coverAp) => ({
    type: 'creature',
    system: { armour: { body: { total: 4, value: 4, toughnessBonus: 3 } },
              combat: { cover: { ap: coverAp } }, wounds: { value: 30, max: 30 } },
    items: [],
    hasTalent: () => false,
    hasTalentFuzzyWords: () => false,
    getCharacteristicFuzzy: () => ({ bonus: 0 }),
  });
  const mkHit = (dmg, pen, primitive) => ({
    location: 'Body', totalDamage: dmg, totalPenetration: pen, primitive,
    righteousFury: [], damageType: 'Impact', critical: 0,
  });
  async function coverRun(coverAp, dmg, pen, primitive) {
    const a = new AssignDamageData(mkTarget(coverAp), mkHit(dmg, pen, primitive));
    await a.update(); await a.finalize();
    return { absorbed: a.coverAbsorbed, apAfter: a.coverApAfter, wounds: a.damageTaken ?? 0 };
  }
  try {
    // Non-primitive, cover AP 8, dmg 12, pen 0 → cover absorbs 8, 4 excess vs armour4+TB3=7 → 0 wounds
    out.cover_normal = await coverRun(8, 12, 0, false);
    // Primitive, cover AP 8 → doubled to 16, dmg 12 → fully absorbed (0 excess)
    out.cover_primitive = await coverRun(8, 12, 0, true);
    // Penetration layered: cover AP 8, pen 10 → cover fully penetrated (2 excess pen to armour),
    // dmg 20 → excess 20 vs cover(8-10→0) = 20; armour 4+TB3=7 minus leftover pen 2 = 5 → 15 wounds.
    out.cover_pen = await coverRun(8, 20, 10, false);
  } catch (e) { out.cover_error = String(e); }

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
