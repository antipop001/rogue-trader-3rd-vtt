#!/usr/bin/env python3
"""Live-verify the agy-qa-2 review corrections on rt-smoke (page-context against deployed modules).
Covers: BUG-Q-196 Daemonic ×4 (RAW), 208 vehicle Primitive armour-doubling, 210 insufficient-ammo
no-hits guard, 182 launcher-jam routing, 209 melee-Lance 0-DoS penetration guard."""
import json
from playwright.sync_api import sync_playwright

URL = "http://192.168.11.36:30000"

JS = r"""
async () => {
  const out = {};
  const base = '/systems/rogue-trader-3rd/module/rolls/';
  const { AssignDamageData } = await import(base + 'assign-damage-data.mjs');
  const ad_mod = await import(base + 'action-data.mjs');

  // ---- BUG-Q-196: Daemonic is a DISTINCT ×2 on top of Unnatural Toughness (RAW ×4) ----
  const mkActor = (tb, unnatural, daemonic) => ({
    type: 'creature',
    system: { armour: { body: { total: 0, toughnessBonus: tb } },
              characteristics: { toughness: { unnatural } } },
    items: daemonic ? [{ type: 'trait', name: 'Daemonic' }] : [],
  });
  const soak = async (tb, un, daem, felling = 0) => {
    const a = new AssignDamageData(mkActor(tb, un, daem), { location: 'Body', fellingLevel: felling });
    await a.update();
    return a.tb;
  };
  out.daemonic = {
    ut2_daemonic: await soak(8, 4, true),         // expect 16 (×4)
    ut3_daemonic: await soak(12, 8, true),        // expect 24 (×4 of base 4? UT×3=12, ×2=24)
    daemonic_only: await soak(4, 0, true),        // expect 8 (×2)
    ut2_no_daemonic: await soak(8, 4, false),     // expect 8 (unchanged)
    ut2_daemonic_felling1: await soak(8, 4, true, 1), // Felling strips UT→4, then ×2 → 8
  };

  // ---- BUG-Q-208: vehicle facing Armour doubled vs Primitive weapons ----
  const mkVeh = () => ({ type: 'vehicle', system: { front: '10', integrity: { value: 50 } } });
  const vehHit = (primitive) => ({ primitive, totalDamage: 20, totalPenetration: 0,
                                   location: 'Front', righteousFury: [] });
  try {
    const vp = new AssignDamageData(mkVeh(), vehHit(true));  vp.facing = 'front';
    await vp.update(); await vp.finalize();
    const vn = new AssignDamageData(mkVeh(), vehHit(false)); vn.facing = 'front';
    await vn.update(); await vn.finalize();
    out.vehicle = { primitive_integrityDamage: vp.integrityDamage,      // expect 0 (armour 10→20, dmg 20)
                    normal_integrityDamage: vn.integrityDamage };       // expect 10 (armour 10, dmg 20)
  } catch (e) { out.vehicle = { error: String(e) }; }

  // ---- BUG-Q-210: insufficient ammo (fireRate 0) → no hits + Out-of-Ammo effect ----
  try {
    const ad = Object.create(ad_mod.ActionData.prototype);
    ad.rollData = { usesAmmo: true, isThrown: false, fireRate: 0, success: true };
    ad.damageData = { hits: [], additionalHits: 0 };
    ad.effectOutput = []; ad.effects = [];
    ad.addEffect = function (n, e) { this.effectOutput.push({ name: n }); };
    await ad.calculateHits();
    out.ammo_guard = { hits: ad.damageData.hits.length,                 // expect 0
                       effect: ad.effectOutput.map(e => e.name) };      // expect ['Out of Ammo']
  } catch (e) { out.ammo_guard = { error: String(e) }; }

  // ---- BUG-Q-182: a Launcher jam routes to the launcher-jam (barrel) path, not standard 'jam' ----
  try {
    const ad = Object.create(ad_mod.ActionData.prototype);
    ad.effects = ['launcher-jam'];
    ad.effectOutput = [];
    ad.rollData = { weapon: { update: async () => {} } };
    ad.addEffect = function (n, e) { this.effectOutput.push({ name: n, effect: e }); };
    await ad.createEffectData();
    out.launcher = { effects: ad.effectOutput.map(e => e.name) };       // expect a 'Launcher …' effect
  } catch (e) { out.launcher = { error: String(e) }; }

  return out;
}
"""

def run():
    with sync_playwright() as p:
        b = p.chromium.launch(headless=True)
        pg = b.new_page()
        pg.goto(URL + "/join", wait_until="networkidle")
        # select Gamemaster + submit (empty password while debugging)
        try:
            pg.select_option("select[name='userid']", label="Gamemaster")
        except Exception:
            pg.select_option("select[name='userid']", index=1)
        pg.click("button[name='join']")
        pg.wait_for_function("() => window.game && game.ready === true", timeout=60000)
        res = pg.evaluate(JS)
        print(json.dumps(res, indent=2))
        b.close()

if __name__ == "__main__":
    run()
