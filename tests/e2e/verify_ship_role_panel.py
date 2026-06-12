"""Visual verification of the 0.7.30 Ship Role panel.

Drives the live foundrySB instance: log in as GM, open a temporary
test acolyte's sheet, jump to the Bio tab, screenshot the panel
empty, then switch through three roles spanning ranks 1/3/4 to
confirm the detail box re-renders with the correct content.
"""
import asyncio
import sys
from pathlib import Path
from playwright.async_api import async_playwright

URL = "http://192.168.11.36:30000/join"
OUT = Path("/home/ahermon/ship-role-verify")


async def main():
    OUT.mkdir(exist_ok=True)
    for old in OUT.glob("*.png"):
        old.unlink()

    failures = []
    notes = []

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        ctx = await browser.new_context(viewport={"width": 1600, "height": 1000})
        page = await ctx.new_page()
        page.on("pageerror", lambda e: failures.append(f"pageerror: {e}"))

        await page.goto(URL, wait_until="networkidle")
        await page.select_option('select[name="userid"]', label="Gamemaster")
        await page.click('button[name="join"]')
        await page.wait_for_function("typeof game !== 'undefined' && game.ready", timeout=60_000)
        notes.append(f"world.system.version = {await page.evaluate('game.system.version')}")

        # Create + render the sheet, return enough info to drive things.
        sheet_info = await page.evaluate("""async () => {
            const a = await Actor.create({name: '__VerifyShipRole', type: 'acolyte'});
            a.sheet.render(true, {width: 1100, height: 950});
            await new Promise(r => setTimeout(r, 2500));
            // Find the sheet root in the DOM via the appId on the window frame.
            const id = a.id;
            const appId = a.sheet.id ?? a.sheet.appId;
            const roots = Array.from(document.querySelectorAll('[id^="ApplicationV2"], [data-appid], .app'));
            const root = document.getElementById(appId) || document.querySelector(`[data-appid="${appId}"]`);
            return {
                actorId: id,
                appId,
                sheetClass: a.sheet.constructor.name,
                rootFound: !!root,
                rootTag: root ? root.tagName : null,
                rootClass: root ? root.className : null,
                allRoots: roots.map(r => ({id: r.id, dataAppid: r.dataset?.appid, cls: r.className.slice(0, 80)})).slice(0, 10),
            };
        }""")
        notes.append(f"actor: id={sheet_info['actorId']} sheetClass={sheet_info['sheetClass']}")
        notes.append(f"sheet rendered: appId={sheet_info['appId']} rootFound={sheet_info['rootFound']}")
        notes.append(f"  rootTag={sheet_info['rootTag']} rootCls={sheet_info['rootClass']!r}")
        for r in sheet_info["allRoots"]:
            notes.append(f"  candidate: id={r['id']!r} appid={r['dataAppid']!r} cls={r['cls']!r}")

        actor_id = sheet_info["actorId"]
        app_id = sheet_info["appId"]

        # Click the Bio tab via JS to be selector-agnostic.
        await page.evaluate(f"""() => {{
            const root = document.getElementById('{app_id}') || document.querySelector('[data-appid="{app_id}"]');
            const bio = root && root.querySelector('a[data-tab="bio"][data-group="primary"]');
            if (bio) bio.click();
        }}""")
        await page.wait_for_timeout(800)

        # Locator for the Ship Role panel inside this app.
        panel_locator = f"#{app_id} .rt-panel:has(select[name='system.bio.shipRole.value'])"

        async def shoot(name, capture_full=False):
            # Scroll panel into view, screenshot just the panel.
            handle = await page.query_selector(panel_locator)
            if not handle:
                failures.append(f"{name}: panel not in DOM")
                return None
            try:
                await handle.scroll_into_view_if_needed()
            except Exception:
                pass
            await page.wait_for_timeout(200)
            await handle.screenshot(path=str(OUT / name))
            if capture_full:
                root = await page.query_selector(f"#{app_id}")
                if root:
                    await root.screenshot(path=str(OUT / name.replace(".png", "-fullsheet.png")))
            return True

        # 1. Empty state
        await shoot("01-empty.png")
        empty_options = await page.evaluate(f"""() => {{
            const sel = document.querySelector('#{app_id} select[name="system.bio.shipRole.value"]');
            return sel ? sel.options.length : -1;
        }}""")
        notes.append(f"01-empty.png: dropdown options = {empty_options} (expect 23)")
        if empty_options != 23:
            failures.append(f"dropdown options = {empty_options}, want 23")

        async def select_role(key, label, fname):
            await page.evaluate(f"""async () => {{
                const a = game.actors.get('{actor_id}');
                await a.update({{'system.bio.shipRole.value': '{key}'}});
            }}""")
            await page.wait_for_timeout(900)
            # Re-click bio tab in case re-render flipped to another tab.
            await page.evaluate(f"""() => {{
                const root = document.getElementById('{app_id}') || document.querySelector('[data-appid="{app_id}"]');
                const bio = root && root.querySelector('a[data-tab="bio"][data-group="primary"]');
                if (bio) bio.click();
            }}""")
            await page.wait_for_timeout(400)
            await shoot(fname)
            benefit = await page.evaluate(f"""() => {{
                const el = document.querySelector('#{app_id} .ship-role-detail__row--benefit .ship-role-detail__value');
                return el ? el.textContent.trim() : null;
            }}""")
            notes.append(f"{fname}: role={label}, benefit={benefit!r}")
            return benefit

        b1 = await select_role("lordCaptain", "Lord-Captain (rank 1)", "02-lord-captain.png")
        if b1 and "Hold Fast" not in b1:
            failures.append(f"Lord-Captain benefit missing 'Hold Fast': {b1!r}")

        b2 = await select_role("masterHelmsman", "Master Helmsman (rank 3)", "03-master-helmsman.png")
        if b2 and "Evasive Manoeuvres" not in b2:
            failures.append(f"Master Helmsman benefit missing 'Evasive Manoeuvres': {b2!r}")

        b3 = await select_role("twistcatcher", "Twistcatcher (rank 4)", "04-twistcatcher.png")
        if b3 and "1d5 Crew Population" not in b3:
            failures.append(f"Twistcatcher benefit missing '1d5 Crew Population': {b3!r}")

        # Persistence probe — set notes and confirm round-trip in the DOM
        await page.evaluate(f"""async () => {{
            const a = game.actors.get('{actor_id}');
            await a.update({{'system.bio.shipRole.notes': 'verify probe: leads Bridge Gamma; see GM notes'}});
        }}""")
        await page.wait_for_timeout(800)
        await page.evaluate(f"""() => {{
            const root = document.getElementById('{app_id}') || document.querySelector('[data-appid="{app_id}"]');
            const bio = root && root.querySelector('a[data-tab="bio"][data-group="primary"]');
            if (bio) bio.click();
        }}""")
        await page.wait_for_timeout(400)
        await shoot("05-with-notes.png", capture_full=True)
        notes_val = await page.evaluate(f"""() => {{
            const i = document.querySelector('#{app_id} input[name="system.bio.shipRole.notes"]');
            return i ? i.value : null;
        }}""")
        notes.append(f"notes field after update = {notes_val!r}")
        if "verify probe" not in (notes_val or ""):
            failures.append(f"notes round-trip failed: {notes_val!r}")

        # Teardown
        await page.evaluate(f"""async () => {{
            const a = game.actors.get('{actor_id}');
            try {{ await a.sheet.close(); }} catch (_) {{}}
            await a.delete();
        }}""")

        await browser.close()

    print("=== Ship Role Panel Verify ===")
    print(f"output dir: {OUT}")
    for n in notes:
        print(f"  {n}")
    print(f"  failures: {len(failures)}")
    for f in failures:
        print(f"    - {f}")
    sys.exit(1 if failures else 0)


asyncio.run(main())
