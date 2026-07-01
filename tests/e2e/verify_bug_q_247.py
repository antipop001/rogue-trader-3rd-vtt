#!/usr/bin/env python3
"""Live-verify BUG-Q-247 on rt-smoke (page-context, deployed modules).

Confirms the fast-path rollReaction() (chat-card quick Dodge/Parry button) now
applies the Fatigue -10 (all Tests, RT Core p.251) and Encumbered -10 (movement
Tests such as Dodge, RT Core p.249) penalties that rollSkill() already applies.

We monkey-patch actor.rollCheck to capture the target number rollReaction feeds
it (rather than depend on the RNG), so we read the effective target directly.
"""
import json
from playwright.sync_api import sync_playwright

URL = "http://192.168.11.36:30000"

JS = r"""
async () => {
  const out = {};
  let actor;
  try {
    // Ag 40 -> dodge/parry base skill current comes from skill.current.
    actor = await Actor.create({
      name: '__bugq247_probe__', type: 'acolyte',
      system: {
        characteristics: {
          agility: { base: 40, advance: 0, modifier: 0 },
          weaponSkill: { base: 40, advance: 0, modifier: 0 },
          strength: { base: 40, advance: 0, modifier: 0 },
          toughness: { base: 40, advance: 0, modifier: 0 },
        },
      },
    });

    // Capture the target rollReaction passes to rollCheck.
    const captured = {};
    const orig = actor.rollCheck.bind(actor);
    actor.rollCheck = async (t) => { captured.last = t; return { roll: {total: 50}, target: t, success: true, dos: 0, dof: 0 }; };

    const dodgeBase = actor.system.skills?.dodge?.current ?? null;
    const parryBase = actor.system.skills?.parry?.current ?? null;

    // Baseline (no fatigue, not encumbered)
    await actor.rollReaction('dodge'); out.dodge_baseline = captured.last;
    await actor.rollReaction('parry'); out.parry_baseline = captured.last;

    // Apply Fatigue = 1
    await actor.update({ 'system.fatigue.value': 1 });
    actor.rollCheck = async (t) => { captured.last = t; return { roll: {total: 50}, target: t, success: true, dos: 0, dof: 0 }; };
    await actor.rollReaction('dodge'); out.dodge_fatigued = captured.last;   // expect baseline - 10
    await actor.rollReaction('parry'); out.parry_fatigued = captured.last;   // expect baseline - 10

    // Clear fatigue, make Encumbered via heavy item + STR/T drop
    await actor.update({ 'system.fatigue.value': 0 });
    await actor.createEmbeddedDocuments('Item', [{ name: 'Heavy Crate', type: 'gear', system: { weight: 200, quantity: 1 } }]);
    out.encumbered_flag = actor.system.encumbrance?.encumbered ?? null;      // expect true
    actor.rollCheck = async (t) => { captured.last = t; return { roll: {total: 50}, target: t, success: true, dos: 0, dof: 0 }; };
    await actor.rollReaction('dodge'); out.dodge_encumbered = captured.last; // expect baseline - 10
    await actor.rollReaction('parry'); out.parry_encumbered = captured.last; // expect baseline (parry not movement)

    out.dodge_base = dodgeBase; out.parry_base = parryBase;
  } catch (e) {
    out.error = String(e); out.stack = e.stack;
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
