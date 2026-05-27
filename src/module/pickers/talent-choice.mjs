/**
 * Talent option-pick dialog.
 *
 * Some RT 1e talents lock in a target at acquisition (Talented picks a Skill,
 * Hatred picks a group, Weapon Master picks a weapon class, etc.). Each such
 * compendium entry is tagged with `flags.rt.pickable: { kind, options }`.
 *
 * When such a talent is dropped onto an actor, `promptForChoice` opens a
 * DialogV2, returns the picked value, and the createItem hook in
 * `hooks-manager.mjs` stamps it onto `system.choice`, appends it to the item
 * name as `Talent (Choice)`, and (for kind=`skill`) builds an Active Effect
 * targeting `system.skills.<choice>.modifier`.
 */

const SKILL_LABELS = {
    acrobatics: "Acrobatics", athletics: "Athletics", awareness: "Awareness",
    carouse: "Carouse", charm: "Charm", command: "Command", commerce: "Commerce",
    commonLore: "Common Lore", deceive: "Deceive", demolitions: "Demolitions",
    dodge: "Dodge", forbiddenLore: "Forbidden Lore", inquiry: "Inquiry",
    interrogation: "Interrogation", intimidate: "Intimidate",
    linguistics: "Linguistics", logic: "Logic", medicae: "Medicae",
    navigate: "Navigate", operate: "Operate", parry: "Parry",
    performance: "Performance", psyniscience: "Psyniscience",
    scholasticLore: "Scholastic Lore", scrutiny: "Scrutiny",
    security: "Security", sleightOfHand: "Sleight of Hand",
    stealth: "Stealth", survival: "Survival", techUse: "Tech-Use",
    trade: "Trade", wrangling: "Wrangling",
};

const DIALOG_TITLES = {
    skill: "Choose a Skill",
    group: "Choose a Group",
    weaponClass: "Choose a Weapon Class",
    exoticWeapon: "Name the Exotic Weapon",
    psychicTechnique: "Choose a Psychic Technique",
    navigatorPower: "Choose a Navigator Power",
};


/** Resolve option lists for picker kinds that look up another pack. */
async function resolveDynamicOptions(kind) {
    if (kind === "psychicTechnique" || kind === "navigatorPower") {
        const pack = game.packs.get("rogue-trader-3rd.psychic-powers");
        if (!pack) return [];
        const docs = await pack.getDocuments();
        return docs.map(d => d.name).sort();
    }
    return [];
}


/**
 * Open a picker dialog and resolve to the user's choice.
 * Returns null if cancelled or if the item isn't pickable.
 */
export async function promptForChoice(item) {
    const spec = foundry.utils.getProperty(item, "flags.rt.pickable");
    if (!spec || !spec.kind) return null;

    let options = Array.isArray(spec.options) ? [...spec.options] : [];
    if (options.length === 0) options = await resolveDynamicOptions(spec.kind);

    const label = DIALOG_TITLES[spec.kind] || "Make a Choice";

    let content;
    if (spec.kind === "exoticWeapon" || options.length === 0) {
        content = `<p>${label} for <b>${item.name}</b>:</p>
            <input name="choice" type="text" autofocus
                style="width:100%; padding:6px;"
                placeholder="${spec.kind === 'exoticWeapon' ? 'e.g. Eldar Lasblaster' : ''}">`;
    } else {
        const opts = options.map(o => {
            const display = (spec.kind === "skill" && SKILL_LABELS[o]) ? SKILL_LABELS[o] : o;
            return `<option value="${o}">${display}</option>`;
        }).join("");
        content = `<p>${label} for <b>${item.name}</b>:</p>
            <select name="choice" style="width:100%; padding:6px;">${opts}</select>`;
    }

    return new Promise(resolve => {
        new foundry.applications.api.DialogV2({
            window: { title: `Pick: ${item.name}` },
            content,
            buttons: [
                {
                    action: "pick",
                    default: true,
                    label: "Confirm",
                    callback: (event, button) => {
                        const form = button.form;
                        const value = form?.elements?.choice?.value || "";
                        resolve(value || null);
                    },
                },
                {
                    action: "cancel",
                    label: "Cancel",
                    callback: () => resolve(null),
                },
            ],
            close: () => resolve(null),
        }).render(true);
    });
}


/**
 * Human-readable choice label (e.g. "commonLore" → "Common Lore").
 */
export function labelForChoice(kind, choice) {
    if (!choice) return "";
    if (kind === "skill" && SKILL_LABELS[choice]) return SKILL_LABELS[choice];
    return choice;
}


/**
 * For kind=`skill`, produce a Foundry ActiveEffectData block that targets
 * `system.skills.<choice>.modifier`. Returns null for other kinds (their
 * bonuses are conditional and shouldn't auto-apply).
 */
export function buildEffectForChoice(item, kind, choice) {
    if (kind !== "skill" || !choice) return null;
    return {
        name: `${item.name} (${labelForChoice(kind, choice)})`,
        img: item.img || "systems/rogue-trader-3rd/icons/talents/blue/b_18.png",
        description: "",
        origin: "",
        disabled: false,
        transfer: true,
        tint: null,
        statuses: [],
        duration: {
            startTime: null, seconds: null,
            combat: null, rounds: null, turns: null,
            startRound: null, startTurn: null,
        },
        changes: [{
            key: `system.skills.${choice}.modifier`,
            mode: 2,
            value: "10",
            priority: null,
        }],
        flags: {},
    };
}
