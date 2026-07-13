import { AcolyteSheetV2 } from './acolyte-sheet-v2.mjs';

/**
 * ApplicationV2 NPC sheet. Inherits all acolyte action handlers, tab activation,
 * and the homeworld-change prompt (which is a no-op when the NPC template doesn't
 * render a homeworld select). Only the rendered template and the frame `npc` class
 * differ — everything else is shared with the acolyte sheet.
 */
export class NpcSheetV2 extends AcolyteSheetV2 {

    static DEFAULT_OPTIONS = {
        classes: ['rogue-trader-3rd', 'sheet', 'actor', 'npc'],
        position: { width: 1000, height: 750, top: 80, left: 120 },
    };

    static PARTS = {
        body: {
            template: 'systems/rogue-trader-3rd/templates/actor/actor-npc-sheet.hbs',
            root: true,
            scrollable: ['.rt-body'],
        },
    };

    // The NPC template keeps the legacy tab set (combat/main/gear/psychic); its
    // initial tab must stay 'main' rather than inherit the Explorer's 'character'.
    tabGroups = { primary: 'main' };
}
