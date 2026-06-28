import { toggleUIExpanded } from '../../rules/config.mjs';
import { consumableActivation, parseConsumableDuration } from '../../rolls/roll-helpers.mjs';

export class DarkHeresyItemSheet extends ItemSheet {
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            width: 650,
            height: 500,
            tabs: [{ navSelector: '.rt-navigation', contentSelector: '.rt-body', initial: 'description' }],
        });
    }

    get template() {
        return `systems/rogue-trader-3rd/templates/item/item-sheet.hbs`;
    }

    getData() {
        const context = super.getData();
        context.flags = context.item.flags;
        context.rt = CONFIG.rt;
        context.effects = this.item.getEmbeddedCollection('ActiveEffect').contents;
        return context;
    }

    _getHeaderButtons() {
        const buttons = super._getHeaderButtons();
        const sys = this.item.system ?? {};
        // Show a Use button for any activated combat drug (ENGINE-CONSUMABLE-ACTIVATE).
        if (consumableActivation(this.item.name)) {
            buttons.unshift({
                label: 'Use',
                class: 'use-consumable',
                icon: 'fas fa-syringe',
                onclick: () => this._useConsumable(),
            });
        }
        // Show Acquire button for any physical item with an availability or craftsmanship field.
        if (sys.availability || sys.craftsmanship) {
            buttons.unshift({
                label: 'Acquire',
                class: 'acquire',
                icon: 'fas fa-coins',
                onclick: () => {
                    if (!game.rt?.acquisition) return;
                    return game.rt.acquisition({
                        itemName: this.item.name,
                        availability: String(sys.availability ?? 'average').toLowerCase(),
                        craftsmanship: String(sys.craftsmanship ?? 'common').toLowerCase(),
                    });
                },
            });
        }
        // Reload button for any weapon with a clip — the Reload action (RT Core p.249) the
        // engine previously never performed; refills clip.value to clip.max. (QA-104.)
        if (this.item.type === 'weapon' && Number(sys.clip?.max) > 0) {
            buttons.unshift({
                label: 'Reload',
                class: 'reload',
                icon: 'fas fa-sync',
                onclick: () => this._reloadWeapon(),
            });
        }
        // Clear Jam — only while the weapon is jammed (RT Core p.238). (QA-105.)
        if (this.item.type === 'weapon' && sys.jammed) {
            buttons.unshift({
                label: 'Clear Jam',
                class: 'clear-jam',
                icon: 'fas fa-wrench',
                onclick: () => this._clearJam(),
            });
        }
        return buttons;
    }

    activateListeners(html) {
        super.activateListeners(html);
        if (!this.isEditable) return;

        html.find('.sheet-control__hide-control').click(async (ev) => await this._sheetControlHideToggle(ev));
        html.find('.effect-delete').click(async (ev) => await this._effectDelete(ev));
        html.find('.effect-edit').click(async (ev) => await this._effectEdit(ev));
        html.find('.effect-create').click(async (ev) => await this._effectCreate(ev));
        html.find('.effect-enable').click(async (ev) => await this._effectEnable(ev));
        html.find('.effect-disable').click(async (ev) => await this._effectDisable(ev));
    }

    // Perform the Reload action (RT Core p.249): refill the clip to its maximum. The reload
    // TIME (incl. the Rapid Reload halving) is computed elsewhere as `effectiveReload` and
    // surfaced in the chat note; the action-economy cost is the GM's to spend. (QA-104.)
    async _reloadWeapon() {
        const sys = this.item.system ?? {};
        const max = Number(sys.clip?.max) || 0;
        if (max <= 0) return;
        if (Number(sys.clip?.value) >= max) {
            ui.notifications?.info(`${this.item.name} is already fully loaded (${max}/${max}).`);
            return;
        }
        await this.item.update({ 'system.clip.value': max });
        const reloadTime = sys.effectiveReload ?? sys.reload;
        const actor = this.item.parent;
        const speaker = actor?.documentName === 'Actor' ? ChatMessage.getSpeaker({ actor }) : {};
        await ChatMessage.create({
            speaker,
            content: `<p><strong>Reload</strong> — ${this.item.name} reloaded to ${max}/${max}${reloadTime ? ` (Reload: ${reloadTime})` : ''}.</p>`,
        });
    }

    // Clear a jammed weapon (RT Core p.238): a Full Action Ballistic Skill Test. On success the
    // weapon may fire again; on failure it stays jammed. With no owning actor (a loose item in a
    // pack) just clear it. (QA-105.)
    async _clearJam() {
        const actor = this.item.parent;
        if (actor?.documentName !== 'Actor' || !actor.characteristics?.ballisticSkill) {
            await this.item.update({ 'system.jammed': false });
            ui.notifications?.info(`${this.item.name}: jam cleared.`);
            return;
        }
        const bs = actor.characteristics.ballisticSkill.total ?? 0;
        const roll = await new Roll('1d100').evaluate();
        const success = roll.total === 1 || (roll.total <= bs && roll.total !== 100);
        if (success) await this.item.update({ 'system.jammed': false });
        await ChatMessage.create({
            speaker: ChatMessage.getSpeaker({ actor }),
            content: `<p><strong>Clear Jam</strong> (Full Action) — ${this.item.name}: Ballistic Skill Test rolled ${roll.total} vs ${bs} — `
                + `${success ? 'success! The jam is cleared and the weapon can fire again.' : 'failed. The weapon remains jammed.'}</p>`,
        });
    }

    // Apply an activated drug as a timed ActiveEffect on the carrying actor
    // (ENGINE-CONSUMABLE-ACTIVATE). Clean mechanical bonuses (e.g. White Void +20 WP,
    // Slaught +3 Ag/Per Bonus) ride as AE `changes`; talent grants / immunities /
    // after-effects ride in the effect description + chat card for manual handling.
    async _useConsumable() {
        const spec = consumableActivation(this.item.name);
        if (!spec) return;
        const actor = this.item.parent;
        if (!actor || actor.documentName !== 'Actor') {
            ui.notifications?.warn('Drop this drug onto a character before using it.');
            return;
        }

        // Roll the duration so the effect expires on its own.
        const dur = parseConsumableDuration(spec.durationText);
        const duration = {};
        let durationLabel = spec.durationText;
        if (dur) {
            const roll = new Roll(dur.formula);
            await roll.evaluate();
            const value = roll.total;
            if (dur.durationKey === 'rounds') duration.rounds = value;
            else duration.seconds = value * dur.secondsPer;
            durationLabel = `${value} ${dur.unit}`;
        }

        const effectData = {
            name: spec.label ?? this.item.name,
            img: this.item.img ?? 'icons/svg/aura.svg',
            origin: this.item.uuid,
            duration,
            disabled: false,
            description: spec.note ?? '',
            changes: (spec.changes ?? []).map((c) => ({ ...c, value: String(c.value), priority: null })),
            flags: { rt: { consumable: true } },
        };
        await actor.createEmbeddedDocuments('ActiveEffect', [effectData]);

        const grantLine = spec.grantsTalent
            ? `<p><em>Grant the ${spec.grantsTalent} talent for the duration.</em></p>` : '';
        ChatMessage.create({
            user: game.user.id,
            speaker: ChatMessage.getSpeaker({ actor }),
            content: `<div class="rt-consumable-use"><h3>${actor.name} uses ${this.item.name}</h3>`
                + `<p><strong>Duration:</strong> ${durationLabel}</p>${grantLine}`
                + `<p>${spec.note ?? ''}</p></div>`,
            style: CONST.CHAT_MESSAGE_STYLES.OTHER,
        });
    }

    async _sheetControlHideToggle(event) {
        event.preventDefault();
        const displayToggle = $(event.currentTarget);
        $('span', displayToggle).first().toggleClass('active');
        const target = displayToggle.data('toggle');
        $('.' + target).toggle();
        toggleUIExpanded(target);
    }

    async _effectDisable(event) {
        event.preventDefault();
        const div = $(event.currentTarget);
        const effect = this.item.effects.get(div.data('effectId'));
        effect.update({disabled: true});
    }

    async _effectEnable(event) {
        event.preventDefault();
        const div = $(event.currentTarget);
        const effect = this.item.effects.get(div.data('effectId'));
        effect.update({disabled: false});
    }

    async _effectDelete(event) {
        event.preventDefault();
        const div = $(event.currentTarget);
        const effect = this.item.effects.get(div.data('effectId'));
        effect.delete();
    }

    async _effectEdit(event) {
        event.preventDefault();
        const div = $(event.currentTarget);
        const effect = this.item.effects.get(div.data('effectId'));
        effect.sheet.render(true);
    }

    async _effectCreate(event) {
        event.preventDefault();
        return this.item.createEmbeddedDocuments('ActiveEffect', [{
            name: 'New Effect',
            img: 'icons/svg/aura.svg',
            origin: this.item.uuid,
            disabled: true
        }], { renderSheet: true })
    }
}
