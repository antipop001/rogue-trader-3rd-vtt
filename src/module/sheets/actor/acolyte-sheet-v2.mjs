import { DHBasicActionManager } from '../../actions/basic-action-manager.mjs';
import { DHTargetedActionManager } from '../../actions/targeted-action-manager.mjs';
import { Hit } from '../../rolls/damage-data.mjs';
import { AssignDamageData } from '../../rolls/assign-damage-data.mjs';
import { prepareAssignDamageRoll } from '../../prompts/assign-damage-prompt.mjs';
import { prepareCreateSpecialistSkillPrompt } from '../../prompts/simple-prompt.mjs';
import { toggleUIExpanded } from '../../rules/config.mjs';

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;
const { DragDrop } = foundry.applications.ux;

export class AcolyteSheetV2 extends HandlebarsApplicationMixin(ActorSheetV2) {

    static DEFAULT_OPTIONS = {
        classes: ['rogue-trader-3rd', 'sheet', 'actor', 'acolyte'],
        position: { width: 900, height: 750, top: 80, left: 120 },
        window: { resizable: true, contentClasses: ['rt-actor', 'rt-wrapper'] },
        form: { submitOnChange: true, closeOnSubmit: false },
        actions: {
            rollCharacteristic: AcolyteSheetV2._onRollCharacteristic,
            rollSkill: AcolyteSheetV2._onRollSkill,
            bonusVocalize: AcolyteSheetV2._onBonusVocalize,
            attack: AcolyteSheetV2._onCombatAttack,
            'assign-damage': AcolyteSheetV2._onAssignDamage,
            dodge: AcolyteSheetV2._onDodge,
            parry: AcolyteSheetV2._onParry,
            itemRoll: AcolyteSheetV2._onItemRoll,
            itemDamage: AcolyteSheetV2._onItemDamage,
            itemCreate: AcolyteSheetV2._onItemCreate,
            itemEdit: AcolyteSheetV2._onItemEdit,
            itemDelete: AcolyteSheetV2._onItemDelete,
            itemVocalize: AcolyteSheetV2._onItemVocalize,
            effectCreate: AcolyteSheetV2._onEffectCreate,
            effectEdit: AcolyteSheetV2._onEffectEdit,
            effectDelete: AcolyteSheetV2._onEffectDelete,
            effectEnable: AcolyteSheetV2._onEffectEnable,
            effectDisable: AcolyteSheetV2._onEffectDisable,
            addSkill: AcolyteSheetV2._onAddSkill,
            toggleHidden: AcolyteSheetV2._onToggleHidden,
        },
    };

    static PARTS = {
        body: {
            template: 'systems/rogue-trader-3rd/templates/actor/actor-acolyte-sheet.hbs',
            root: true,
            scrollable: ['.rt-body'],
        },
    };

    tabGroups = { primary: 'main' };

/** Override the inherited dragDrop getter so our markup selectors are honored. */
    get _dragDrop() {
        return this.#dragDrop ??= new DragDrop.implementation({
            dragSelector: '.item-drag, .actor-drag',
            dropSelector: null,
            permissions: {
                dragstart: this._canDragStart.bind(this),
                drop: this._canDragDrop.bind(this),
            },
            callbacks: {
                dragstart: this._onDragStart.bind(this),
                dragover: this._onDragOver.bind(this),
                drop: this._onDrop.bind(this),
            },
        });
    }
    #dragDrop = null;

    async _prepareContext(options) {
        const context = await super._prepareContext(options);

        const isObserver = this.actor.testUserPermission(game.user, 'OBSERVER');
        const isOwner = this.actor.testUserPermission(game.user, 'OWNER');
        if (!isObserver && !isOwner) {
            return {
                actor: { name: this.actor.name, img: this.actor.img },
                limited: true,
            };
        }

        context.actor = this.actor;
        context.system = this.actor.system;
        context.rt = CONFIG.rt;
        context.effects = this.actor.getEmbeddedCollection('ActiveEffect').contents;
        context.items = Array.from(this.actor.items).sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
        context.tabs = this.tabGroups;
        return context;
    }

    /** Manual non-action listeners: home-world change prompt + initial active-tab activation. */
    async _onRender(context, options) {
        await super._onRender(context, options);

        // The framework's _onClickTab toggles `.active` on click, but the first render needs
        // an explicit pass — otherwise every `.tab[data-tab]:not(.active)` is hidden by Foundry's
        // global CSS rule and the sheet looks empty.
        const initial = this.tabGroups.primary ?? 'main';
        this.changeTab(initial, 'primary', { force: true, updatePosition: false });

        // Diagnostic: log where Foundry actually placed the sheet so we can see what's
        // overriding DEFAULT_OPTIONS.position. Prints primitives inline (not in a collapsed Object).
        const r = this.element.getBoundingClientRect();
        const style = this.element.style;
        console.log('[RT] AcolyteSheetV2._onRender placement',
            'pos.left=', this.position?.left,
            'pos.top=', this.position?.top,
            'pos.width=', this.position?.width,
            'style.left=', style.left,
            'style.top=', style.top,
            'style.width=', style.width,
            'rect.left=', r.left,
            'rect.top=', r.top,
            'rect.width=', r.width,
            'viewport.width=', window.innerWidth,
            'viewport.height=', window.innerHeight,
        );

        if (!this.isEditable) return;

        const hw = this.element.querySelector('select.acolyte-homeWorld');
        if (hw) hw.addEventListener('change', (ev) => this._onHomeworldChange(ev));
    }

    /* --------------------------------------------------------- */
    /*  Drag and drop                                            */
    /* --------------------------------------------------------- */

    /** Items have built-in V2 drag handling via `data-item-id`. Skills/characteristics need custom payloads. */
    async _onDragStart(event) {
        const el = event.currentTarget;
        if (!el?.dataset) return;

        // Skill / characteristic drag for hotbar macros.
        if (el.classList.contains('actor-drag') && el.dataset.itemType) {
            const dragType = el.dataset.itemType;
            const base = {
                actorId: this.actor.id,
                uuid: this.actor.uuid,
                actorName: this.actor.name,
                sceneId: this.actor.isToken ? canvas.scene?.id : null,
                tokenId: this.actor.isToken ? this.actor.token?.id : null,
                type: dragType,
                data: {},
            };
            if (dragType === 'characteristic') {
                const characteristic = this.actor.characteristics[el.dataset.itemId];
                base.data = { name: characteristic?.label, characteristic: el.dataset.itemId };
                event.dataTransfer.setData('text/plain', JSON.stringify(base));
                return;
            }
            if (dragType === 'skill') {
                const skill = this.actor.skills[el.dataset.itemId];
                let name = skill?.label;
                if (el.dataset.speciality && skill?.specialities) {
                    const specialty = skill.specialities[el.dataset.speciality];
                    if (specialty) name = `${name}: ${specialty.label}`;
                }
                base.data = { name, skill: el.dataset.itemId, speciality: el.dataset.speciality };
                event.dataTransfer.setData('text/plain', JSON.stringify(base));
                return;
            }
        }

        // Items use a reorder-aware payload that the actor sheet's drop handler can recognize.
        if (el.classList.contains('item-drag') && el.dataset.itemId) {
            const item = this.actor.items.get(el.dataset.itemId);
            if (!item) return super._onDragStart(event);
            const dragData = {
                actorId: this.actor.id,
                uuid: this.actor.uuid,
                actorName: this.actor.name,
                sceneId: this.actor.isToken ? canvas.scene?.id : null,
                tokenId: this.actor.isToken ? this.actor.token?.id : null,
                type: 'Item',
                data: item,
                itemId: el.dataset.itemId,
                action: 'reorder',
            };
            event.dataTransfer.setData('text/plain', JSON.stringify(dragData));
            return;
        }

        return super._onDragStart(event);
    }

    async _onDrop(event) {
        let data;
        try { data = JSON.parse(event.dataTransfer.getData('text/plain')); }
        catch (err) { return super._onDrop(event); }

        // Reorder within the same actor — preserve V1 behavior.
        if (data?.type === 'Item' && data.action === 'reorder') {
            const targetEl = event.target.closest('.item-drag');
            const targetId = targetEl?.dataset?.itemId;
            const sourceId = data.itemId;
            if (!sourceId || !targetId || sourceId === targetId) return false;

            const items = Array.from(this.actor.items).sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
            const sourceIndex = items.findIndex(i => i.id === sourceId);
            const targetIndex = items.findIndex(i => i.id === targetId);
            if (sourceIndex === -1 || targetIndex === -1) return false;

            const moved = items[sourceIndex];
            items.splice(sourceIndex, 1);
            items.splice(targetIndex, 0, moved);
            const updates = items.map((item, i) => ({ _id: item.id, sort: i * 10 }));
            await this.actor.updateEmbeddedDocuments('Item', updates);
            return true;
        }

        // External items: avoid duplicating if already on the actor.
        if ((data?.type === 'Item' || data?.type === 'item') && data?.data?._id) {
            if (this.actor.items.find(i => i._id === data.data._id)) return false;
        }

        return super._onDrop(event);
    }

    /* --------------------------------------------------------- */
    /*  Action handlers                                          */
    /* --------------------------------------------------------- */

    static async _onRollCharacteristic(event, target) {
        const characteristic = target.dataset.characteristic;
        await this.actor.rollCharacteristic(characteristic);
    }

    static async _onRollSkill(event, target) {
        await this.actor.rollSkill(target.dataset.skill, target.dataset.specialty);
    }

    static async _onBonusVocalize(event, target) {
        const bonus = this.actor.backgroundEffects?.abilities?.find(a => a.name === target.dataset.bonusName);
        if (!bonus) return;
        await DHBasicActionManager.sendItemVocalizeChat({
            actor: this.actor.name,
            name: bonus.name,
            type: bonus.source,
            description: bonus.benefit,
        });
    }

    static async _onCombatAttack(event, target) {
        await DHTargetedActionManager.performWeaponAttack(this.actor);
    }

    static async _onAssignDamage(event, target) {
        const hitData = new Hit();
        const assignData = new AssignDamageData(this.actor, hitData);
        await prepareAssignDamageRoll(assignData);
    }

    static async _onDodge(event, target) { await this.actor.rollSkill('dodge'); }
    static async _onParry(event, target) { await this.actor.rollSkill('parry'); }

    static async _onItemRoll(event, target) {
        await this.actor.rollItem(target.dataset.itemId);
    }

    static async _onItemDamage(event, target) {
        await this.actor.damageItem(target.dataset.itemId);
    }

    static async _onItemCreate(event, target) {
        const type = target.dataset.type;
        const data = { name: `New ${type.capitalize()}`, type };
        await this.actor.createEmbeddedDocuments('Item', [data], { renderSheet: true });
    }

    static async _onItemEdit(event, target) {
        const item = this.actor.items.get(target.dataset.itemId);
        item?.sheet.render(true);
    }

    static async _onItemDelete(event, target) {
        const itemId = target.dataset.itemId;
        const confirmed = await foundry.applications.api.DialogV2.confirm({
            window: { title: 'Confirm Delete' },
            content: '<p>Are you sure you would like to delete this?</p>',
            modal: true,
        });
        if (!confirmed) return;
        await this.actor.deleteEmbeddedDocuments('Item', [itemId]);
    }

    static async _onItemVocalize(event, target) {
        const item = this.actor.items.get(target.dataset.itemId);
        if (!item) return;
        const text = item.system.benefit ?? item.system.description ?? '';
        await DHBasicActionManager.sendItemVocalizeChat({
            actor: this.actor.name,
            name: item.name,
            type: item.type?.toUpperCase(),
            description: await foundry.applications.ux.TextEditor.implementation.enrichHTML(text, {
                rollData: { actor: this.actor, item, pr: this.actor.psy.rating },
            }),
        });
    }

    static async _onEffectCreate(event, target) {
        await this.actor.createEmbeddedDocuments('ActiveEffect', [{
            name: 'New Effect',
            img: 'icons/svg/aura.svg',
            origin: this.actor.uuid,
            disabled: true,
        }], { renderSheet: true });
    }

    static async _onEffectEdit(event, target) {
        const effect = this.actor.effects.get(target.dataset.effectId);
        effect?.sheet.render(true);
    }

    static async _onEffectDelete(event, target) {
        const effect = this.actor.effects.get(target.dataset.effectId);
        await effect?.delete();
    }

    static async _onEffectEnable(event, target) {
        const effect = this.actor.effects.get(target.dataset.effectId);
        await effect?.update({ disabled: false });
    }

    static async _onEffectDisable(event, target) {
        const effect = this.actor.effects.get(target.dataset.effectId);
        await effect?.update({ disabled: true });
    }

    static async _onAddSkill(event, target) {
        const skillName = target.dataset.skill;
        const skill = this.actor.system.skills[skillName];
        if (!skill) {
            ui.notifications.warn('Skill not specified -- unexpected error.');
            return;
        }
        await prepareCreateSpecialistSkillPrompt({ actor: this.actor, skill, skillName });
    }

    static _onToggleHidden(event, target) {
        const toggleKey = target.dataset.toggle;
        target.querySelector('span')?.classList.toggle('active');
        for (const el of this.element.querySelectorAll(`.${toggleKey}`)) {
            el.style.display = (el.style.display === 'none') ? '' : 'none';
        }
        toggleUIExpanded(toggleKey);
    }

    /* --------------------------------------------------------- */
    /*  Misc                                                     */
    /* --------------------------------------------------------- */

    _onHomeworldChange(event) {
        event.preventDefault();
        foundry.applications.api.DialogV2.confirm({
            window: { title: 'Roll Characteristics?' },
            content: '<p>Would you like to roll Wounds and Fate for this homeworld?</p>',
            modal: true,
        }).then(async (yes) => {
            if (!yes) return;
            if (!this.actor.backgroundEffects?.homeworld) return;

            const woundRoll = new Roll(this.actor.backgroundEffects.homeworld.wounds);
            await woundRoll.evaluate();
            this.actor.wounds.max = woundRoll.total;

            const fateRoll = new Roll('1d10');
            await fateRoll.evaluate();
            this.actor.fate.max =
                parseInt(this.actor.backgroundEffects.homeworld.fate_threshold) +
                (fateRoll.total >= this.actor.backgroundEffects.homeworld.emperors_blessing ? 1 : 0);
            this.render(true);
        });
    }
}
