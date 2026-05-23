import { sendActionDataToChat } from '../rolls/roll-helpers.mjs';

/**
 *
 * @param simpleSkillData {SimpleSkillData}
 * @returns {Promise<void>}
 */
export async function prepareSimpleRoll(simpleSkillData) {
    const html = await renderTemplate('systems/rogue-trader-3rd/templates/prompt/simple-roll-prompt.hbs', simpleSkillData);
    let dialog = new Dialog(
        {
            title: 'Roll Modifier',
            content: html,
            buttons: {
                roll: {
                    icon: "<i class='rt-material'>casino</i>",
                    label: 'Roll',
                    callback: async (html) => {
                        const rollData = simpleSkillData.rollData;
                        rollData.modifiers['difficulty'] = parseInt(html.find('[id=difficulty] :selected').val());
                        let mod = parseInt(html.find('#modifier')[0].value) || 0;
                        // Sum checked talent-bonus checkboxes into the modifier
                        html.find('input.rt-optional-bonus:checked').each((_, el) => {
                            mod += parseInt(el.dataset.value) || 0;
                        });
                        rollData.modifiers['modifier'] = mod;
                        await rollData.calculateTotalModifiers();
                        await simpleSkillData.calculateSuccessOrFailure();
                        await sendActionDataToChat(simpleSkillData);
                    },
                },
                cancel: {
                    icon: "<i class='rt-material'>close</i>",
                    label: 'Cancel',
                    callback: () => {},
                },
            },
            default: 'roll',
            close: () => {},
        },
        {
            width: 300,
        },
    );
    dialog.render(true);
}

export async function prepareCreateSpecialistSkillPrompt(simpleSkillData) {
    const html = await renderTemplate('systems/rogue-trader-3rd/templates/prompt/add-speciality-prompt.hbs', simpleSkillData);
    let dialog = new Dialog(
        {
            title: 'Create Specialist Skill',
            content: html,
            buttons: {
                add: {
                    icon: "<i class='rt-material'>add</i>",
                    label: 'Add',
                    callback: async (html) => {
                        const speciality = html.find('#speciality-name')[0].value;
                        await simpleSkillData.actor.addSpecialitySkill(simpleSkillData.skillName, speciality);
                    },
                },
                cancel: {
                    icon: "<i class='rt-material'>close</i>",
                    label: 'Cancel',
                    callback: () => {},
                },
            },
            default: 'add',
            close: () => {},
        },
        {
            width: 300,
        },
    );
    dialog.render(true);
}

