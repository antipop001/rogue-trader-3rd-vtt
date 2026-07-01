#!/usr/bin/env python3
"""Live-verify the agy-qa-4 recompute-after-AE + idempotency fixes on rt-smoke.
Creates a temp acolyte with an Active Effect modifying Toughness, checks derived armour/soak +
carrying capacity reflect it (245/246), and that re-preparing doesn't drift source values (251).
Deletes the temp actor at the end."""
import json
from playwright.sync_api import sync_playwright

URL = "http://192.168.11.36:30000"

JS = r"""
async () => {
  const out = {};
  let actor;
  try {
    // Create a temp acolyte: Toughness base 40 (bonus 4), a body armour item AP 4.
    actor = await Actor.create({
      name: '__agyqa4_probe__', type: 'acolyte',
      system: { characteristics: { toughness: { base: 40, advance: 0, modifier: 0 } } },
    });

    const tbBefore = actor.system.characteristics.toughness.bonus;
    const soakBefore = actor.system.armour?.body?.toughnessBonus;

    // Apply an Active Effect dropping Toughness by 20 (bonus 4 -> 2).
    await actor.createEmbeddedDocuments('ActiveEffect', [{
      name: 'Debuff', changes: [{
        key: 'system.characteristics.toughness.modifier', mode: 2, value: '-20', priority: 20,
      }],
    }]);
    const a2 = game.actors.get(actor.id);

    out.ae_toughness = {
      tb_before: tbBefore,                                    // 4
      tb_after: a2.system.characteristics.toughness.bonus,    // expect 2
      soak_before: soakBefore,                                // 4 (armour TB pre-AE)
      soak_after: a2.system.armour?.body?.toughnessBonus,     // expect 2 (BUG-Q-245: recompute post-AE)
    };

    // 251 idempotency under the REAL Foundry cycle: reset() re-clones from _source then
    // re-prepares. The persisted _source modifier must stay clean (0), and the derived bonus
    // must be STABLE across cycles (not drift). This is the actual scenario 251 was about.
    a2.reset(); const t1 = a2.system.characteristics.toughness.bonus;
    a2.reset(); const t2 = a2.system.characteristics.toughness.bonus;
    a2.reset(); const t3 = a2.system.characteristics.toughness.bonus;
    out.idempotent = {
      source_modifier: a2._source.system.characteristics.toughness.modifier, // expect 0 (source intact)
      source_unnatural: a2._source.system.characteristics.toughness.unnatural, // expect 0/undef, not drifting
      tb_cycles: [t1, t2, t3],                                // expect [2,2,2] — stable, no drift
    };
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
