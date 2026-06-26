// QA-148 — boarding Command-Test modifiers (RT Core p.219-220).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boardingCommandBonus } from '../../src/module/rolls/roll-helpers.mjs';

test('QA-148: +10 per 10 crew/hull advantage + +10 per own turret', () => {
    // 35 crew advantage -> +30; 22 hull advantage -> +20; 2 turrets -> +20  = +70
    assert.equal(boardingCommandBonus({crew:135, hull:62, turrets:2}, {crew:100, hull:40}), 70);
    // no advantage (fewer crew/hull) -> only own turrets
    assert.equal(boardingCommandBonus({crew:40, hull:20, turrets:1}, {crew:100, hull:40}), 10);
    // equal -> 0 (no turrets)
    assert.equal(boardingCommandBonus({crew:50, hull:30, turrets:0}, {crew:50, hull:30}), 0);
    // partial bands floor: 19 crew adv -> +10, 9 hull adv -> +0
    assert.equal(boardingCommandBonus({crew:69, hull:39, turrets:0}, {crew:50, hull:30}), 10);
});
