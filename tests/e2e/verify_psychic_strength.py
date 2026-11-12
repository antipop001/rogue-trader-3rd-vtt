#!/usr/bin/env python3
"""Live-verify: Psychic Strength follows the PR used in the cast, not the sheet select.

Probe psyker: Psy Rating 3, sheet select left on "Push". Builds the real PsychicActionData /
PsychicRollData from the deployed modules, sets the cast PR, finalizes, forces the Focus
Power roll total, and runs checkForPerils (Psychic Phenomena table draw stubbed to a marker):
  PR 3 + non-doubles 47 -> Unfettered, NO Phenomena   (the bug: was Push -> always)
  PR 3 + doubles 44     -> Unfettered, Phenomena
  PR 6 + non-doubles 47 -> Push, Phenomena            (RAW: Push always manifests)
  PR 1 + doubles 44     -> Fettered, NO Phenomena
"""
import json
from playwright.sync_api import sync_playwright

URL = "http://192.168.11.36:30000"
JS = r"""
async () => {
  const { PsychicActionData } = await import('/systems/rogue-trader-3rd/module/rolls/action-data.mjs');
  const pack = game.packs.get('rogue-trader-3rd.psychic-powers');
  const powerDoc = (await pack.getDocuments()).find(p => p.system.discipline === 'Telepathy');
  for (const a of game.actors.filter(a => a.name === '__psy_strength_probe__')) await a.delete();
  const actor = await Actor.create({ name: '__psy_strength_probe__', type: 'acolyte',
    system: { psy: { rating: 3, strength: 'push', class: 'sanctioned' } } });
  const [power] = await actor.createEmbeddedDocuments('Item', [powerDoc.toObject()]);
  const out = { power: power.name };
  try {
    for (const [pr, total] of [[3, 47], [3, 44], [6, 47], [1, 44]]) {
      const ad = new PsychicActionData();
      ad.rollData.sourceActor = actor;
      ad.rollData.psychicPowers = [power];
      ad.rollData.initialize();
      const seededPr = ad.rollData.pr;
      ad.rollData.pr = pr;            // what the player types in the dialog
      await ad.rollData.finalize();   // runs updateStrength()
      ad.rollData.roll = { total };
      const effects = [];
      ad.addEffect = (name, text) => effects.push(name);
      await ad.checkForPerils();
      out[`pr${pr}_roll${total}`] = { seededPr, strength: ad.rollData.strength, phenomena: effects.includes('Psychic Phenomena') };
    }
  } catch (e) { out.error = String(e); out.stack = e.stack; }
  finally { await actor.delete(); }
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
        out = pg.evaluate(JS)
        out["page_errors"] = errors
        b.close()
    print(json.dumps(out, indent=2))

if __name__ == "__main__":
    run()
