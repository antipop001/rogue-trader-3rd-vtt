#!/usr/bin/env python3
"""
Runtime exerciser — roll-resolution paths (v2).

Drives the REAL roll entry points on rt-smoke across BOTH success and failure outcomes,
catching any thrown exception or silently-dropped roll per scenario. Faithful (no rollData
setup-guessing → no false positives): it fires the same code a user does and clicks the
dialog's own Roll button.

Handles two dialog families:
  - DialogV2 "Roll Modifier"  (skills / characteristics) — button[data-action='roll']
  - V1 FormApplication        (weapon / psychic attacks) — #attack-roll / .dialog-button.roll
The test actor gets a controlled canvas token (weapon/psychic attacks require one via
createSourceAndTargetData/getSourceToken) and its weapons equipped (rollItem aborts otherwise).

Signal per scenario:
  page_error : an uncaught exception fired while resolving        (hard bug — the 0.8.33 class)
  dropped    : dialog opened + Roll clicked but NO chat message   (resolve threw before chat)

Usage:  ~/.venvs/playwright/bin/python tools/runtime_exerciser/exercise_rolls.py [--probe]
"""
import json, sys, time
from playwright.sync_api import sync_playwright

URL = "http://192.168.11.36:30000"
MSG_POLL_SECONDS = 4
OUT = "/tmp/claude-1000/-home-ahermon-rogue-trader-3rd-vtt/9aaff9b5-087b-4f16-a1f6-30fde93f4194/scratchpad/exerciser_report.json"

# any open roll dialog (V2 DialogV2 OR V1 weapon/psychic FormApplication)
DLG = ".application.dialog, dialog.application, #rt-weapon-attack-dialog, .app.dialog, .window-app.dialog"
DCOUNT = f"document.querySelectorAll('{DLG}').length"   # expression (used inside () => ...)
CLEAR = """() => {
  for (const w of Object.values(ui.windows || {})) {
    try { const cls = w?.options?.classes || []; if (cls.includes('dialog') || String(w?.constructor?.name).includes('Dialog')) w.close(); } catch(e){}
  }
  const inst = foundry.applications && foundry.applications.instances;
  if (inst) for (const app of [...inst.values()]) { try { if (String(app?.constructor?.name).includes('Dialog') || app?.title === 'Roll Modifier') app.close(); } catch(e){} }
}"""

SETUP_JS = r"""
async () => {
  const wpn = await game.packs.get('rogue-trader-3rd.weapons').getDocuments();
  const pow = await game.packs.get('rogue-trader-3rd.psychic-powers').getDocuments();
  const pick = (docs, n) => { const d = docs.find(x=>x.name===n); if(!d) return null; const o=d.toObject(); delete o._id; return o; };
  const items = [pick(wpn,'Autogun'), pick(wpn,'Boltgun'), pick(wpn,'Chainsword')].filter(Boolean);
  const dmgPow = pow.filter(p => { const d=p.system?.damage; return d && d!=='0' && d!==0; }).slice(0,2);
  const plainPow = pow.filter(p => !dmgPow.includes(p)).slice(0,1);
  for (const p of [...dmgPow, ...plainPow]) { const o=p.toObject(); delete o._id; items.push(o); }

  const a = await Actor.create({ name:'__exerciser', type:'acolyte',
    system: { psy: { rating: 4, class: 'sanctioned', strength: 'unfettered' } }, items });
  const su = {}; for (const k of Object.keys(a.system.skills || {})) su[`system.skills.${k}.advance`] = 2;
  await a.update(su);
  const eq = a.items.filter(i=>i.type==='weapon').map(i=>({_id:i.id, 'system.equipped':true}));
  if (eq.length) await a.updateEmbeddedDocuments('Item', eq);

  // controlled token so weapon/psychic attacks resolve a source (getSourceToken)
  let scene = game.scenes.active || game.scenes.contents[0];
  if (!scene) { scene = await Scene.create({ name:'__ex_scene', width:2000, height:2000, grid:{ size:100 } }); }
  if (!scene.active) await scene.activate();
  await new Promise(r=>setTimeout(r,400));
  const td = (await a.getTokenDocument({ x:300, y:300 })).toObject();
  const [tok] = await scene.createEmbeddedDocuments('Token', [td]);
  await new Promise(r=>setTimeout(r,400));
  const tObj = canvas.tokens.get(tok.id);
  if (tObj?.control) tObj.control({ releaseOthers:true });

  window.__ex = {
    id: a.id, sceneId: scene.id, tokenId: tok.id, madeScene: scene.name === '__ex_scene',
    skills: Object.keys(a.system.skills || {}),
    chars: Object.keys(a.system.characteristics || {}),
    weapons: a.items.filter(i=>i.type==='weapon').map(i=>({id:i.id, name:i.name})),
    powers:  a.items.filter(i=>i.type==='psychicPower').map(i=>({id:i.id, name:i.name})),
  };
  return window.__ex;
}
"""

def run(probe_only=False):
    with sync_playwright() as p:
        b = p.chromium.launch(headless=True)
        pg = b.new_page(viewport={"width":1500,"height":1000})
        perr = []
        pg.on("pageerror", lambda e: perr.append(str(e)[:220]))
        pg.goto(f"{URL}/join", wait_until="networkidle", timeout=45000); pg.wait_for_timeout(1000)
        pg.select_option("select[name='userid']", label="Gamemaster")
        pg.fill("input[name='password']", ""); pg.click("button[name='join']")
        pg.wait_for_function("() => window.game && game.ready===true", timeout=45000)

        ex = pg.evaluate(SETUP_JS)
        print(f"actor {ex['id']}: {len(ex['skills'])} skills, {len(ex['chars'])} chars, "
              f"{len(ex['weapons'])} weapons, {len(ex['powers'])} powers, token {ex['tokenId']}", file=sys.stderr, flush=True)
        A = f"game.actors.get('{ex['id']}')"
        results = []

        def flush():
            errored = [r for r in results if r["page_errors"]]
            dropped = [r for r in results if r["dropped"] and not r["page_errors"]]
            nodlg   = [r for r in results if not r["dialog"]]
            summary = {"total": len(results), "with_page_errors": len(errored),
                       "dropped_no_error": len(dropped), "no_dialog": len(nodlg),
                       "errors": [{"scenario": r["scenario"], "modifier": r["modifier"], "err": r["page_errors"][:2]} for r in errored],
                       "dropped": [{"scenario": r["scenario"], "modifier": r["modifier"]} for r in dropped],
                       "no_dialog_scenarios": [r["scenario"] for r in nodlg]}
            with open(OUT, "w") as f: json.dump({"summary": summary, "results": results}, f, indent=1)
            return summary

        def scenario(label, trigger_js, modifier):
            del perr[:]
            pg.evaluate(CLEAR)
            try: pg.wait_for_function(f"() => {DCOUNT} === 0", timeout=4000)
            except Exception: pass
            before = pg.evaluate("() => game.messages.size")
            pg.evaluate(f"() => {{ {trigger_js} }}")                       # fire-and-forget
            r = {"scenario": label, "modifier": modifier, "dialog": False, "clicked": False,
                 "chat_delta": 0, "dropped": False, "closed": False, "page_errors": []}
            try:
                pg.wait_for_function(f"() => {DCOUNT} >= 1", timeout=5000); r["dialog"] = True
            except Exception:
                r["notif"] = pg.evaluate("() => [...document.querySelectorAll('#notifications li, .notification')].map(n=>n.textContent.trim()).slice(-1)")
                r["page_errors"] = list(perr); results.append(r)
                print(f"[{len(results)}] {label} m{modifier:+d} NO-DIALOG {r.get('notif')}", file=sys.stderr, flush=True); flush(); return
            # force the outcome, then click the dialog's own roll button (V2 or V1)
            pg.evaluate(f"""() => {{ const d=[...document.querySelectorAll('{DLG}')].pop();
                const m=d && d.querySelector('#modifier, input[name="modifiers.modifier"]'); if(m) m.value={modifier}; }}""")
            r["clicked"] = pg.evaluate(f"""() => {{ const d=[...document.querySelectorAll('{DLG}')].pop();
                const btn = d && (d.querySelector("button[data-action='roll']") || d.querySelector('#attack-roll')
                          || d.querySelector('.dialog-button.roll') || d.querySelector('button.default,[default]'));
                if(!btn) return false; btn.click(); return true; }}""")
            try: pg.wait_for_function(f"() => {DCOUNT} === 0", timeout=5000); r["closed"] = True
            except Exception: pass
            t0 = time.time(); appeared = False
            while time.time() - t0 < MSG_POLL_SECONDS:
                if pg.evaluate("() => game.messages.size") > before: appeared = True; break
                pg.wait_for_timeout(150)
            r["chat_delta"] = pg.evaluate("() => game.messages.size") - before
            r["dropped"] = r["clicked"] and not appeared
            r["page_errors"] = list(perr)
            results.append(r)
            flag = ' ERR' if r["page_errors"] else (' DROPPED' if r["dropped"] else '')
            print(f"[{len(results)}] {label} m{modifier:+d} Δ{r['chat_delta']}{flag}", file=sys.stderr, flush=True); flush()

        if probe_only:
            scenario("skill:awareness", f"{A}.rollSkill('awareness');", 60)
            if ex["weapons"]: scenario(f"weapon:{ex['weapons'][0]['name']}", f"{A}.rollItem('{ex['weapons'][0]['id']}');", 60)
            if ex["powers"]:  scenario(f"power:{ex['powers'][0]['name']}",  f"{A}.rollItem('{ex['powers'][0]['id']}');", 60)
        else:
            for s in ex["skills"]:
                scenario(f"skill:{s}", f"{A}.rollSkill('{s}');", 60); scenario(f"skill:{s}", f"{A}.rollSkill('{s}');", -60)
            for c in ex["chars"]:
                scenario(f"char:{c}", f"{A}.rollCharacteristic('{c}');", 60); scenario(f"char:{c}", f"{A}.rollCharacteristic('{c}');", -60)
            for w in ex["weapons"]:
                scenario(f"weapon:{w['name']}", f"{A}.rollItem('{w['id']}');", 60); scenario(f"weapon:{w['name']}", f"{A}.rollItem('{w['id']}');", -60)
            for pw in ex["powers"]:
                scenario(f"power:{pw['name']}", f"{A}.rollItem('{pw['id']}');", 60); scenario(f"power:{pw['name']}", f"{A}.rollItem('{pw['id']}');", -60)

        # cleanup (ignore headless canvas token-teardown errors)
        pg.evaluate(f"""async () => {{ try {{
            const s = game.scenes.get('{ex['sceneId']}');
            if (s && '{ex['tokenId']}') try {{ await s.deleteEmbeddedDocuments('Token', ['{ex['tokenId']}']); }} catch(e){{}}
            await game.actors.get('{ex['id']}')?.delete();
            if ({str(ex['madeScene']).lower()}) try {{ await s?.delete(); }} catch(e){{}}
        }} catch(e){{}} }}""")
        summary = flush()
        print("=== COMPLETE ===", file=sys.stderr, flush=True)
        print(json.dumps(summary, indent=1))
        b.close()

if __name__ == "__main__":
    run(probe_only="--probe" in sys.argv)
