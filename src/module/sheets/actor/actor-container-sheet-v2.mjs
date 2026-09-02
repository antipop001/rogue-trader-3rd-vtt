import { DHBasicActionManager } from '../../actions/basic-action-manager.mjs';
import { toggleUIExpanded } from '../../rules/config.mjs';

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;
const { DragDrop } = foundry.applications.ux;

/**
 * ApplicationV2 counterpart of `ActorContainerSheet` — shared item/effect CRUD,
 * drag/drop, and toggle-visibility actions for any actor sheet that holds
 * embedded items. Subclasses add type-specific actions (rolls, custom panels).
 */
export class ActorContainerSheetV2 extends HandlebarsApplicationMixin(ActorSheetV2) {

    static DEFAULT_OPTIONS = {
        classes: ['rogue-trader-3rd', 'sheet', 'actor'],
        position: { width: 900, height: 750, top: 80, left: 120 },
        window: { resizable: true, contentClasses: ['rt-actor', 'rt-wrapper'] },
        form: { submitOnChange: true, closeOnSubmit: false },
        actions: {
            itemRoll: ActorContainerSheetV2._onItemRoll,
            itemDamage: ActorContainerSheetV2._onItemDamage,
            itemCreate: ActorContainerSheetV2._onItemCreate,
            addFromCompendium: ActorContainerSheetV2._onAddFromCompendium,
            itemEdit: ActorContainerSheetV2._onItemEdit,
            itemDelete: ActorContainerSheetV2._onItemDelete,
            itemVocalize: ActorContainerSheetV2._onItemVocalize,
            effectCreate: ActorContainerSheetV2._onEffectCreate,
            effectEdit: ActorContainerSheetV2._onEffectEdit,
            effectDelete: ActorContainerSheetV2._onEffectDelete,
            effectEnable: ActorContainerSheetV2._onEffectEnable,
            effectDisable: ActorContainerSheetV2._onEffectDisable,
            toggleHidden: ActorContainerSheetV2._onToggleHidden,
        },
    };

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
        context.actor = this.actor;
        context.system = this.actor.system;
        context.rt = CONFIG.rt;
        context.effects = this.actor.getEmbeddedCollection('ActiveEffect').contents;
        context.items = Array.from(this.actor.items).sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
        return context;
    }

    async _onRender(context, options) {
        await super._onRender(context, options);
    }

    /* --------------------------------------------------------- */
    /*  Drag and drop                                            */
    /* --------------------------------------------------------- */

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
                const characteristic = this.actor.characteristics?.[el.dataset.itemId];
                if (characteristic) {
                    base.data = { name: characteristic.label, characteristic: el.dataset.itemId };
                    event.dataTransfer.setData('text/plain', JSON.stringify(base));
                    return;
                }
            }
            if (dragType === 'skill') {
                const skill = this.actor.skills?.[el.dataset.itemId];
                if (skill) {
                    let name = skill.label;
                    if (el.dataset.speciality && skill.specialities) {
                        const specialty = skill.specialities[el.dataset.speciality];
                        if (specialty) name = `${name}: ${specialty.label}`;
                    }
                    base.data = { name, skill: el.dataset.itemId, speciality: el.dataset.speciality };
                    event.dataTransfer.setData('text/plain', JSON.stringify(base));
                    return;
                }
            }
        }

        // Items use a reorder-aware payload that the drop handler recognizes.
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
    /*  Item actions                                             */
    /* --------------------------------------------------------- */

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

    /**
     * Add one or more items to the actor from a compendium via a searchable picker — a
     * reliable, drag-and-drop-independent path (native HTML5 DnD onto the tabbed content can
     * be flaky in some browsers/sessions). `data-pack` names the compendium and `data-type`
     * filters/labels it. Supports a quantity so stackable talents (e.g. Sound Constitution,
     * RT Core p.111) can be added multiple times in one go. Uses the same createEmbeddedDocuments
     * path a drop would, with fresh ids per copy.
     */
    static async _onAddFromCompendium(event, target) {
        const packId = target.dataset.pack;
        const type = target.dataset.type || 'item';
        const pack = game.packs.get(packId);
        if (!pack) { ui.notifications.warn(`Compendium "${packId}" not found.`); return; }
        const index = await pack.getIndex();
        const entries = [...index]
            .filter(e => !e.type || e.type === type)
            .sort((a, b) => a.name.localeCompare(b.name));
        if (!entries.length) { ui.notifications.warn(`No entries found in "${packId}".`); return; }

        const esc = (s) => String(s).replace(/[&<>"]/g,
            c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
        const label = type.charAt(0).toUpperCase() + type.slice(1);
        const opts = entries.map(e => `<option value="${e._id}">${esc(e.name)}</option>`).join('');
        const content = `
            <div class="rt-add-compendium">
                <input type="search" name="filter" placeholder="Filter ${esc(label)}s…" autofocus
                       style="width:100%;box-sizing:border-box;margin-bottom:6px;">
                <select name="pick" size="12" style="width:100%;box-sizing:border-box;">${opts}</select>
                <label style="display:block;margin-top:6px;">Quantity
                    <input type="number" name="qty" value="1" min="1" step="1" style="width:70px;">
                </label>
                <p class="notes" style="margin-top:4px;">Stackable talents (e.g. Sound Constitution) can be added more than once — set a quantity.</p>
            </div>`;
        const actor = this.actor;

        await foundry.applications.api.DialogV2.wait({
            window: { title: `Add ${label}` },
            position: { width: 420 },
            content,
            render: (ev, dialog) => {
                const root = dialog.element;
                const filter = root.querySelector('input[name="filter"]');
                const select = root.querySelector('select[name="pick"]');
                if (select?.options.length) select.options[0].selected = true;
                filter?.addEventListener('keyup', () => {
                    const q = filter.value.toLowerCase();
                    for (const o of select.options) o.hidden = !!q && !o.textContent.toLowerCase().includes(q);
                    if (select.selectedOptions[0]?.hidden) {
                        const firstVisible = [...select.options].find(o => !o.hidden);
                        if (firstVisible) firstVisible.selected = true;
                    }
                });
            },
            buttons: [
                {
                    action: 'add', label: 'Add', default: true, icon: 'fa-solid fa-plus',
                    callback: async (ev, button, dialog) => {
                        const form = button.form ?? dialog.element;
                        const id = form.querySelector('select[name="pick"]')?.value;
                        const qty = Math.max(1, parseInt(form.querySelector('input[name="qty"]')?.value, 10) || 1);
                        if (!id) return;
                        const doc = await pack.getDocument(id);
                        if (!doc) { ui.notifications.warn('Could not load the selected entry.'); return; }
                        const datas = Array.from({ length: qty }, () => {
                            const o = doc.toObject();
                            delete o._id;           // fresh id per copy — never collide with an existing item
                            return o;
                        });
                        await actor.createEmbeddedDocuments('Item', datas);
                        ui.notifications.info(`Added ${qty}× ${doc.name} to ${actor.name}.`);
                    },
                },
                { action: 'close', label: 'Close', icon: 'fa-solid fa-xmark' },
            ],
        });
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
                rollData: { actor: this.actor, item, pr: this.actor.psy?.rating },
            }),
        });
    }

    /* --------------------------------------------------------- */
    /*  Active-effect actions                                    */
    /* --------------------------------------------------------- */

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

    /* --------------------------------------------------------- */
    /*  Misc                                                     */
    /* --------------------------------------------------------- */

    static _onToggleHidden(event, target) {
        const toggleKey = target.dataset.toggle;
        target.querySelector('span')?.classList.toggle('active');
        for (const el of this.element.querySelectorAll(`.${toggleKey}`)) {
            el.style.display = (el.style.display === 'none') ? '' : 'none';
        }
        toggleUIExpanded(toggleKey);
    }
}
