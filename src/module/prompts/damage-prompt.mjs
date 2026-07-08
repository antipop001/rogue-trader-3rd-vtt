import { sendActionDataToChat } from '../rolls/roll-helpers.mjs';
import { ActionData } from '../rolls/action-data.mjs';

/**
 * Resolve the damage roll from the prompt form. `root` is the dialog's form/element; lookups are
 * SCOPED to it via querySelector so a second open dialog (or the sheet behind it) can't be
 * cross-read, and guarded so a missing field can't throw and silently drop the roll. (Same class
 * of fix as the skill prompt.)
 */
async function resolveDamageRoll(rollData, root) {
    const actionData = new ActionData();
    actionData.template = 'systems/rogue-trader-3rd/templates/chat/damage-roll-chat.hbs';
    rollData.damage = root?.querySelector('#damage')?.value ?? rollData.damage;
    rollData.penetration = root?.querySelector('#penetration')?.value ?? rollData.penetration;
    rollData.damageType = root?.querySelector('[name=damageType]')?.value ?? rollData.damageType;
    rollData.pr = root?.querySelector('#pr')?.value;
    rollData.template = 'systems/rogue-trader-3rd/templates/chat/damage-roll-chat.hbs';
    rollData.roll = new Roll(String(rollData.damage || '0'), rollData);
    await rollData.roll.evaluate();
    actionData.rollData = rollData;
    await sendActionDataToChat(actionData);
}

export async function prepareDamageRoll(rollData) {
    rollData.rt = CONFIG.rt;
    const html = await renderTemplate('systems/rogue-trader-3rd/templates/prompt/damage-roll-prompt.hbs', rollData);
    const DialogV2 = foundry.applications?.api?.DialogV2;
    // ApplicationV2 dialog so it layers correctly over the V2 sheet (a V1 Dialog mis-layers and
    // can drop the Roll click). (bug fix — same as the skill prompt.)
    if (DialogV2) {
        await DialogV2.wait({
            window: { title: 'Damage Roll' },
            content: html,
            buttons: [
                { action: 'roll', label: 'Roll', default: true,
                  callback: (_event, button) => resolveDamageRoll(rollData, button.form) },
                { action: 'cancel', label: 'Cancel' },
            ],
            rejectClose: false,
            position: { width: 300 },
        });
        return;
    }
    new Dialog({
        title: 'Damage Roll',
        content: html,
        buttons: {
            roll: { icon: "<i class='rt-material'>casino</i>", label: 'Roll',
                    callback: (h) => resolveDamageRoll(rollData, h?.[0] ?? h) },
            cancel: { icon: "<i class='rt-material'>close</i>", label: 'Cancel', callback: () => {} },
        },
        default: 'roll',
    }, { width: 300 }).render(true);
}
