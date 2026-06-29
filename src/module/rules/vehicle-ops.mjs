// Active-vehicle link (ItS Ch.V). Sets which vehicle a character is operating so the vehicle's
// Manoeuvrability modifies their Drive/Pilot Tests (applied in acolyte.rollSkill). (QA-116.)

export async function setActiveVehicle(actor, vehicleId) {
    if (!actor) return;
    await actor.update({ 'system.combat.activeVehicleId': vehicleId || '' });
    const v = vehicleId ? game.actors?.get(vehicleId) : null;
    ui.notifications?.info(v
        ? `${actor.name} is operating ${v.name} (Manoeuvrability ${Number(v.system?.manoeuverability) || 0}).`
        : `${actor.name} is no longer operating a vehicle.`);
}

export async function openVehicleDialog(actor = null) {
    const subject = actor ?? game.user.character ?? canvas.tokens?.controlled?.[0]?.actor;
    if (!subject) {
        ui.notifications?.warn('Select a token (or assign a character) to set an active vehicle.');
        return;
    }
    const vehicles = game.actors?.filter(a => a.type === 'vehicle') ?? [];
    if (!vehicles.length) {
        ui.notifications?.warn('No vehicle actors exist to operate.');
        return;
    }
    const current = subject.system?.combat?.activeVehicleId ?? '';
    const opts = ['<option value="">— none —</option>']
        .concat(vehicles.map(v => `<option value="${v.id}" ${v.id === current ? 'selected' : ''}>${v.name} (Manoeuvrability ${Number(v.system?.manoeuverability) || 0})</option>`))
        .join('');
    const movedNow = Number(game.actors?.get(current)?.system?.combat?.movedThisTurn) || 0;
    const movedOpts = [[0, 'Stationary / drifting (no penalty)'], [1, 'Moved tactical speed (−10 to shooting)'], [2, 'Moved twice tactical (−20 to shooting)']]
        .map(([v, l]) => `<option value="${v}" ${v === movedNow ? 'selected' : ''}>${l}</option>`).join('');
    const content = `<form class="rt-vehicle" autocomplete="off">
        <div class="form-group"><label>Operating Vehicle</label><select name="vid">${opts}</select></div>
        <div class="form-group"><label>Movement this turn</label><select name="moved">${movedOpts}</select></div></form>`;
    const DialogV2 = foundry.applications?.api?.DialogV2;
    if (DialogV2) {
        await DialogV2.prompt({
            window: { title: `Operate Vehicle — ${subject.name}` },
            content,
            ok: {
                label: 'Set',
                callback: async (_e, btn) => {
                    const vid = btn.form.vid.value;
                    await setActiveVehicle(subject, vid);
                    const v = vid ? game.actors?.get(vid) : null;
                    if (v) await v.update({ 'system.combat.movedThisTurn': Number(btn.form.moved.value) || 0 });
                },
            },
        });
    } else {
        await setActiveVehicle(subject, '');
    }
}

// Ram (ItS Ch.V): a vehicle ramming does damage = its striking-facing AP + 1d10 (2d10 at twice
// tactical speed) and pushes the target 1m per damage point; ramming another vehicle/solid object
// also damages the rammer by the target's AP + 1d5. Computes + announces the figures (apply via
// Assign Damage). (QA-117 follow-up.)
export async function vehicleRam(rammer, target, twiceSpeed = false) {
    if (rammer?.type !== 'vehicle') { ui.notifications?.warn('Select a vehicle to Ram with.'); return; }
    const facingAP = Number(rammer.system?.front) || 0;
    const dice = twiceSpeed ? '2d10' : '1d10';
    const dmgRoll = await new Roll(`${facingAP} + ${dice}`).evaluate();
    const targetDamage = dmgRoll.total;
    let selfLine = '';
    if (target?.type === 'vehicle') {
        const targetAP = Number(target.system?.front) || 0;
        const selfRoll = await new Roll(`${targetAP} + 1d5`).evaluate();
        selfLine = `<br/>${rammer.name} takes <strong>${selfRoll.total}</strong> damage in return (target front AP ${targetAP} + 1d5).`;
    }
    await ChatMessage.create({
        user: game.user.id,
        speaker: ChatMessage.getSpeaker({ actor: rammer }),
        content: `<p><strong>${rammer.name} rams${target ? ' ' + target.name : ''}</strong> at ${twiceSpeed ? 'twice tactical' : 'tactical'} speed: `
            + `<strong>${targetDamage}</strong> damage (front AP ${facingAP} + ${dice}); the target is pushed ${targetDamage} metres. Apply via Assign Damage.${selfLine}</p>`,
    });
}

export async function openRamDialog(rammer = null) {
    const subject = rammer ?? canvas.tokens?.controlled?.[0]?.actor;
    if (subject?.type !== 'vehicle') { ui.notifications?.warn('Select a vehicle to Ram with.'); return; }
    const target = [...(game.user?.targets ?? [])][0]?.actor ?? null;
    const content = `<form class="rt-ram" autocomplete="off"><div class="form-group"><label><input type="checkbox" name="twice"/> Moved twice tactical speed (2d10)</label></div></form>`;
    const DialogV2 = foundry.applications?.api?.DialogV2;
    if (DialogV2) {
        await DialogV2.prompt({
            window: { title: `Ram — ${subject.name}${target ? ' → ' + target.name : ''}` },
            content,
            ok: { label: 'Ram', callback: (_e, btn) => vehicleRam(subject, target, btn.form.twice.checked) },
        });
    } else {
        await vehicleRam(subject, target, false);
    }
}
