#!/usr/bin/env python3
"""Live-verify: the Lure of the Expanse Wraithguard's "Auto-stabilised" trait cancels the
unbraced-Heavy −30 on its (Heavy) Wraithcannon. Imports the real NPC from the pack into a
temp actor, builds the real WeaponRollData and reads modifiers.unbraced. Control: the same
actor with the trait removed must take −30.
"""
import json
from playwright.sync_api import sync_playwright

URL = "http://192.168.11.36:30000"
JS = r"""
async () => {
  const { WeaponRollData } = await import('/systems/rogue-trader-3rd/module/rolls/roll-data.mjs');
  const pack = game.packs.get('rogue-trader-3rd.lureoftheexpanse-npcs');
  const src = (await pack.getDocuments()).find(a => a.name === 'Wraithguard');
  const actor = await Actor.create({ ...src.toObject(), name: '__wraithguard_probe__' });
  const out = {};
  const probe = async () => {
    const w = actor.items.find(i => i.type === 'weapon' && /wraithcannon/i.test(i.name));
    const rd = new WeaponRollData();
    rd.sourceActor = actor; rd.weapons = [w]; rd.initialize();
    await rd.update();
    return { weapon: w.name, class: w.system.class, braced: rd.braced, unbraced: rd.modifiers.unbraced };
  };
  try {
    out.trait = actor.items.find(i => i.type === 'trait' && /auto-stabili/i.test(i.name))?.name ?? null;
    out.with_trait = await probe();
    await actor.deleteEmbeddedDocuments('Item', actor.items.filter(i => i.type === 'trait' && /auto-stabili/i.test(i.name)).map(i => i.id));
    out.without_trait = await probe();
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
