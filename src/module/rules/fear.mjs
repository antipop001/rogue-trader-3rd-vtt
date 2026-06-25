// RT 1e Fear / Shock subsystem (QA-081).
//
// A Fear Test is a Willpower Test modified by the source's Fear Rating (RT Core p.293-295,
// Table 10-3). On a COMBAT failure the character rolls on the Shock Table (Table 10-4, the
// `Fear` RollTable in the `tables` pack) at +10 per Degree of Failure. On a NON-COMBAT
// failure he takes −10 to concentration tests, and a failure by 30+ (3+ DoF) also gains
// +1d5 Insanity. A sufficiently insane character is immune (Table 10-3 sidebar p.295).
//
// Pure helpers are unit-tested; the actor-facing flow (rollFearTest / openFearDialog) is
// live-verified. Design follows the QA-080 condition layer: the GM/player invokes the test
// (a control / `game.rt.fearTest()`), it resolves deterministically, and combat failures
// auto-draw the Shock table.

import { getDegree } from '../rolls/roll-helpers.mjs';

// Inlined (not imported from hooks-manager) so the pure helpers stay node-testable —
// importing hooks-manager would transitively pull in Foundry-only modules.
const SYSTEM_ID = 'rogue-trader-3rd';

/**
 * The Willpower-test modifier for a given Fear Rating (RT Core Table 10-3):
 * Fear (1) Disturbing 0, (2) Frightening −10, (3) Horrifying −20, (4) Terrifying −30.
 * @param {number} rating  the source's Fear Rating (1–4)
 * @returns {number} the WP-test modifier (0, −10, −20, −30)
 */
export function fearTestModifier(rating) {
    const r = Math.max(1, Math.min(4, Math.floor(Number(rating) || 1)));
    const m = -10 * (r - 1);
    return m === 0 ? 0 : m;     // normalise −0 → 0
}

/**
 * Whether a character is too insane to fear a thing (RT Core p.295): "If the first digit of
 * a character's Insanity total is double or more a thing's Fear Rating … the character is
 * unaffected." The "first digit" is the tens digit (⌊IP/10⌋, the Insanity Bonus).
 * @param {number} insanity  the character's Insanity total (0–100)
 * @param {number} rating    the source's Fear Rating (1–4)
 * @returns {boolean} true if no Fear Test is needed
 */
export function fearAutoImmune(insanity, rating) {
    const r = Math.floor(Number(rating) || 0);
    if (r < 1) return true;                               // nothing frightening
    const firstDigit = Math.floor((Number(insanity) || 0) / 10);
    return firstDigit >= 2 * r;
}

/**
 * The Shock-Table roll bonus on a combat Fear failure: +10 per Degree of Failure (RT Core
 * p.294 — every DoF, NOT "after the first"; the latter is a DH2-ism, cf. BUG-001).
 * @param {number} dof  degrees of failure (≥1 on a failed test)
 * @returns {number} the additive Shock-table modifier
 */
export function shockRollModifier(dof) {
    return 10 * Math.max(0, Math.floor(Number(dof) || 0));
}

/** Draw the `Fear` (Shock) RollTable, offsetting the d100 by +10×DoF (clamped to 1–100). */
async function drawShockTable(dof) {
    const pack = game.packs.get(`${SYSTEM_ID}.tables`);
    if (!pack) return null;
    const index = pack.index?.size ? pack.index : await pack.getIndex();
    const entry = index.find((e) => e.name === 'Fear');
    if (!entry) return null;
    const table = await pack.getDocument(entry._id);
    if (!table) return null;
    const base = new Roll('1d100');
    await base.evaluate();
    const total = Math.max(1, Math.min(100, base.total + shockRollModifier(dof)));
    const results = table.getResultsForRoll ? table.getResultsForRoll(total) : [];
    const text = (results ?? []).map((r) => r.text ?? r.description ?? '').filter(Boolean).join(' ');
    return { rolled: base.total, total, text };
}

/**
 * Resolve a Fear Test for an actor against a source of the given Fear Rating, posting the
 * outcome to chat. Combat failures draw the Shock Table; non-combat fail-by-30 gains 1d5
 * Insanity. (QA-081.)
 * @param {Actor} actor    the testing character
 * @param {number} rating  the source's Fear Rating (1–4)
 * @param {{combat?: boolean}} [opts]
 * @returns {Promise<object>} a summary of the resolution
 */
export async function rollFearTest(actor, rating, { combat = true } = {}) {
    if (!actor) return null;
    const insanity = actor.system?.insanity ?? 0;
    const speaker = ChatMessage.getSpeaker({ actor });

    // Insanity auto-immunity — no test needed.
    if (fearAutoImmune(insanity, rating)) {
        await ChatMessage.create({
            speaker,
            content: `<p><strong>Fear (${rating})</strong>: ${actor.name} is too unhinged to be afraid (Insanity ${insanity}) — no Fear Test required.</p>`,
        });
        return { immune: true };
    }

    const wp = actor.characteristics?.willpower?.total ?? 0;
    const modifier = fearTestModifier(rating);
    const target = wp + modifier;
    const roll = new Roll('1d100');
    await roll.evaluate();
    const success = roll.total === 1 || (roll.total <= target && roll.total !== 100);

    if (success) {
        await ChatMessage.create({
            speaker,
            content: `<p><strong>Fear Test (${rating})</strong> — Willpower ${wp}${modifier ? ` ${modifier}` : ''} = ${target}: rolled <strong>${roll.total}</strong>. ${actor.name} <strong>holds firm</strong>.</p>`,
            rolls: [roll],
        });
        return { success: true, roll: roll.total, target };
    }

    const dof = Math.max(1, getDegree(roll.total, target));
    let body;
    const result = { success: false, roll: roll.total, target, dof, combat };

    if (combat) {
        const shock = await drawShockTable(dof);
        result.shock = shock;
        body = `succumbs to Fear — <strong>Shock Table</strong> at +${shockRollModifier(dof)} (${dof} DoF): rolled ${shock?.rolled ?? '?'} → <strong>${shock?.total ?? '?'}</strong>.` +
               (shock?.text ? `<br/><em>${shock.text}</em>` : '');
    } else {
        body = `is unnerved — <strong>−10 to all concentration tests</strong> while near the source.`;
        if (dof >= 3) {
            const ins = new Roll('1d5');
            await ins.evaluate();
            const newInsanity = Math.min(100, insanity + ins.total);
            if (actor.isOwner) await actor.update({ 'system.insanity': newInsanity });
            result.insanityGained = ins.total;
            body += ` Failed by 30+ → gains <strong>${ins.total} Insanity</strong> (now ${newInsanity}).`;
        }
    }

    await ChatMessage.create({
        speaker,
        content: `<p><strong>Fear Test (${rating})</strong> — Willpower ${wp}${modifier ? ` ${modifier}` : ''} = ${target}: rolled <strong>${roll.total}</strong> (${dof} DoF). ${actor.name} ${body}</p>`,
        rolls: [roll],
    });
    return result;
}

/**
 * Open a small dialog to run a Fear Test on the given actor (or the user's selected /
 * assigned character). Registered as `game.rt.fearTest()`.
 */
export async function openFearDialog(actor = null) {
    const subject = actor
        ?? game.user.character
        ?? canvas.tokens?.controlled?.[0]?.actor;
    if (!subject) {
        ui.notifications.warn('Select a token or assign a character to run a Fear Test.');
        return;
    }
    const content = `
      <form class="rt-fear-test" autocomplete="off">
        <div class="form-group">
          <label>Fear Rating (source)</label>
          <select name="rating">
            <option value="1">Fear (1) — Disturbing (0)</option>
            <option value="2">Fear (2) — Frightening (−10)</option>
            <option value="3">Fear (3) — Horrifying (−20)</option>
            <option value="4">Fear (4) — Terrifying (−30)</option>
          </select>
        </div>
        <div class="form-group">
          <label><input type="checkbox" name="combat" checked/> Combat situation (failure → Shock Table)</label>
        </div>
      </form>`;
    const DialogV2 = foundry.applications?.api?.DialogV2;
    const handler = async (rating, combat) => rollFearTest(subject, Number(rating), { combat });
    if (DialogV2) {
        await DialogV2.prompt({
            window: { title: `Fear Test — ${subject.name}` },
            content,
            ok: {
                label: 'Roll Fear Test',
                callback: (_ev, button) => {
                    const form = button.form;
                    return handler(form.rating.value, form.combat.checked);
                },
            },
        });
    } else {
        // Fallback for older cores.
        new Dialog({
            title: `Fear Test — ${subject.name}`,
            content,
            buttons: {
                roll: {
                    label: 'Roll Fear Test',
                    callback: (html) => handler(html.find('[name=rating]').val(), html.find('[name=combat]').is(':checked')),
                },
            },
            default: 'roll',
        }).render(true);
    }
}
