import { sendActionDataToChat } from '../rolls/roll-helpers.mjs';

async function resolveCrewRoll(crewData, root) {
    const rollData = crewData.rollData;
    rollData.modifiers['difficulty'] = parseInt(root?.querySelector('#difficulty')?.value) || 0;
    rollData.modifiers['operator'] = parseInt(root?.querySelector('#operator')?.value) || 0;
    rollData.modifiers['modifier'] = parseInt(root?.querySelector('#modifier')?.value) || 0;
    await rollData.calculateTotalModifiers();
    await crewData.calculateResultVoidship();
    await sendActionDataToChat(crewData);
}

export async function prepareCrewRoll(crewData) {
    const html = await renderTemplate('systems/rogue-trader-3rd/templates/prompt/crew-roll-prompt.hbs', crewData);
    const DialogV2 = foundry.applications?.api?.DialogV2;
    // ApplicationV2 dialog so it layers correctly over the V2 voidship sheet. (bug fix — same as
    // the skill/damage prompts: V1 Dialog over a V2 sheet mis-layers + jQuery global-ID reads
    // cross-read another open dialog.)
    if (DialogV2) {
        await DialogV2.wait({
            window: { title: 'Roll Modifier' },
            content: html,
            buttons: [
                { action: 'roll', label: 'Roll', default: true,
                  callback: (_event, button) => resolveCrewRoll(crewData, button.form) },
                { action: 'cancel', label: 'Cancel' },
            ],
            rejectClose: false,
            position: { width: 300 },
        });
        return;
    }
    new Dialog({
        title: 'Roll Modifier',
        content: html,
        buttons: {
            roll: { icon: "<i class='rt-material'>casino</i>", label: 'Roll',
                    callback: (h) => resolveCrewRoll(crewData, h?.[0] ?? h) },
            cancel: { icon: "<i class='rt-material'>close</i>", label: 'Cancel', callback: () => {} },
        },
        default: 'roll',
    }, { width: 300 }).render(true);
}
