// Cover (RT Core p.245, Table 9-7). Sets/clears a character's current cover Armour Points.
// While `system.combat.cover.ap > 0`, hits to the concealed Body/Leg locations are absorbed by
// the cover first and erode its AP — resolved in AssignDamageData.finalize(). (QA-111.)

const COVER_PRESETS = [
    { ap: 0, label: 'No cover' },
    { ap: 4, label: 'Armour-glas / pipes / thin metal (4)' },
    { ap: 8, label: 'Flakboard / crate / sandbags / ice (8)' },
    { ap: 12, label: 'Cogitator bank / stasis pod (12)' },
    { ap: 16, label: 'Rockcrete / hatchway / thick iron / stone (16)' },
    { ap: 32, label: 'Armaplas / bulkhead / Plasteel (32)' },
];

export async function setCover(actor, ap) {
    if (!actor) return;
    const value = Math.max(0, Number(ap) || 0);
    await actor.update({ 'system.combat.cover.ap': value });
    ui.notifications?.info(value > 0 ? `${actor.name} takes cover (AP ${value}).` : `${actor.name} leaves cover.`);
}

export async function openCoverDialog(actor = null) {
    const subject = actor ?? game.user.character ?? canvas.tokens?.controlled?.[0]?.actor;
    if (!subject) {
        ui.notifications?.warn('Select a token (or assign a character) to take cover.');
        return;
    }
    const current = Number(subject.system?.combat?.cover?.ap) || 0;
    const options = COVER_PRESETS
        .map(c => `<option value="${c.ap}" ${c.ap === current ? 'selected' : ''}>${c.label}</option>`)
        .join('');
    const content = `<form class="rt-cover" autocomplete="off">
        <div class="form-group"><label>Cover (Table 9-7)</label><select name="ap">${options}</select></div>
        <div class="form-group"><label>or custom AP</label><input type="number" name="custom" min="0" placeholder="(overrides preset)"/></div>
    </form>`;
    const DialogV2 = foundry.applications?.api?.DialogV2;
    if (DialogV2) {
        await DialogV2.prompt({
            window: { title: `Take Cover — ${subject.name}` },
            content,
            ok: {
                label: 'Set Cover',
                callback: (_e, btn) => {
                    const custom = btn.form.custom.value;
                    const ap = custom !== '' ? Number(custom) : Number(btn.form.ap.value);
                    return setCover(subject, ap);
                },
            },
        });
    } else {
        await setCover(subject, current > 0 ? 0 : 8);
    }
}
