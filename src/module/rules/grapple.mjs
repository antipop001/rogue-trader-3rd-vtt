import { getOpposedDegrees, unnaturalOpposedDoSBonus } from '../rolls/roll-helpers.mjs';

// Grappling (RT Core p.246) resolves through Opposed Strength Tests. This is a focused core of
// the subsystem: START a grapple, then as the controller DAMAGE / THROW DOWN / PUSH the grappled
// opponent, or as the grappled target BREAK FREE. Each is a single opposed Strength Test; the
// `grappled` condition is tracked on the target (token HUD / actor.statuses). The full
// maintain/assistance/Take-Control/Slip-Free options are GM-adjudicated on top. (QA-122.)

const GRAPPLE_OPTIONS = {
    start:  { label: 'Grab (start a Grapple)' },
    damage: { label: 'Damage Opponent' },
    throw:  { label: 'Throw Down (Prone)' },
    push:   { label: 'Push Opponent' },
    break:  { label: 'Break Free (as the grappled target)' },
};

export async function rollGrapple(actor, opponent, option) {
    if (!actor || !opponent) {
        ui.notifications?.warn('Grapple needs both an acting character and a target.');
        return;
    }
    const sTotal = actor.characteristics?.strength?.total ?? 0;
    const oTotal = opponent.characteristics?.strength?.total ?? 0;
    const a = await actor.rollCheck(sTotal);
    const o = await opponent.rollCheck(oTotal);
    // Unnatural Strength (RT Core p.368): on a success the Unnatural multiplier is added to the
    // Degrees of Success of an Opposed Strength Test — so it feeds both the win comparison and the
    // Push distance below. (BUG-Q-238.)
    const aDos = a.dos + unnaturalOpposedDoSBonus(actor.characteristics?.strength?.bonus ?? 0, actor.characteristics?.strength?.unnatural ?? 0, a.success);
    const oDos = o.dos + unnaturalOpposedDoSBonus(opponent.characteristics?.strength?.bonus ?? 0, opponent.characteristics?.strength?.unnatural ?? 0, o.success);
    const net = getOpposedDegrees(a.success, aDos, a.dof, o.success, oDos, o.dof);
    const actorWins = net > 0;

    let outcome;
    switch (option) {
        case 'start':
            if (actorWins) {
                await opponent.toggleStatusEffect?.('grappled', { active: true });
                outcome = `<strong>${actor.name} seizes ${opponent.name}</strong> — ${opponent.name} is now Grappled.`;
            } else outcome = `${opponent.name} avoids the Grapple.`;
            break;
        case 'damage':
            if (actorWins) {
                const sb = actor.characteristics?.strength?.bonus ?? 0;
                const dmg = await new Roll(`1d5-3+${sb}`).evaluate();
                outcome = `${actor.name} crushes ${opponent.name} for <strong>${Math.max(0, dmg.total)} Damage</strong> (1d5-3+SB, Primitive) and 1 level of Fatigue.`;
            } else outcome = `${opponent.name} resists — no damage, but still Grappled.`;
            break;
        case 'throw':
            if (actorWins) {
                await opponent.toggleStatusEffect?.('prone', { active: true });
                outcome = `${actor.name} throws ${opponent.name} to the ground — ${opponent.name} is Prone.`;
            } else outcome = `${opponent.name} keeps their footing.`;
            break;
        case 'push': {
            if (actorWins) {
                // RT Core p.246 "Push Opponent": 1 metre + 1 per Degree of Success the ATTACKER
                // scored — not the opposed net margin (which folds in the defender's failure and
                // over-pushes vs a badly-failing opponent). actorWins ⇒ a.success. (BUG-Q-224.)
                const metres = 1 + (a.success ? aDos : 0);
                outcome = `${actor.name} shoves ${opponent.name} <strong>${metres} metre(s)</strong> (up to ${actor.name}'s Half Move). ${actor.name} must move with them to keep the Grapple, or release to hold ground.`;
            } else outcome = `${opponent.name} holds their ground.`;
            break;
        }
        case 'break':
            // Here `actor` is the GRAPPLED target attempting to escape; `opponent` is the controller.
            if (actorWins) {
                await actor.toggleStatusEffect?.('grappled', { active: false });
                outcome = `<strong>${actor.name} breaks free</strong> of the Grapple and may take any Half Action.`;
            } else outcome = `${actor.name} fails to break free and remains Grappled.`;
            break;
        default:
            outcome = 'Unknown grapple option.';
    }

    await ChatMessage.create({
        user: game.user.id,
        speaker: ChatMessage.getSpeaker({ actor }),
        content: `<p><strong>Grapple — ${GRAPPLE_OPTIONS[option]?.label ?? option}</strong> (Opposed Strength Test)<br/>`
            + `${actor.name}: Strength ${sTotal}, rolled ${a.roll.total} → ${a.success ? `${a.dos} DoS` : `fail (${a.dof} DoF)`}<br/>`
            + `${opponent.name}: Strength ${oTotal}, rolled ${o.roll.total} → ${o.success ? `${o.dos} DoS` : `fail (${o.dof} DoF)`}<br/>${outcome}</p>`,
    });
}

export async function openGrappleDialog(actor = null) {
    const subject = actor ?? game.user.character ?? canvas.tokens?.controlled?.[0]?.actor;
    if (!subject) {
        ui.notifications?.warn('Select a token (or assign a character) to Grapple.');
        return;
    }
    const target = [...(game.user?.targets ?? [])][0]?.actor;
    if (!target) {
        ui.notifications?.warn('Target an opponent to Grapple.');
        return;
    }
    const options = Object.entries(GRAPPLE_OPTIONS)
        .map(([k, v]) => `<option value="${k}">${v.label}</option>`)
        .join('');
    const content = `<form class="rt-grapple" autocomplete="off"><div class="form-group"><label>Grapple Option</label><select name="option">${options}</select></div></form>`;
    const DialogV2 = foundry.applications?.api?.DialogV2;
    if (DialogV2) {
        await DialogV2.prompt({
            window: { title: `Grapple — ${subject.name} vs ${target.name}` },
            content,
            ok: { label: 'Resolve', callback: (_e, btn) => rollGrapple(subject, target, btn.form.option.value) },
        });
    } else {
        await rollGrapple(subject, target, 'start');
    }
}
