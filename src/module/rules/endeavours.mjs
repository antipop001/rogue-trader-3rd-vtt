import { SYSTEM_ID } from '../hooks-manager.mjs';
import { RogueTraderSettings } from '../rogue-trader-settings.mjs';

/**
 * RT corebook pp.288-294 — Endeavours.
 *
 * An Endeavour represents a multi-session campaign objective. Players
 * accumulate Achievement Points toward completing it. Completing an
 * Endeavour awards Profit Factor to the warband.
 *
 * Storage: world-scope setting holding an Array of plain Endeavour objects.
 * Each entry: { id, name, type, description, achievementPoints, target, pfReward, status, createdAt }
 */

const ENDEAVOUR_TYPES = ['Exploration', 'Trade', 'Military', 'Criminal', 'Creed'];


function uuid() {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
        (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16),
    );
}


function row(e) {
    const pct = e.target > 0 ? Math.min(100, Math.round((e.achievementPoints / e.target) * 100)) : 0;
    const complete = e.status === 'complete';
    return `
      <tr data-id="${e.id}" class="${complete ? 'endeavour-complete' : ''}">
        <td>${e.name}</td>
        <td>${e.type}</td>
        <td>${e.achievementPoints} / ${e.target} (${pct}%)</td>
        <td>+${e.pfReward}</td>
        <td>${complete ? '✓ Complete' : '<button type="button" class="endeavour-award" data-id="' + e.id + '">+AP</button> '
          + '<button type="button" class="endeavour-complete-btn" data-id="' + e.id + '">Complete</button> '
          + '<button type="button" class="endeavour-delete" data-id="' + e.id + '">✕</button>'}</td>
      </tr>
    `;
}


function tableHtml(endeavours) {
    if (!endeavours.length) {
        return '<p><em>No active Endeavours. Add one below.</em></p>';
    }
    const rows = endeavours.map(row).join('');
    return `
      <table class="rt-endeavours" style="width:100%; border-collapse:collapse">
        <thead><tr><th>Name</th><th>Type</th><th>Progress</th><th>PF Reward</th><th>Actions</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;
}


function newFormHtml() {
    const types = ENDEAVOUR_TYPES.map(t => `<option value="${t}">${t}</option>`).join('');
    return `
      <h3 style="margin-top:1em">Add Endeavour</h3>
      <form class="rt-endeavour-new">
        <div class="form-group"><label>Name</label><input type="text" name="name" required /></div>
        <div class="form-group"><label>Type</label><select name="type">${types}</select></div>
        <div class="form-group"><label>Target Achievement Points</label><input type="number" name="target" value="500" min="1" step="50" /></div>
        <div class="form-group"><label>PF Reward on Complete</label><input type="number" name="pfReward" value="1" min="0" step="1" /></div>
        <div class="form-group"><label>Description (optional)</label><input type="text" name="description" /></div>
        <div class="form-group" style="margin-top:.5em"><button type="button" class="endeavour-add">Add</button></div>
      </form>
    `;
}


/**
 * Open the Endeavours management dialog. GM-only.
 */
export async function openEndeavoursDialog() {
    if (!game.user.isGM) {
        ui.notifications?.warn('Only the GM can manage Endeavours.');
        return;
    }
    const endeavours = RogueTraderSettings.getEndeavours();
    const html = `
      <div class="rt-endeavours-dialog">
        <p>Profit Factor: <strong>${RogueTraderSettings.getProfitFactor()}</strong></p>
        <div class="rt-endeavour-list">${tableHtml(endeavours)}</div>
        ${newFormHtml()}
      </div>
    `;

    const dialog = new Dialog({
        title: 'Endeavours',
        content: html,
        buttons: { close: { label: 'Close', icon: '<i class="fas fa-times"></i>' } },
        default: 'close',
        render: (html) => attachListeners(html, dialog),
    }, { width: 700 });
    dialog.render(true);
}


async function attachListeners($html, dialog) {
    $html.find('.endeavour-add').on('click', async () => {
        const form = $html.find('form.rt-endeavour-new')[0];
        const data = new FormData(form);
        const name = (data.get('name') || '').toString().trim();
        if (!name) {
            ui.notifications?.warn('Endeavour name is required.');
            return;
        }
        const list = RogueTraderSettings.getEndeavours();
        list.push({
            id: uuid(),
            name,
            type: data.get('type') || 'Exploration',
            description: data.get('description') || '',
            achievementPoints: 0,
            target: Number(data.get('target')) || 500,
            pfReward: Number(data.get('pfReward')) || 1,
            status: 'active',
            createdAt: Date.now(),
        });
        await RogueTraderSettings.setEndeavours(list);
        dialog.close();
        openEndeavoursDialog();
    });

    $html.find('.endeavour-award').on('click', async (ev) => {
        const id = ev.currentTarget.dataset.id;
        const amount = await promptNumber('Award Achievement Points', 'Amount to add:', 100);
        if (amount === null) return;
        const list = RogueTraderSettings.getEndeavours();
        const e = list.find(x => x.id === id);
        if (!e) return;
        e.achievementPoints += amount;
        if (e.achievementPoints >= e.target) {
            ui.notifications?.info(`Endeavour "${e.name}" has reached its target. Use Complete to finish it and award PF.`);
        }
        await RogueTraderSettings.setEndeavours(list);
        dialog.close();
        openEndeavoursDialog();
    });

    $html.find('.endeavour-complete-btn').on('click', async (ev) => {
        const id = ev.currentTarget.dataset.id;
        const list = RogueTraderSettings.getEndeavours();
        const e = list.find(x => x.id === id);
        if (!e) return;
        e.status = 'complete';
        const newPF = RogueTraderSettings.getProfitFactor() + e.pfReward;
        await RogueTraderSettings.setProfitFactor(newPF);
        await RogueTraderSettings.setEndeavours(list);
        await ChatMessage.create({
            speaker: ChatMessage.getSpeaker(),
            content: `<h3>Endeavour Complete: ${e.name}</h3><p>Type: ${e.type}<br>Profit Factor awarded: <strong>+${e.pfReward}</strong> (now ${newPF})</p>`,
        });
        dialog.close();
        openEndeavoursDialog();
    });

    $html.find('.endeavour-delete').on('click', async (ev) => {
        const id = ev.currentTarget.dataset.id;
        const list = RogueTraderSettings.getEndeavours().filter(x => x.id !== id);
        await RogueTraderSettings.setEndeavours(list);
        dialog.close();
        openEndeavoursDialog();
    });
}


function promptNumber(title, label, defaultVal) {
    return new Promise(resolve => {
        new Dialog({
            title,
            content: `<form><div class="form-group"><label>${label}</label><input type="number" name="value" value="${defaultVal}" step="1" autofocus /></div></form>`,
            buttons: {
                ok: {
                    label: 'OK',
                    callback: html => resolve(Number(html.find('input[name="value"]').val()) || 0),
                },
                cancel: { label: 'Cancel', callback: () => resolve(null) },
            },
            default: 'ok',
        }).render(true);
    });
}
