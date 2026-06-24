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
