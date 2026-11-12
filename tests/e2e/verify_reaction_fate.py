#!/usr/bin/env python3
"""Live-verify: a defender can spend Fate on a Dodge rolled from an attack card.

Builds a probe actor in a started combat, posts a stand-in attack card (3 hits + a Dodge
button), then uses REAL hit-tested clicks: Dodge (forced fail) -> Spend Fate on the
outcome -> Re-roll (forced success). Checks Fate 3->2, the Reaction budget is spent once
(not twice), the hits get negated, and the follow-up outcome offers no second Fate spend.
"""
import json
from playwright.sync_api import sync_playwright

URL = "http://192.168.11.36:30000"

SETUP = r"""
async () => {
  for (const a of game.actors.filter(a => a.name === '__fate_dodge_probe__')) await a.delete();
  const actor = await Actor.create({ name: '__fate_dodge_probe__', type: 'acolyte',
    system: { fate: { max: 3, value: 3 }, characteristics: { agility: { base: 50 } }, skills: { dodge: { advance: 1 } } } });
  const combat = await Combat.create({});
  await combat.createEmbeddedDocuments('Combatant', [{ actorId: actor.id }]);
  await combat.activate();
  await combat.startCombat();
  const btn = (i) => `<div class="rt-control-button roll-control__assign-damage" data-hit="${i}"><span class="rt-control-button__label">Assign Damage</span></div>`;
  const msg = await ChatMessage.create({ content: `<div class="probe-attack">${btn(0)}${btn(1)}${btn(2)}`
    + `<div class="rt-control-button roll-control__evade" data-reaction-type="dodge" data-target-uuid="${actor.uuid}"><span class="rt-control-button__label">Dodge</span></div></div>` });
  CONFIG.Dice.randomUniform = () => 0.05;   // forces a high d100 -> Dodge FAILS
  return { actorId: actor.id, combatId: combat.id, msgId: msg.id, dodge: actor.system.skills.dodge.current,
           budget: actor.system.combat?.reactions?.dodge ?? null };
}
"""

def run():
    out = {}
    with sync_playwright() as p:
        b = p.chromium.launch(headless=True)
        pg = b.new_page(viewport={"width": 1920, "height": 1080})
        pg.on("pageerror", lambda e: out.setdefault("page_errors", []).append(str(e)))
        pg.goto(URL + "/join", wait_until="networkidle")
        pg.select_option("select[name='userId']", label="Gamemaster")
        pg.click("button[name='join']")
        pg.wait_for_function("() => window.game && game.ready === true", timeout=60000)
        # Headless Chromium rendering the WebGL canvas starves the main thread, so Playwright's
        # actionability checks (and screenshots) hang. Disable the canvas for THIS browser only
        # (a client-scope setting) and reload; chat clicks remain real hit-tested clicks.
        if not pg.evaluate("() => game.settings.get('core', 'noCanvas')"):
            pg.evaluate("() => game.settings.set('core', 'noCanvas', true)")
            pg.reload(wait_until="networkidle")
            pg.wait_for_function("() => window.game && game.ready === true", timeout=60000)
        pg.evaluate("() => { ui.sidebar.changeTab('chat', 'primary'); ui.sidebar.expand?.(); }")
        pg.wait_for_timeout(800)
        s = pg.evaluate(SETUP); out["setup"] = s
        log = "#chat .chat-log"
        evade = pg.locator(f'{log} [data-message-id="{s["msgId"]}"] .roll-control__evade')
        out["evade_box"] = evade.bounding_box(timeout=5000)
        out["evade_visible"] = evade.is_visible()
        try:
            evade.click(timeout=8000)
        except Exception as e:
            out["click_error"] = str(e)[-900:]
            print(json.dumps(out, indent=2)); b.close(); return
        pg.wait_for_selector(f"{log} .roll-control__reaction-fate", timeout=10000)
        out["first_outcome"] = pg.locator(f"{log} .chat-message").last.inner_text()
        out["budget_after_dodge"] = pg.evaluate(f"() => game.actors.get('{s['actorId']}').system.combat?.reactions?.dodge")
        # The original symptom: a second Dodge is refused — the Reaction is spent. Fate must
        # still be spendable on the FIRST Dodge's outcome.
        n_before = pg.evaluate("() => game.messages.size")
        evade.click()
        pg.wait_for_timeout(1500)
        out["second_dodge_refused"] = pg.evaluate("() => game.messages.size") == n_before
        # Original symptom: a second Dodge click is refused (Reaction already spent).
        pg.evaluate("() => CONFIG.Dice.randomUniform = () => 0.99")   # forces a low d100 -> success
        pg.locator(f"{log} .roll-control__reaction-fate").last.click()
        pg.locator(".application.dialog button[data-action='reroll']").click()
        pg.wait_for_function(f"""() => game.messages.contents.slice(-1)[0]?.content.includes('SUCCESS')""", timeout=10000)
        pg.wait_for_timeout(500)
        out["after"] = pg.evaluate(f"""() => {{
          const a = game.actors.get('{s["actorId"]}');
          const last = game.messages.contents.slice(-1)[0];
          const card = document.querySelector('{log} [data-message-id="{s["msgId"]}"]');
          return {{ fate: a.system.fate.value, budget: a.system.combat?.reactions?.dodge ?? null,
                   last: last.content, offersFateAgain: last.content.includes('reaction-fate'),
                   negated: [...card.querySelectorAll('.roll-control__assign-damage')].filter(x => x.textContent.includes('Negated')).length }};
        }}""")
        pg.evaluate(f"""async () => {{
          CONFIG.Dice.randomUniform = Math.random;
          await game.combats.get('{s["combatId"]}')?.delete();
          await game.actors.get('{s["actorId"]}')?.delete();
        }}""")
        b.close()
    print(json.dumps(out, indent=2))

if __name__ == "__main__":
    run()
