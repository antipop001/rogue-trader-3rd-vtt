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
    const content = `<form class="rt-vehicle" autocomplete="off"><div class="form-group"><label>Operating Vehicle</label><select name="vid">${opts}</select></div></form>`;
    const DialogV2 = foundry.applications?.api?.DialogV2;
    if (DialogV2) {
        await DialogV2.prompt({
            window: { title: `Operate Vehicle — ${subject.name}` },
            content,
            ok: { label: 'Set', callback: (_e, btn) => setActiveVehicle(subject, btn.form.vid.value) },
        });
    } else {
        await setActiveVehicle(subject, '');
    }
}
