#!/usr/bin/env python3
"""Live-verify BUG-Q-246 on rt-smoke (page-context, deployed modules).

Confirms that when an Active Effect drops Strength/Toughness enough to make an
actor Encumbered, the -1 Agility-Bonus Initiative penalty (RT Core p.249) is
applied — i.e. `initiative.bonus` is recomputed off the POST-AE encumbrance flag
(the dispute: it previously read the stale pre-AE flag from _computeCharacteristics).
"""
import json
from playwright.sync_api import sync_playwright

URL = "http://192.168.11.36:30000"

JS = r"""
async () => {
  const out = {};
  let actor;
  try {
    // Agility 40 → AgB 4, Initiative bonus baseline 4. Strength 40 → SB 4 → carry max 27kg.
    actor = await Actor.create({
      name: '__bugq246_probe__', type: 'acolyte',
      system: {
        characteristics: {
          agility: { base: 40, advance: 0, modifier: 0 },
          strength: { base: 40, advance: 0, modifier: 0 },
          toughness: { base: 40, advance: 0, modifier: 0 },
        },
        initiative: { characteristic: 'agility' },
      },
    });

    // Load enough weight to be Encumbered only once STR/T are dropped by the AE.
    // Give the actor a heavy item so current weight sits between the pre- and post-AE limits.
    await actor.createEmbeddedDocuments('Item', [{
      name: 'Heavy Crate', type: 'gear',
      system: { weight: 25, quantity: 1 },
    }]);

    out.baseline_encumbered = actor.system.encumbrance?.encumbered ?? null;
    out.baseline_init = actor.system.initiative.bonus;   // expect 4 (AgB 4), not encumbered

    // AE: -30 STR / -30 TON — drops carry limit below current weight → Encumbered.
    await actor.createEmbeddedDocuments('ActiveEffect', [{
      name: 'Weaken', changes: [
        { key: 'system.characteristics.strength.modifier', mode: 2, value: '-30' },
        { key: 'system.characteristics.toughness.modifier', mode: 2, value: '-30' },
      ],
    }]);

    out.postAE_encumbered = actor.system.encumbrance?.encumbered ?? null;  // expect true
    out.postAE_agB = actor.system.characteristics.agility.bonus;           // AgB still 4 (AE didn't touch Ag)
    out.postAE_init = actor.system.initiative.bonus;                       // expect 3 (4 - 1 encumbered penalty)
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
