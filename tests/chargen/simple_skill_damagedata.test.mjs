import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Regression guard for the "successful skill roll silently drops / dialog sticks" bug (0.8.33).
//
// SimpleSkillData and PsychicSkillData do NOT set their own `damageData`, yet
// ActionData.calculateSuccessOrFailure() touches `this.damageData.additionalHits` on ANY
// successful roll — the Swift/Twin-Linked/Storm hit-count lines sit OUTSIDE the `if (actionItem)`
// guard — and ActionData.reset() calls `this.damageData.reset()`. If the base field is left
// undefined, a *successful* skill/characteristic roll throws
// "Cannot read properties of undefined (reading 'additionalHits')", aborting before the chat
// message is created and leaving the roll dialog stuck open. (Failed rolls take the else-branch
// and never touch it — hence the "sometimes it doesn't roll" intermittency.)
//
// action-data.mjs can't be imported under node (Foundry globals at load), so this is a
// source-level invariant: the base ActionData must default damageData so every subclass has one.

const src = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'src', 'module', 'rolls', 'action-data.mjs'),
    'utf8',
);

test('base DamageData is imported into action-data.mjs', () => {
    assert.match(src, /import\s*\{[^}]*\bDamageData\b[^}]*\}\s*from\s*['"]\.\/damage-data\.mjs['"]/,
        'DamageData must be imported so the base ActionData can default its damageData');
});

test('base ActionData defaults damageData (so SimpleSkillData/PsychicSkillData are never undefined)', () => {
    const cls = src.slice(src.indexOf('export class ActionData'), src.indexOf('export class WeaponActionData'));
    assert.ok(cls.length > 0, 'ActionData class block not found');
    assert.match(cls, /damageData\s*=\s*new\s+DamageData\s*\(\s*\)/,
        'ActionData must initialize `damageData = new DamageData()` — a bare `damageData;` leaves it '
        + 'undefined and successful skill rolls throw on this.damageData.additionalHits');
});

test('the additionalHits hit-count lines still exist outside the actionItem guard (the reason the default is required)', () => {
    // Documents *why* the default is load-bearing: these run on any successful roll.
    assert.match(src, /this\.damageData\.additionalHits\s*\+=\s*attackTalentExtraHits/,
        'the unguarded additionalHits accumulation this test protects against should still be present');
});
