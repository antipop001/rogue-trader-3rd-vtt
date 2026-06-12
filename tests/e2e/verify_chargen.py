"""Stage A verification — chargen wizard on live foundrySB.

Drives the real UI: opens the wizard from the Actors-directory button,
exercises the Roll-All path and the manual-entry path, commits each, and
asserts the created actors' characteristics, flags, and the sheet header
control. Screenshots to ~/chargen-verify/.
"""
import asyncio
import sys
from pathlib import Path
from playwright.async_api import async_playwright

URL = "http://192.168.11.36:30000/join"
OUT = Path("/home/ahermon/chargen-verify")
ABBRS = ["WS", "BS", "S", "T", "Ag", "Int", "Per", "WP", "Fel"]
CHAR_KEYS = {
    "WS": "weaponSkill", "BS": "ballisticSkill", "S": "strength", "T": "toughness",
    "Ag": "agility", "Int": "intelligence", "Per": "perception", "WP": "willpower",
    "Fel": "fellowship",
}


async def open_wizard(page):
    # Actors tab then the directory button (v13 sidebar tabs use data-tab).
    await page.evaluate("ui.sidebar.changeTab ? ui.sidebar.changeTab('actors', 'primary') : ui.sidebar.activateTab('actors')")
    await page.wait_for_function("!!document.querySelector('.rt-chargen-open')", timeout=10_000)
    await page.evaluate("document.querySelector('.rt-chargen-open').click()")
    await page.wait_for_function("!!document.querySelector('.rt-chargen-app .rt-chargen__layout')", timeout=10_000)


async def main():
    OUT.mkdir(exist_ok=True)
    for old in OUT.glob("*.png"):
        old.unlink()
    failures, notes = [], []

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        ctx = await browser.new_context(viewport={"width": 1600, "height": 1000})
        page = await ctx.new_page()
        page.on("pageerror", lambda e: failures.append(f"pageerror: {e}"))

        await page.goto(URL, wait_until="networkidle")
        await page.select_option('select[name="userid"]', label="Gamemaster")
        await page.click('button[name="join"]')
        await page.wait_for_function("typeof game !== 'undefined' && game.ready", timeout=60_000)
        notes.append(f"system.version = {await page.evaluate('game.system.version')}")

        # Clean any leftovers from earlier runs.
        await page.evaluate("""async () => {
            for (const n of ['__ChargenRollTest', '__ChargenManualTest']) {
                const a = game.actors.getName(n);
                if (a) await a.delete();
            }
        }""")

        # ---------- Path 1: Roll All ----------
        await open_wizard(page)
        await page.fill("#rt-chargen-name", "__ChargenRollTest")
        await page.dispatch_event("#rt-chargen-name", "change")
        await page.screenshot(path=OUT / "01_wizard_open.png")

        await page.click('.rt-chargen-app [data-action="rollAll"]')
        await page.wait_for_timeout(800)
        rolled = {}
        for a in ABBRS:
            v = await page.input_value(f'.rt-chargen-app input[data-abbr="{a}"]')
            rolled[a] = int(v) if v else None
        notes.append(f"rolled: {rolled}")
        bad = {a: v for a, v in rolled.items() if v is None or not (27 <= v <= 45)}
        if bad:
            failures.append(f"rollAll values missing/out of range: {bad}")
        await page.screenshot(path=OUT / "02_wizard_rolled.png")

        if await page.is_disabled('.rt-chargen-app [data-action="commit"]'):
            failures.append("commit button still disabled after Roll All")
        await page.click('.rt-chargen-app [data-action="commit"]')
        try:
            await page.wait_for_function(
                "!!game.actors.getName('__ChargenRollTest')", timeout=15_000)
        except Exception:
            pass
        await page.wait_for_timeout(500)

        check = await page.evaluate("""(charKeys) => {
            const a = game.actors.getName('__ChargenRollTest');
            if (!a) return {error: 'actor not created'};
            const out = {chars: {}, flags: a.flags?.rt?.chargen ?? null, type: a.type};
            for (const [abbr, key] of Object.entries(charKeys)) {
                const c = a.system.characteristics[key];
                out.chars[abbr] = {base: c.base, modifier: c.modifier};
            }
            return out;
        }""", CHAR_KEYS)
        if check.get("error"):
            failures.append(f"roll path: {check['error']}")
        else:
            for a in ABBRS:
                got = check["chars"][a]
                if got["base"] != rolled[a] or got["modifier"] != 0:
                    failures.append(f"roll path {a}: wizard={rolled[a]} actor={got}")
            fl = check["flags"]
            if not fl or fl.get("characteristics", {}).get("method") != "roll":
                failures.append(f"roll path: flags.rt.chargen missing/wrong method: {fl and fl.get('characteristics', {}).get('method')}")
            notes.append("roll path: actor matches wizard, flags stored")
        await page.screenshot(path=OUT / "03_actor_sheet_after_commit.png")

        # Header control on the created actor's sheet?
        has_control = await page.evaluate("""() => {
            const a = game.actors.getName('__ChargenRollTest');
            return a.sheet._getHeaderControls().some((c) => c.action === 'openChargen');
        }""")
        if not has_control:
            failures.append("acolyte sheet header lacks openChargen control")
        else:
            notes.append("sheet header control present")
        await page.evaluate("game.actors.getName('__ChargenRollTest')?.sheet?.close()")

        # ---------- Path 2: manual entry ----------
        await open_wizard(page)
        await page.fill("#rt-chargen-name", "__ChargenManualTest")
        await page.dispatch_event("#rt-chargen-name", "change")
        await page.select_option('.rt-chargen-app select[name="method"]', "manual")
        await page.wait_for_timeout(400)
        manual = {a: 30 + i for i, a in enumerate(ABBRS)}
        manual["Fel"] = 50  # deliberately out of range -> expect a warning
        for a, v in manual.items():
            sel = f'.rt-chargen-app input[data-abbr="{a}"]'
            await page.fill(sel, str(v))
            await page.dispatch_event(sel, "change")
            await page.wait_for_timeout(120)
        warning = await page.is_visible(".rt-chargen-app .rt-chargen__warnings")
        if not warning:
            failures.append("manual path: out-of-range warning not shown for Fel=50")
        else:
            notes.append("manual path: range warning shown (warn-only)")
        await page.screenshot(path=OUT / "04_wizard_manual.png")
        await page.click('.rt-chargen-app [data-action="commit"]')
        try:
            await page.wait_for_function(
                "!!game.actors.getName('__ChargenManualTest')", timeout=15_000)
        except Exception:
            pass
        await page.wait_for_timeout(500)

        check2 = await page.evaluate("""(charKeys) => {
            const a = game.actors.getName('__ChargenManualTest');
            if (!a) return {error: 'actor not created'};
            const out = {chars: {}, method: a.flags?.rt?.chargen?.characteristics?.method};
            for (const [abbr, key] of Object.entries(charKeys)) {
                out.chars[abbr] = a.system.characteristics[key].base;
            }
            return out;
        }""", CHAR_KEYS)
        if check2.get("error"):
            failures.append(f"manual path: {check2['error']}")
        else:
            for a in ABBRS:
                if check2["chars"][a] != manual[a]:
                    failures.append(f"manual path {a}: typed={manual[a]} actor={check2['chars'][a]}")
            if check2["method"] != "manual":
                failures.append(f"manual path: method={check2['method']} (want manual)")
            else:
                notes.append("manual path: actor matches typed values (incl. unclamped Fel=50)")

        # Cleanup test actors.
        await page.evaluate("""async () => {
            for (const n of ['__ChargenRollTest', '__ChargenManualTest']) {
                const a = game.actors.getName(n);
                if (a) await a.delete();
            }
        }""")
        await browser.close()

    print("--- notes ---")
    for n in notes:
        print(" ", n)
    if failures:
        print("--- FAILURES ---")
        for f in failures:
            print(" ", f)
        sys.exit(1)
    print("ALL CHECKS PASSED")


asyncio.run(main())
