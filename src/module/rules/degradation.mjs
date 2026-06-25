// RT 1e Insanity / Corruption degradation tracks (QA-083).
//
// Insanity and Corruption are point tracks that, on crossing thresholds, force tests
// (RT Core p.296-301): every 10 Insanity → a Trauma Test (WP, modified by the Insanity
// Track Table 10-5); failure draws Table 10-6 Mental Traumas at +10×DoF. Insanity 40/60/80
// also grant a Minor/Severe/Acute mental Disorder. Every 10 Corruption → a Malignancy Test
// (WP, modified by the Corruption Track Table 10-7); failure draws Table 10-8 Malignancies.
// Every 30 Corruption → a Mutation Test (two Characteristics of the player's choice) or a
// random Minor Mutation (Table 14-3).
//
// Pure track/threshold helpers are unit-tested; the Foundry-coupled flows post to chat and
// the `updateActor` hook auto-fires the tests on a point increase (first-GM only).

import { getDegree } from '../rolls/roll-helpers.mjs';

const SYSTEM_ID = 'rogue-trader-3rd';   // inlined to keep helpers node-testable (cf. fear.mjs)

/**
 * The Insanity Track (RT Core Table 10-5): Degree of Madness + the Trauma-Test modifier for
 * a given Insanity total.
 * @param {number} ip  Insanity total (0–100+)
 * @returns {{degree: string, traumaModifier: number, retired: boolean}}
 */
export function insanityTrack(ip) {
    const n = Math.max(0, Math.floor(Number(ip) || 0));
    if (n >= 100) return { degree: 'Terminally Insane', traumaModifier: -30, retired: true };
    if (n >= 80) return { degree: 'Deranged', traumaModifier: -20, retired: false };
    if (n >= 60) return { degree: 'Unhinged', traumaModifier: -10, retired: false };
    if (n >= 40) return { degree: 'Disturbed', traumaModifier: 0, retired: false };
    if (n >= 10) return { degree: 'Unsettled', traumaModifier: 10, retired: false };
    return { degree: 'Stable', traumaModifier: 0, retired: false };
}

/**
 * The Corruption Track (RT Core Table 10-7): Degree of Corruption + the Malignancy-Test
 * modifier + the Mutation-Test tier for a given Corruption total.
 * @param {number} cp  Corruption total (0–100)
 * @returns {{degree: string, malignancyModifier: number, mutationTier: number, damned: boolean}}
 */
export function corruptionTrack(cp) {
    const n = Math.max(0, Math.floor(Number(cp) || 0));
    if (n >= 100) return { degree: 'Damned', malignancyModifier: -30, mutationTier: 3, damned: true };
    if (n >= 91) return { degree: 'Profane', malignancyModifier: -30, mutationTier: 3, damned: false };
    if (n >= 61) return { degree: 'Debased', malignancyModifier: -20, mutationTier: 2, damned: false };
    if (n >= 31) return { degree: 'Soiled', malignancyModifier: -10, mutationTier: 1, damned: false };
    return { degree: 'Tainted', malignancyModifier: 0, mutationTier: 0, damned: false };
}

/**
 * The multiples of `step` strictly above `oldVal` and at-or-below `newVal` — i.e. the
 * threshold boundaries crossed by an increase from oldVal to newVal. Returns [] when the
 * value did not rise. e.g. (8, 23, 10) → [10, 20]; (40, 40, 10) → [].
 * @returns {number[]} crossed threshold values, ascending
 */
export function thresholdsCrossed(oldVal, newVal, step) {
    const o = Math.floor(Number(oldVal) || 0);
    const n = Math.floor(Number(newVal) || 0);
    const s = Math.max(1, Math.floor(Number(step) || 1));
    const out = [];
    for (let t = (Math.floor(o / s) + 1) * s; t <= n; t += s) out.push(t);
    return out;
}

/**
 * The mental-Disorder severities newly gained crossing Insanity 40 (Minor), 60 (Severe),
 * 80 (Acute) — RT Core p.296.
 * @returns {string[]} e.g. ['Minor'] or ['Severe', 'Acute']
 */
export function disordersGained(oldIp, newIp) {
    const marks = [[40, 'Minor'], [60, 'Severe'], [80, 'Acute']];
    const o = Math.floor(Number(oldIp) || 0);
    const n = Math.floor(Number(newIp) || 0);
    return marks.filter(([at]) => o < at && n >= at).map(([, sev]) => sev);
}

/** Draw a `tables`-pack RollTable by name, offsetting the d100 by `modifier` (clamped 1–100). */
async function drawTableModified(tableName, modifier = 0) {
    const pack = game.packs.get(`${SYSTEM_ID}.tables`);
    if (!pack) return null;
    const index = pack.index?.size ? pack.index : await pack.getIndex();
    const entry = index.find((e) => e.name === tableName);
    if (!entry) return null;
    const table = await pack.getDocument(entry._id);
    if (!table) return null;
    const base = new Roll('1d100');
    await base.evaluate();
    // Cap at 200, NOT 100 — Mental Traumas extends past 100 (the +10×DoF is what reaches the
    // worse rows). The base d100 is ≤100, so a 0-modifier draw never exceeds the 1–100 rows.
    const total = Math.max(1, Math.min(200, base.total + (Number(modifier) || 0)));
    const results = table.getResultsForRoll ? table.getResultsForRoll(total) : [];
    const text = (results ?? []).map((r) => r.text ?? r.description ?? '').filter(Boolean).join(' ');
    return { rolled: base.total, total, text };
}

/** Roll a Willpower test; returns {success, roll, target, dof}. */
async function willpowerTest(actor, modifier) {
    const wp = actor.characteristics?.willpower?.total ?? 0;
    const target = wp + (Number(modifier) || 0);
    const roll = new Roll('1d100');
    await roll.evaluate();
    const success = roll.total === 1 || (roll.total <= target && roll.total !== 100);
    const dof = success ? 0 : Math.max(1, getDegree(roll.total, target));
    return { success, roll: roll.total, target, dof, wp, modifier: Number(modifier) || 0 };
}

function modLabel(m) {
    return m === 0 ? '+0' : (m > 0 ? `+${m}` : `${m}`);
}

/** Trauma Test (WP at the Insanity-Track modifier); on failure draws Mental Traumas at +10×DoF. */
export async function rollTraumaTest(actor, totalInsanity) {
    if (!actor) return null;
    const ip = totalInsanity ?? actor.system?.insanity ?? 0;
    const { traumaModifier, degree } = insanityTrack(ip);
    const speaker = ChatMessage.getSpeaker({ actor });
    const t = await willpowerTest(actor, traumaModifier);
    let body;
    if (t.success) {
        body = `<strong>copes</strong> with the experience.`;
    } else {
        const draw = await drawTableModified('Mental Traumas', 10 * t.dof);
        body = `suffers <strong>Mental Trauma</strong> (+${10 * t.dof}, ${t.dof} DoF → ${draw?.total ?? '?'}).` +
               (draw?.text ? `<br/><em>${draw.text}</em>` : '');
    }
    await ChatMessage.create({
        speaker,
        content: `<p><strong>Trauma Test</strong> @ ${ip} IP (${degree}, ${modLabel(t.modifier)}) — WP ${t.wp} = ${t.target}: rolled <strong>${t.roll}</strong>. ${actor.name} ${body}</p>`,
    });
    return { ...t, kind: 'trauma' };
}

/** Malignancy Test (WP at the Corruption-Track modifier); on failure draws Malignancies. */
export async function rollMalignancyTest(actor, totalCorruption) {
    if (!actor) return null;
    const cp = totalCorruption ?? actor.system?.corruption ?? 0;
    const { malignancyModifier, degree } = corruptionTrack(cp);
    const speaker = ChatMessage.getSpeaker({ actor });
    const t = await willpowerTest(actor, malignancyModifier);
    let body;
    if (t.success) {
        body = `<strong>resists</strong> — no Malignancy manifests.`;
    } else {
        const draw = await drawTableModified('Malignancies', 0);
        body = `gains a <strong>Malignancy</strong> (rolled ${draw?.total ?? '?'}).` +
               (draw?.text ? `<br/><em>${draw.text}</em>` : '');
    }
    await ChatMessage.create({
        speaker,
        content: `<p><strong>Malignancy Test</strong> @ ${cp} CP (${degree}, ${modLabel(t.modifier)}) — WP ${t.wp} = ${t.target}: rolled <strong>${t.roll}</strong>. ${actor.name} ${body}</p>`,
    });
    return { ...t, kind: 'malignancy' };
}

/**
 * Mutation prompt (every 30 CP): the character tests two Characteristics of his choice or
 * suffers a random Minor Mutation. The two-Characteristic choice is player agency, so this
 * draws and presents the Mutation that WOULD apply on a failure — the GM applies or waives
 * it after the player resolves the two tests.
 */
export async function rollMutationTest(actor) {
    if (!actor) return null;
    const speaker = ChatMessage.getSpeaker({ actor });
    const draw = await drawTableModified('Mutations', 0);
    await ChatMessage.create({
        speaker,
        content: `<p><strong>Mutation Test</strong> (every 30 CP) — ${actor.name} must test <em>two Characteristics of his choice</em> (each not used before) or suffer this Minor Mutation (rolled ${draw?.total ?? '?'}):` +
                 (draw?.text ? `<br/><em>${draw.text}</em>` : '') + `</p>`,
    });
    return { kind: 'mutation', draw };
}

/**
 * `updateActor` hook handler: when an actor's Insanity/Corruption rises past a threshold,
 * auto-fire the corresponding tests. Runs first-GM only (passed in) to avoid duplicate
 * firing across connected clients. (QA-083.)
 * @param {Actor} actor    the updated actor (post-update)
 * @param {object} changes the update diff (system.insanity / system.corruption)
 * @param {{oldInsanity:number, oldCorruption:number}} prev  pre-update totals
 */
export async function processDegradation(actor, prev) {
    if (!actor) return;
    const newIp = actor.system?.insanity ?? 0;
    const newCp = actor.system?.corruption ?? 0;

    // Insanity: a Trauma Test per 10-IP boundary crossed; Disorders at 40/60/80.
    for (const mark of thresholdsCrossed(prev.oldInsanity, newIp, 10)) {
        await rollTraumaTest(actor, mark);
    }
    for (const sev of disordersGained(prev.oldInsanity, newIp)) {
        await ChatMessage.create({
            speaker: ChatMessage.getSpeaker({ actor }),
            content: `<p><strong>Mental Disorder</strong> — ${actor.name} gains a <strong>${sev}</strong> Disorder (GM/player selects; RT Core p.296).</p>`,
        });
    }

    // Corruption: a Malignancy Test per 10-CP boundary; a Mutation Test per 30-CP boundary.
    for (const mark of thresholdsCrossed(prev.oldCorruption, newCp, 10)) {
        await rollMalignancyTest(actor, mark);
    }
    for (const _mark of thresholdsCrossed(prev.oldCorruption, newCp, 30)) {
        await rollMutationTest(actor);
    }
}
