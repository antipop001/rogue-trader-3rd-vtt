import { sendActionDataToChat } from '../rolls/roll-helpers.mjs';

/**
 * Read the modifier fields from the prompt's form and resolve the roll. `root` is the dialog's
 * form/element — lookups are SCOPED to it via querySelector (never document-global) so the several
 * prompt templates that reuse `id="modifier"`/`id="difficulty"` can't cross-read another open
 * dialog or the sheet behind it. Guards every field so a missing element can't throw and silently
 * abort the roll.
 * @param {object} simpleSkillData
 * @param {HTMLElement|null} root
 */
async function resolveSimpleRoll(simpleSkillData, root) {
    const rollData = simpleSkillData.rollData;
    rollData.modifiers['difficulty'] = parseInt(root?.querySelector('#difficulty')?.value) || 0;
    let mod = parseInt(root?.querySelector('#modifier')?.value) || 0;
    // Sum checked talent-bonus checkboxes into the modifier.
    root?.querySelectorAll('input.rt-optional-bonus:checked')?.forEach((el) => {
        mod += parseInt(el.dataset.value) || 0;
    });
    rollData.modifiers['modifier'] = mod;
    await rollData.calculateTotalModifiers();
    await simpleSkillData.calculateSuccessOrFailure();
    await sendActionDataToChat(simpleSkillData);
}

/**
 * @param simpleSkillData {SimpleSkillData}
 * @returns {Promise<void>}
 */
export async function prepareSimpleRoll(simpleSkillData) {
    const html = await renderTemplate('systems/rogue-trader-3rd/templates/prompt/simple-roll-prompt.hbs', simpleSkillData);
    const DialogV2 = foundry.applications?.api?.DialogV2;
    // ApplicationV2 dialog so it shares the V2 window z-index stack with the V2 actor sheet — a
    // legacy V1 `Dialog` over a V2 sheet mis-layers and can drop the Roll click. (bug fix.)
    if (DialogV2) {
        await DialogV2.wait({
            window: { title: 'Roll Modifier' },
            content: html,
            buttons: [
                { action: 'roll', label: 'Roll', default: true,
                  callback: (_event, button) => resolveSimpleRoll(simpleSkillData, button.form) },
                { action: 'cancel', label: 'Cancel' },
            ],
            rejectClose: false,
            position: { width: 300 },
        });
        return;
    }
    // Fallback for older cores without DialogV2.
    new Dialog({
        title: 'Roll Modifier',
        content: html,
        buttons: {
            roll: { icon: "<i class='rt-material'>casino</i>", label: 'Roll',
                    callback: (h) => resolveSimpleRoll(simpleSkillData, h?.[0] ?? h) },
            cancel: { icon: "<i class='rt-material'>close</i>", label: 'Cancel', callback: () => {} },
        },
        default: 'roll',
    }, { width: 300 }).render(true);
}

export async function prepareCreateSpecialistSkillPrompt(simpleSkillData) {
    const html = await renderTemplate('systems/rogue-trader-3rd/templates/prompt/add-speciality-prompt.hbs', simpleSkillData);
    const DialogV2 = foundry.applications?.api?.DialogV2;
    const addSpeciality = async (root) => {
        const speciality = root?.querySelector('#speciality-name')?.value;
        if (speciality) await simpleSkillData.actor.addSpecialitySkill(simpleSkillData.skillName, speciality);
    };
    if (DialogV2) {
        await DialogV2.wait({
            window: { title: 'Create Specialist Skill' },
            content: html,
            buttons: [
                { action: 'add', label: 'Add', default: true,
                  callback: (_event, button) => addSpeciality(button.form) },
                { action: 'cancel', label: 'Cancel' },
            ],
            rejectClose: false,
            position: { width: 300 },
        });
        return;
    }
    new Dialog({
        title: 'Create Specialist Skill',
        content: html,
        buttons: {
            add: { icon: "<i class='rt-material'>add</i>", label: 'Add',
                   callback: (h) => addSpeciality(h?.[0] ?? h) },
            cancel: { icon: "<i class='rt-material'>close</i>", label: 'Cancel', callback: () => {} },
        },
        default: 'add',
    }, { width: 300 }).render(true);
}
