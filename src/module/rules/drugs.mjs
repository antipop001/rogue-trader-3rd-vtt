import { consumableActivation, parseConsumableDuration } from '../rolls/roll-helpers.mjs';

// Drug / combat-stimm timed effects (RT Core p.142-143, ItS). A drug applies an up-front benefit
// (an ActiveEffect, an optional granted Talent, or a focus-test-branched effect), then WEARS OFF
// after a rolled duration — removing the benefit and applying any comedown. Because Foundry only
// auto-expires duration.rounds in active combat and duration.seconds as worldTime advances (which
// it doesn't, out of combat), this module tracks each active drug on the actor and expires it from
// the combat-round hook, the updateWorldTime hook, or a manual "Wears off now" chat button.
// (QA-143 talent grants / QA-144 comedowns / QA-145 self-expiry.)

const SYSTEM_ID = 'rogue-trader-3rd';
const CHARS = ['weaponSkill', 'ballisticSkill', 'strength', 'toughness', 'agility', 'intelligence', 'perception', 'willpower', 'fellowship'];

async function findTalent(name) {
    const pack = game.packs.get(`${SYSTEM_ID}.talents`);
    if (!pack) return null;
    const index = pack.index?.size ? pack.index : await pack.getIndex();
    const entry = index.find(e => e.name === name);
    return entry ? await pack.getDocument(entry._id) : null;
}

const mod = (key, value) => ({ key: `system.characteristics.${key}.modifier`, mode: 2, value: String(value), priority: null });

export async function useDrug(actor, item) {
    const spec = consumableActivation(item.name);
    if (!spec || !actor) return;

    // Roll the duration and translate it to both a Foundry AE duration and an expiry marker.
    const dur = parseConsumableDuration(spec.durationText);
    let durationLabel = spec.durationText;
    const aeDuration = {};
    let expiry = { kind: 'manual' };
    if (dur) {
        const roll = await new Roll(dur.formula).evaluate();
        const value = roll.total;
        durationLabel = `${value} ${dur.unit}`;
        if (dur.durationKey === 'rounds') {
            aeDuration.rounds = value;
            expiry = { kind: 'rounds', round: (game.combat?.round ?? 0) + value };
        } else {
            const seconds = value * dur.secondsPer;
            aeDuration.seconds = seconds;
            expiry = { kind: 'time', worldTime: (game.time?.worldTime ?? 0) + seconds };
        }
    }

    const drugId = foundry.utils.randomID();

    // Attention Spanner (ItS): the benefit is branched on a focus Test — success grants +30 to
    // Intelligence Tests, failure −20 to ALL Tests. Roll it here so the right AE is applied. (QA-144.)
    let changes = (spec.changes ?? []).map(c => ({ ...c, value: String(c.value), priority: null }));
    let focusLine = '';
    if (spec.focusTest) {
        const wp = Number(actor.system?.characteristics?.willpower?.total) || 0;
        const r = await new Roll('1d100').evaluate();
        const success = r.total <= wp;
        focusLine = `<p><strong>Focus Test:</strong> rolled ${r.total} vs WP ${wp} — ${success ? 'success (+30 to Intelligence Tests)' : 'failure (−20 to all Tests)'}.</p>`;
        changes = success ? [mod('intelligence', 30)] : CHARS.map(c => mod(c, -20));
    }

    // Up-front benefit AE.
    const [effect] = await actor.createEmbeddedDocuments('ActiveEffect', [{
        name: spec.label ?? item.name,
        img: item.img ?? 'icons/svg/aura.svg',
        origin: item.uuid,
        duration: aeDuration,
        description: spec.note ?? '',
        changes,
        flags: { rt: { consumable: true, drugId } },
    }]);

    // Granted Talent (QA-143) — embed a copy of the pack talent for the duration, tagged for removal.
    let talentId = null;
    if (spec.grantsTalent) {
        const talent = await findTalent(spec.grantsTalent);
        if (talent) {
            const data = talent.toObject();
            foundry.utils.setProperty(data, 'flags.rt.drugGrant', drugId);
            const [t] = await actor.createEmbeddedDocuments('Item', [data]);
            talentId = t.id;
        }
    }

    // Record the active drug so it can be expired later.
    const active = foundry.utils.deepClone(actor.getFlag(SYSTEM_ID, 'activeDrugs') ?? []);
    active.push({ drugId, label: spec.label ?? item.name, effectId: effect.id, talentId, expiry, comedown: spec.comedown ?? null });
    await actor.setFlag(SYSTEM_ID, 'activeDrugs', active);

    const grantLine = spec.grantsTalent ? `<p><em>Gains the ${spec.grantsTalent} talent for the duration.</em></p>` : '';
    ChatMessage.create({
        user: game.user.id,
        speaker: ChatMessage.getSpeaker({ actor }),
        content: `<div class="rt-consumable-use"><h3>${actor.name} uses ${item.name}</h3>`
            + `<p><strong>Duration:</strong> ${durationLabel}</p>${grantLine}${focusLine}`
            + `<p>${spec.note ?? ''}</p>`
            + `<button class="roll-control__drug-expire" data-actor-uuid="${actor.uuid}" data-drug-id="${drugId}">Wears off now</button>`
            + `</div>`,
        style: CONST.CHAT_MESSAGE_STYLES.OTHER,
    });
}

export async function expireDrug(actor, drugId) {
    if (!actor) return;
    const active = foundry.utils.deepClone(actor.getFlag(SYSTEM_ID, 'activeDrugs') ?? []);
    const entry = active.find(d => d.drugId === drugId);
    if (!entry) return;

    // Remove the benefit AE + granted talent.
    if (entry.effectId && actor.effects.get(entry.effectId)) {
        await actor.deleteEmbeddedDocuments('ActiveEffect', [entry.effectId]);
    }
    if (entry.talentId && actor.items.get(entry.talentId)) {
        await actor.deleteEmbeddedDocuments('Item', [entry.talentId]);
    }

    // Apply the comedown (QA-144): a timed penalty AE and/or Fatigue, plus a note.
    let comedownNote = '';
    const cd = entry.comedown;
    if (cd) {
        comedownNote = cd.note ?? '';
        if (cd.changes?.length) {
            const cdDur = parseConsumableDuration(cd.durationText);
            const dd = {};
            if (cdDur) {
                const r = await new Roll(cdDur.formula).evaluate();
                if (cdDur.durationKey === 'rounds') dd.rounds = r.total; else dd.seconds = r.total * cdDur.secondsPer;
            }
            await actor.createEmbeddedDocuments('ActiveEffect', [{
                name: `${entry.label} (comedown)`,
                img: 'icons/svg/downgrade.svg',
                duration: dd,
                description: comedownNote,
                changes: cd.changes.map(c => ({ ...c, value: String(c.value), priority: null })),
                flags: { rt: { consumable: true } },
            }]);
        }
        if (cd.fatigue) {
            await actor.update({ 'system.fatigue.value': (Number(actor.system.fatigue?.value) || 0) + cd.fatigue });
        }
    }

    await actor.setFlag(SYSTEM_ID, 'activeDrugs', active.filter(d => d.drugId !== drugId));

    ChatMessage.create({
        user: game.user.id,
        speaker: ChatMessage.getSpeaker({ actor }),
        content: `<div class="rt-consumable-use"><h3>${entry.label} wears off — ${actor.name}</h3>${comedownNote ? `<p>${comedownNote}</p>` : ''}</div>`,
        style: CONST.CHAT_MESSAGE_STYLES.OTHER,
    });
}

/** Expire any of this actor's active drugs whose rolled duration has elapsed. */
export async function checkDrugExpiries(actor) {
    if (!actor) return;
    const active = actor.getFlag(SYSTEM_ID, 'activeDrugs') ?? [];
    if (!active.length) return;
    const round = game.combat?.round ?? 0;
    const worldTime = game.time?.worldTime ?? 0;
    for (const entry of [...active]) {
        const e = entry.expiry ?? {};
        if (e.kind === 'rounds' && game.combat?.started && round >= e.round) {
            await expireDrug(actor, entry.drugId);
        } else if (e.kind === 'time' && worldTime >= e.worldTime) {
            await expireDrug(actor, entry.drugId);
        }
    }
}

/** Sweep every actor for elapsed drugs — used by the updateWorldTime hook (out-of-combat). */
export async function checkAllDrugExpiries() {
    for (const actor of game.actors ?? []) {
        await checkDrugExpiries(actor);
    }
}
