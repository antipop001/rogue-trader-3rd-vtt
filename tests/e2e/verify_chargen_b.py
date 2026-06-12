"""Stage B verification — origin-path wizard on live foundrySB.

Builds a known Core character through the real UI:
manual characteristics → Void Born → Stubjack (char choice WS, insanity 3) →
Renegade-or-first-Core lure → Dark Voyage (insanity 4) → first Core motivation →
career Rogue Trader → wounds dice 3 / fate d10 6 → commit.
Asserts characteristics modifiers, skills, embedded items, bio.originPath,
insanity, wounds/fate, and internal flags consistency.
"""
import asyncio
import sys
from pathlib import Path
from playwright.async_api import async_playwright

URL = "http://192.168.11.36:30000/join"
OUT = Path("/home/ahermon/chargen-verify")
NAME = "__ChargenStageB"
ABBRS = ["WS", "BS", "S", "T", "Ag", "Int", "Per", "WP", "Fel"]
MANUAL = {"WS": 35, "BS": 36, "S": 37, "T": 41, "Ag": 38, "Int": 39, "Per": 40, "WP": 42, "Fel": 43}


async def wait_app(page):
    await page.wait_for_function("!!document.querySelector('.rt-chargen-app .rt-chargen__layout')", timeout=10_000)
    await page.wait_for_timeout(300)


async def nav(page, key):
    await page.evaluate(f"document.querySelector('.rt-chargen-app [data-action=navPage][data-page={key}]').click()")
    await page.wait_for_timeout(500)


async def set_select(page, selector, value):
    await page.select_option(f".rt-chargen-app {selector}", value)
    await page.wait_for_timeout(500)


async def fill_change(page, selector, value):
    sel = f".rt-chargen-app {selector}"
    await page.fill(sel, str(value))
    await page.dispatch_event(sel, "change")
    await page.wait_for_timeout(400)


async def main():
    OUT.mkdir(exist_ok=True)
    failures, notes = [], []

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        page = await (await browser.new_context(viewport={"width": 1600, "height": 1000})).new_page()
        page.on("pageerror", lambda e: failures.append(f"pageerror: {e}"))

        await page.goto(URL, wait_until="networkidle")
        await page.select_option('select[name="userid"]', label="Gamemaster")
        await page.click('button[name="join"]')
        await page.wait_for_function("typeof game !== 'undefined' && game.ready", timeout=60_000)
        await page.evaluate(f"(async () => {{ const a = game.actors.getName('{NAME}'); if (a) await a.delete(); }})()")

        # Open the wizard.
        await page.evaluate("ui.sidebar.changeTab ? ui.sidebar.changeTab('actors', 'primary') : ui.sidebar.activateTab('actors')")
        await page.wait_for_function("!!document.querySelector('.rt-chargen-open')", timeout=10_000)
        await page.evaluate("document.querySelector('.rt-chargen-open').click()")
        await wait_app(page)

        # Stage 1: manual characteristics.
        await fill_change(page, "input[name=charname]", NAME)
        await set_select(page, "select[name=method]", "manual")
        for a, v in MANUAL.items():
            await fill_change(page, f'input[data-abbr="{a}"]', v)

        # Home World: Void Born.
        await nav(page, "home_world")
        await set_select(page, "select[data-step-option=home_world]", "Void Born")
        detail = await page.text_content(".rt-chargen-app .rt-chargen__detail")
        if "Charmed" not in detail:
            failures.append("Void Born detail box missing trait summary")
        await page.screenshot(path=OUT / "b1_homeworld.png")

        # Birthright: Stubjack (char_mod_choice + insanity roll).
        await nav(page, "birthright")
        await set_select(page, "select[data-step-option=birthright]", "Stubjack")
        # Pending choice: characteristic; pick WS. Pending roll: type 3.
        n_pending = await page.evaluate("document.querySelectorAll('.rt-chargen-app [data-choice-id]').length")
        if n_pending < 1:
            failures.append("Stubjack: expected a pending characteristic choice")
        else:
            await set_select(page, "select[data-choice-id]", "WS")
        await fill_change(page, "input[data-roll-id]", 3)
        await page.screenshot(path=OUT / "b2_birthright.png")

        # Lure of the Void: first Core option in the dropdown.
        await nav(page, "lure_of_the_void")
        first_lure = await page.evaluate(
            "Array.from(document.querySelectorAll('.rt-chargen-app select[data-step-option] option'))"
            ".map(o => o.value).filter(v => v && !v.includes('—'))[0]")
        await set_select(page, "select[data-step-option=lure_of_the_void]", first_lure)
        notes.append(f"lure picked: {first_lure}")
        # Resolve any pendings generically (selects: first option; rolls: 2).
        await page.evaluate("""async () => {
            for (const sel of document.querySelectorAll('.rt-chargen-app .rt-chargen__pending select[data-choice-id]')) {
                const opt = Array.from(sel.options).map(o => o.value).find(v => v);
                if (opt) { sel.value = opt; sel.dispatchEvent(new Event('change')); await new Promise(r => setTimeout(r, 400)); }
            }
        }""")
        await page.wait_for_timeout(400)
        await page.evaluate("""async () => {
            for (const inp of document.querySelectorAll('.rt-chargen-app .rt-chargen__pending input[data-roll-id]')) {
                if (!inp.value) { inp.value = '2'; inp.dispatchEvent(new Event('change')); await new Promise(r => setTimeout(r, 400)); }
            }
        }""")
        await page.wait_for_timeout(400)

        # Trials: Dark Voyage, insanity roll 4.
        await nav(page, "trials_and_travails")
        await set_select(page, "select[data-step-option=trials_and_travails]", "Dark Voyage")
        await fill_change(page, "input[data-roll-id]", 4)

        # Motivation: first Core option, resolve pendings generically.
        await nav(page, "motivation")
        first_mot = await page.evaluate(
            "Array.from(document.querySelectorAll('.rt-chargen-app select[data-step-option] option'))"
            ".map(o => o.value).filter(v => v)[0]")
        await set_select(page, "select[data-step-option=motivation]", first_mot)
        notes.append(f"motivation picked: {first_mot}")
        await page.evaluate("""async () => {
            for (const sel of document.querySelectorAll('.rt-chargen-app .rt-chargen__pending select[data-choice-id]')) {
                const opt = Array.from(sel.options).map(o => o.value).find(v => v);
                if (opt) { sel.value = opt; sel.dispatchEvent(new Event('change')); await new Promise(r => setTimeout(r, 400)); }
            }
            for (const inp of document.querySelectorAll('.rt-chargen-app .rt-chargen__pending input[data-roll-id]')) {
                if (!inp.value) { inp.value = '2'; inp.dispatchEvent(new Event('change')); await new Promise(r => setTimeout(r, 400)); }
            }
        }""")
        await page.wait_for_timeout(400)

        # Career.
        await nav(page, "career")
        await set_select(page, "select[name=career]", "Rogue Trader")

        # Finish: wounds 3, fate 6; screenshot summary; commit.
        await nav(page, "finish")
        await fill_change(page, "input[name=wounds-roll]", 3)
        await fill_change(page, "input[name=fate-roll]", 6)
        summary = await page.text_content(".rt-chargen-app .rt-chargen__pane")
        await page.screenshot(path=OUT / "b3_finish.png")
        warn = await page.evaluate(
            "Array.from(document.querySelectorAll('.rt-chargen-app .rt-chargen__warnings p')).map(p => p.textContent.trim())")
        notes.append(f"finish warnings: {warn}")

        commit_disabled = await page.is_disabled('.rt-chargen-app [data-action="commit"]')
        if commit_disabled:
            failures.append("commit disabled at finish")
        else:
            await page.click('.rt-chargen-app [data-action="commit"]')
            try:
                await page.wait_for_function(f"!!game.actors.getName('{NAME}')", timeout=15_000)
            except Exception:
                pass
            await page.wait_for_timeout(1500)

        # ---------- assertions on the created actor ----------
        check = await page.evaluate("""(NAME) => {
            const a = game.actors.getName(NAME);
            if (!a) return {error: 'actor not created'};
            const c = a.system.characteristics;
            const fl = a.flags?.rt?.chargen ?? {};
            return {
                S: c.strength, WP: c.willpower, WS: c.weaponSkill, T: c.toughness,
                skills: {
                    navStellar: a.system.skills.navigate?.specialities?.stellar,
                    pilotSpace: a.system.skills.pilot?.specialities?.spaceCraft,
                },
                items: a.items.map(i => `${i.type}:${i.name}`),
                bio: a.system.bio.originPath,
                legacyHomeWorld: a.system.bio.homeWorld,
                insanity: a.system.insanity,
                wounds: a.system.wounds,
                fate: a.system.fate,
                xp: a.system.experience,
                flagsInsanity: fl.insanity,
                flagsWounds: fl.wounds,
                flagsOrigin: fl.origin,
            };
        }""", NAME)

        if check.get("error"):
            failures.append(check["error"])
        else:
            # Void Born: S -5 / WP +5 as modifiers; bases untouched.
            if check["S"]["base"] != 37 or check["S"]["modifier"] != -5:
                failures.append(f"S wrong: {check['S']}")
            if check["WP"]["base"] != 42 or check["WP"]["modifier"] < 5:
                failures.append(f"WP wrong: {check['WP']}")
            # Stubjack choice WS +3 (data amount may differ; assert positive modifier).
            if check["WS"]["modifier"] <= 0:
                failures.append(f"WS choice modifier missing: {check['WS']}")
            # Skills.
            if not check["skills"]["navStellar"] or not check["skills"]["navStellar"]["taken"]:
                failures.append(f"Navigation (Stellar) not on sheet: {check['skills']}")
            # Void Born traits as items.
            for t in ["trait:Charmed", "trait:Ill-omened", "trait:Void Accustomed"]:
                if t not in check["items"]:
                    failures.append(f"missing item {t}")
            # Bio.
            if check["bio"]["homeWorld"]["value"] != "Void Born":
                failures.append(f"bio homeWorld: {check['bio']['homeWorld']}")
            if check["bio"]["career"]["value"] != "Rogue Trader":
                failures.append(f"bio career: {check['bio']['career']}")
            if check["legacyHomeWorld"]:
                failures.append(f"legacy bio.homeWorld must stay empty, got: {check['legacyHomeWorld']}")
            # Insanity: at least Stubjack 3 + Dark Voyage 4 (other picks may add more).
            if check["insanity"] < 7:
                failures.append(f"insanity {check['insanity']} < expected ≥7")
            if check["insanity"] != check["flagsInsanity"]:
                failures.append("insanity differs from flags state")
            # Wounds: TB 4 ×2 + 3 = 11 (+ any origin wound bonus). Fate roll 6 -> 4 (+adj).
            if check["wounds"]["max"] < 11 or not check["wounds"]["rolled"]:
                failures.append(f"wounds wrong: {check['wounds']}")
            if check["wounds"]["max"] != check["flagsWounds"]:
                failures.append("wounds differ from flags state")
            if check["fate"]["max"] < 3 or not check["fate"]["rolled"]:
                failures.append(f"fate wrong: {check['fate']}")
            if check["xp"]["total"] != 500:
                failures.append(f"xp total: {check['xp']}")
            notes.append(f"insanity={check['insanity']} wounds={check['wounds']['max']} fate={check['fate']['max']} xpUsed={check['xp']['used']}")
            notes.append(f"origin={check['flagsOrigin']}")
            n_items = len(check["items"])
            notes.append(f"{n_items} embedded items")

        # Cleanup.
        await page.evaluate(f"(async () => {{ const a = game.actors.getName('{NAME}'); if (a) await a.delete(); }})()")
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
