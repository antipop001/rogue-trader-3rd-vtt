#!/usr/bin/env python3
"""Live-verify BUG-Q-245 on rt-smoke (page-context, deployed modules).

Confirms the second-pass armour refresh:
  (1) cached `armour.body.toughnessBonus` tracks a post-AE Toughness change
      (the original bug — a -20 Toughness AE must drop TB from 4 to 2);
  (2) an AE that directly modifies armour AP (`system.armour.body.value`) is
      PRESERVED, not wiped by the second pass (the dispute the fix addresses).
"""
import json
from playwright.sync_api import sync_playwright

URL = "http://192.168.11.36:30000"

JS = r"""
async () => {
  const out = {};
  let actor;
  try {
    actor = await Actor.create({
      name: '__bugq245_probe__', type: 'acolyte',
      system: { characteristics: { toughness: { base: 40, advance: 0, modifier: 0 } } },
    });

    // Baseline: TB should be 4 (40/10), no armour, no AE.
    out.baseline_tb = actor.system.characteristics.toughness.bonus;
    out.baseline_armour_tb = actor.system.armour.body.toughnessBonus;
    out.baseline_armour_value = actor.system.armour.body.value;

    // AE 1: -20 Toughness (drug comedown). AE 2: +5 armour.body.value (psychic ward).
    await actor.createEmbeddedDocuments('ActiveEffect', [{
      name: 'ToughDown', changes: [
        { key: 'system.characteristics.toughness.modifier', mode: 2, value: '-20' },
      ],
    }, {
      name: 'BodyWard', changes: [
        { key: 'system.armour.body.value', mode: 2, value: '5' },
      ],
    }]);

    const a = actor.system.armour.body;
    out.postAE_tb = actor.system.characteristics.toughness.bonus;   // expect 2 (20/10)
    out.postAE_armour_toughnessBonus = a.toughnessBonus;            // expect 2 (was stale 4)
    out.postAE_armour_value = a.value;                              // expect 5 (AE preserved, not wiped)
  } catch (e) {
    out.error = String(e);
  } finally {
    if (actor) await actor.delete();
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
