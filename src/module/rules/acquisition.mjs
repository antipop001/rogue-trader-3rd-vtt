import { SYSTEM_ID } from '../hooks-manager.mjs';
import { RogueTraderSettings } from '../rogue-trader-settings.mjs';

/**
 * RT Core p.270 Table 9-35 — Acquisition Test modifiers. Values verbatim from the
 * table (corrected 2026-06-24, BUG-012 / QA-052,053 — the prior availability values
 * were shifted ~20-40 points harsher and missing the Abundant tier; Scale had
 * Negligible/Trivial swapped). Negative numbers make the test harder.
 */
export const AVAILABILITY_MODS = {
    ubiquitous: 70,
    abundant: 50,
    plentiful: 30,
    common: 20,
    average: 10,
    scarce: 0,
    rare: -10,
    'very rare': -20,
    'extremely rare': -30,
    'near unique': -50,
    unique: -70,
};

export const CRAFTSMANSHIP_MODS = {
    poor: 10,
    common: 0,
    good: -10,
    best: -30,
};

export const SCALE_MODS = {
    negligible: 30,
    trivial: 20,
    minor: 10,
    standard: 0,
    major: -10,
    significant: -20,
    vast: -30,
};


function dropdown(name, current, options) {
    const opts = Object.keys(options).map(key => {
        const mod = options[key];
        const label = `${key.replace(/\b\w/g, c => c.toUpperCase())} (${mod >= 0 ? '+' : ''}${mod})`;
        const selected = key === current ? 'selected' : '';
        return `<option value="${key}" ${selected}>${label}</option>`;
    }).join('');
    return `<select name="${name}" style="width:100%">${opts}</select>`;
}


/**
 * Open a dialog to perform an RT 1e Acquisition Test.
 * Result is posted to chat.
 */
export async function openAcquisitionDialog({ itemName = '', availability = 'average', craftsmanship = 'common', scale = 'standard', commerceDoS = 0 } = {}) {
    const pf = RogueTraderSettings.getProfitFactor();
    const html = `
      <form class="rt-acquisition" autocomplete="off">
        <p>Profit Factor: <strong>${pf}</strong> <em>(world setting)</em></p>
        <div class="form-group">
          <label>Item Name</label>
          <input type="text" name="itemName" value="${itemName}" />
        </div>
        <div class="form-group">
          <label>Availability</label>
          ${dropdown('availability', availability, AVAILABILITY_MODS)}
        </div>
        <div class="form-group">
          <label>Craftsmanship</label>
          ${dropdown('craftsmanship', craftsmanship, CRAFTSMANSHIP_MODS)}
        </div>
        <div class="form-group">
          <label>Scale (number of items)</label>
          ${dropdown('scale', scale, SCALE_MODS)}
        </div>
        <div class="form-group">
          <label>Commerce DoS (optional)</label>
          <input type="number" name="commerceDoS" value="${commerceDoS}" step="1" />
        </div>
        <div class="form-group">
          <label>Additional modifier</label>
          <input type="number" name="modifier" value="0" step="1" />
        </div>
      </form>
    `;
    return new Promise(resolve => {
        new Dialog({
            title: 'Acquisition Test',
            content: html,
            buttons: {
                roll: {
                    label: 'Roll',
                    icon: '<i class="fas fa-dice"></i>',
                    callback: async html => {
                        const form = html.find('form')[0];
                        const data = new FormData(form);
                        const availabilityKey = data.get('availability');
                        const craftsmanshipKey = data.get('craftsmanship');
                        const scaleKey = data.get('scale');
                        const commerce = Number(data.get('commerceDoS')) || 0;
                        const extraMod = Number(data.get('modifier')) || 0;
                        const itemNameVal = data.get('itemName') || 'an item';

                        const availMod = AVAILABILITY_MODS[availabilityKey] ?? 0;
                        const craftMod = CRAFTSMANSHIP_MODS[craftsmanshipKey] ?? 0;
                        const scaleMod = SCALE_MODS[scaleKey] ?? 0;
                        const target = pf + availMod + craftMod + scaleMod + (commerce * 2) + extraMod;

                        const roll = await new Roll('1d100').roll();
                        const total = roll.total;
                        const success = total <= target;
                        // Canon band-method DoS/DoF (RT Core p.22) — was the DH2 `+1`
                        // over-count, consistent with the rest of the system now. (QA-094.)
                        const dos = success ? Math.floor((target - total) / 10) : 0;
                        const dof = success ? 0 : Math.floor((total - target) / 10);

                        const summary = success
                            ? `<strong>SUCCESS</strong> — ${itemNameVal} acquired (${dos} DoS)`
                            : `<strong>FAILURE</strong> — ${itemNameVal} not acquired (${dof} DoF)`;
                        const breakdown = [
                            `PF ${pf}`,
                            `Availability ${availMod >= 0 ? '+' : ''}${availMod}`,
                            `Craftsmanship ${craftMod >= 0 ? '+' : ''}${craftMod}`,
                            `Scale ${scaleMod >= 0 ? '+' : ''}${scaleMod}`,
                            commerce ? `Commerce DoS +${commerce * 2}` : null,
                            extraMod ? `Mod ${extraMod >= 0 ? '+' : ''}${extraMod}` : null,
                        ].filter(Boolean).join(' &nbsp;|&nbsp; ');

                        const content = `
                          <div class="rt-acquisition-result">
                            <h3>Acquisition Test</h3>
                            <p>${breakdown}</p>
                            <p>Target: <strong>${target}</strong> &nbsp; Roll: <strong>${total}</strong></p>
                            <p>${summary}</p>
                          </div>
                        `;
                        await ChatMessage.create({
                            user: game.user.id,
                            speaker: ChatMessage.getSpeaker(),
                            rolls: [roll],
                            content,
                            sound: CONFIG.sounds.dice,
                        });
                        resolve({ success, target, total, dos, dof });
                    },
                },
                cancel: { label: 'Cancel', icon: '<i class="fas fa-times"></i>', callback: () => resolve(null) },
            },
            default: 'roll',
        }).render(true);
    });
}
