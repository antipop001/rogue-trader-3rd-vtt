import { RogueTraderSettings } from '../rogue-trader-settings.mjs';
import { endeavourSizeReward, endeavourTotals, endeavourCompletionPF, misfortuneResult } from './endeavours-helpers.mjs';

/**
 * Endeavours (RT Core Ch.XII). A campaign objective sized Lesser / Greater / Grand, whose
 * Achievement Points are divided among its Objectives (each themed Military / Criminal /
 * Exploration / Trade / Creed). Completing it awards Profit Factor by SIZE, plus +1 PF for every
 * full 100 Achievement Points beyond the target. The campaign downside is the per-session
 * Misfortune roll (Table 9-41), which costs PF (recoverable by addressing it). (QA-084 / QA-085.)
 *
 * The pure model helpers live in endeavours-helpers.mjs (node-tested); this file is the GM dialog
 * + world-setting glue. Storage (world setting): Array of { id, name, size, description, pfReward,
 * status, createdAt, objectives: [{ id, theme, target, achievementPoints }] }.
 */

export { endeavourSizeReward, endeavourTotals, endeavourCompletionPF, misfortuneResult };

const OBJECTIVE_THEMES = ['Exploration', 'Trade', 'Military', 'Criminal', 'Creed'];
const ENDEAVOUR_SIZES = ['Lesser', 'Greater', 'Grand'];

// ── Dialog ───────────────────────────────────────────────────────────────────────────────────

function uuid() {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
        (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16));
}

function row(e) {
    const { ap, target } = endeavourTotals(e.objectives);
    const pct = target > 0 ? Math.min(100, Math.round((ap / target) * 100)) : 0;
    const complete = e.status === 'complete';
    const excess = ap > target ? Math.floor((ap - target) / 100) : 0;
    const objRows = (e.objectives ?? []).map(o => `
      <tr class="obj-row"><td style="padding-left:1.5em">↳ ${o.theme}</td><td>${o.achievementPoints} / ${o.target}</td><td></td>
        <td>${complete ? '' : `<button type="button" class="obj-award" data-id="${e.id}" data-oid="${o.id}">+AP</button> <button type="button" class="obj-delete" data-id="${e.id}" data-oid="${o.id}">✕</button>`}</td></tr>`).join('');
    return `
      <tr data-id="${e.id}" class="${complete ? 'endeavour-complete' : ''}">
        <td><strong>${e.name}</strong></td><td>${e.size}</td>
        <td>${ap} / ${target} (${pct}%)</td>
        <td>+${e.pfReward}${excess ? ` <em>(+${excess} excess)</em>` : ''}</td>
        <td>${complete ? '✓ Complete' : `<button type="button" class="endeavour-add-obj" data-id="${e.id}">+Objective</button> <button type="button" class="endeavour-complete-btn" data-id="${e.id}">Complete</button> <button type="button" class="endeavour-delete" data-id="${e.id}">✕</button>`}</td>
      </tr>${objRows}`;
}

function tableHtml(endeavours) {
    if (!endeavours.length) return '<p><em>No active Endeavours. Add one below.</em></p>';
    return `
      <table class="rt-endeavours" style="width:100%; border-collapse:collapse">
        <thead><tr><th>Name</th><th>Size</th><th>Progress</th><th>PF Reward</th><th>Actions</th></tr></thead>
        <tbody>${endeavours.map(row).join('')}</tbody>
      </table>`;
}

function newFormHtml() {
    const sizes = ENDEAVOUR_SIZES.map(s => `<option value="${s}">${s} (+${endeavourSizeReward(s)} PF)</option>`).join('');
    return `
      <h3 style="margin-top:1em">Add Endeavour</h3>
      <form class="rt-endeavour-new">
        <div class="form-group"><label>Name</label><input type="text" name="name" required /></div>
        <div class="form-group"><label>Size</label><select name="size">${sizes}</select></div>
        <div class="form-group"><label>Description (optional)</label><input type="text" name="description" /></div>
        <div class="form-group" style="margin-top:.5em"><button type="button" class="endeavour-add">Add</button></div>
      </form>`;
}

export async function openEndeavoursDialog() {
    if (!game.user.isGM) {
        ui.notifications?.warn('Only the GM can manage Endeavours.');
        return;
    }
    const endeavours = RogueTraderSettings.getEndeavours();
    const html = `
      <div class="rt-endeavours-dialog">
        <p>Profit Factor: <strong>${RogueTraderSettings.getProfitFactor()}</strong>
           <button type="button" class="endeavour-misfortune" style="float:right">Roll Misfortune (Table 9-41)</button></p>
        <div class="rt-endeavour-list">${tableHtml(endeavours)}</div>
        ${newFormHtml()}
      </div>`;
    // Kept on V1 Dialog: this interactive tracker embeds a NESTED <form class="rt-endeavour-new">
    // and wires jQuery listeners against it (attachListeners). DialogV2 form-wraps its content, so
    // the browser strips the nested form and attachListeners can't find it. V1 doesn't form-wrap,
    // so the nested form + handlers work. (Not a sheet roll, so the V1/V2 layering issue is moot.)
    const dialog = new Dialog({
        title: 'Endeavours',
        content: html,
        buttons: { close: { label: 'Close', icon: '<i class="fas fa-times"></i>' } },
        default: 'close',
        render: (html) => attachListeners(html, dialog),
    }, { width: 720 });
    dialog.render(true);
}

async function attachListeners($html, dialog) {
    const reopen = async () => { dialog.close(); openEndeavoursDialog(); };

    $html.find('.endeavour-add').on('click', async () => {
        const form = $html.find('form.rt-endeavour-new')[0];
        const data = new FormData(form);
        const name = (data.get('name') || '').toString().trim();
        if (!name) { ui.notifications?.warn('Endeavour name is required.'); return; }
        const size = (data.get('size') || 'Lesser').toString();
        const list = RogueTraderSettings.getEndeavours();
        list.push({
            id: uuid(), name, size, description: data.get('description') || '',
            pfReward: endeavourSizeReward(size), objectives: [], status: 'active', createdAt: Date.now(),
        });
        await RogueTraderSettings.setEndeavours(list);
        await reopen();
    });

    $html.find('.endeavour-add-obj').on('click', async (ev) => {
        const id = ev.currentTarget.dataset.id;
        const obj = await promptObjective();
        if (!obj) return;
        const list = RogueTraderSettings.getEndeavours();
        const e = list.find(x => x.id === id);
        if (!e) return;
        (e.objectives ??= []).push({ id: uuid(), theme: obj.theme, target: obj.target, achievementPoints: 0 });
        await RogueTraderSettings.setEndeavours(list);
        await reopen();
    });

    $html.find('.obj-award').on('click', async (ev) => {
        const { id, oid } = ev.currentTarget.dataset;
        const amount = await promptNumber('Award Achievement Points', 'Amount to add to this Objective:', 50);
        if (amount === null) return;
        const list = RogueTraderSettings.getEndeavours();
        const o = list.find(x => x.id === id)?.objectives?.find(z => z.id === oid);
        if (!o) return;
        o.achievementPoints += amount;
        await RogueTraderSettings.setEndeavours(list);
        await reopen();
    });

    $html.find('.obj-delete').on('click', async (ev) => {
        const { id, oid } = ev.currentTarget.dataset;
        const list = RogueTraderSettings.getEndeavours();
        const e = list.find(x => x.id === id);
        if (e) e.objectives = (e.objectives ?? []).filter(z => z.id !== oid);
        await RogueTraderSettings.setEndeavours(list);
        await reopen();
    });

    $html.find('.endeavour-complete-btn').on('click', async (ev) => {
        const id = ev.currentTarget.dataset.id;
        const list = RogueTraderSettings.getEndeavours();
        const e = list.find(x => x.id === id);
        if (!e) return;
        e.status = 'complete';
        const { ap, target } = endeavourTotals(e.objectives);
        const award = endeavourCompletionPF(e.pfReward, ap, target);
        const newPF = RogueTraderSettings.getProfitFactor() + award;
        await RogueTraderSettings.setProfitFactor(newPF);
        await RogueTraderSettings.setEndeavours(list);
        const excess = Math.max(0, ap - target);
        await ChatMessage.create({
            speaker: ChatMessage.getSpeaker(),
            content: `<h3>Endeavour Complete: ${e.name}</h3><p>${e.size} Endeavour — base +${e.pfReward} PF`
                + `${excess >= 100 ? `, +${Math.floor(excess / 100)} for ${excess} excess AP` : ''}.<br>`
                + `Profit Factor awarded: <strong>+${award}</strong> (now ${newPF}).</p>`,
        });
        await reopen();
    });

    $html.find('.endeavour-delete').on('click', async (ev) => {
        const id = ev.currentTarget.dataset.id;
        await RogueTraderSettings.setEndeavours(RogueTraderSettings.getEndeavours().filter(x => x.id !== id));
        await reopen();
    });

    $html.find('.endeavour-misfortune').on('click', async () => {
        const d100 = (await new Roll('1d100').evaluate()).total;
        const d5 = (await new Roll('1d5').evaluate()).total;
        const { tier, loss } = misfortuneResult(d100, d5);
        let newPF = RogueTraderSettings.getProfitFactor();
        if (loss > 0) {
            newPF = Math.max(0, newPF - loss);
            await RogueTraderSettings.setProfitFactor(newPF);
        }
        await ChatMessage.create({
            speaker: ChatMessage.getSpeaker(),
            content: `<h3>Endeavour Misfortune (Table 9-41)</h3><p>Rolled ${d100} — <strong>${tier}</strong>`
                + `${loss > 0 ? `: the warband loses <strong>${loss}</strong> Profit Factor (now ${newPF}). The Explorers may recover it by addressing the Misfortune.` : ' — no Misfortune this session.'}</p>`,
        });
        if (loss > 0) await reopen();
    });
}

// Small DialogV2 (falling back to V1) that returns whatever `read(form)` extracts on OK, else null.
// Reads are scoped to the dialog's own form element. (V1-dialog migration.)
async function _formPrompt(title, content, okLabel, read) {
    const DialogV2 = foundry.applications?.api?.DialogV2;
    if (DialogV2) {
        let result = null;
        await DialogV2.wait({
            window: { title }, content, rejectClose: false,
            buttons: [
                { action: 'ok', label: okLabel, default: true, callback: (_e, button) => { result = read(button.form); } },
                { action: 'cancel', label: 'Cancel' },
            ],
        });
        return result;
    }
    return new Promise(resolve => {
        new Dialog({
            title, content,
            buttons: {
                ok: { label: okLabel, callback: (h) => resolve(read(h?.[0] ?? h)) },
                cancel: { label: 'Cancel', callback: () => resolve(null) },
            },
            default: 'ok',
        }).render(true);
    });
}

function promptObjective() {
    const themes = OBJECTIVE_THEMES.map(t => `<option value="${t}">${t}</option>`).join('');
    const content = `<form><div class="form-group"><label>Theme</label><select name="theme">${themes}</select></div>`
        + `<div class="form-group"><label>Target Achievement Points</label><input type="number" name="target" value="100" min="1" step="25" autofocus /></div></form>`;
    return _formPrompt('Add Objective', content, 'Add', (form) => ({
        theme: form?.querySelector('select[name="theme"]')?.value,
        target: Number(form?.querySelector('input[name="target"]')?.value) || 100,
    }));
}

function promptNumber(title, label, defaultVal) {
    const content = `<form><div class="form-group"><label>${label}</label><input type="number" name="value" value="${defaultVal}" step="1" autofocus /></div></form>`;
    return _formPrompt(title, content, 'OK', (form) => Number(form?.querySelector('input[name="value"]')?.value) || 0);
}
