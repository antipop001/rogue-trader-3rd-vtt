import { RogueTraderAcolyte } from './acolyte.mjs';

export class RogueTraderNPC extends RogueTraderAcolyte {

    get subtype() {
        return this.system.type;
    }

}
