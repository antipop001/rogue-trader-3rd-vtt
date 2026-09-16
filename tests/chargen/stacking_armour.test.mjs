import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import yaml from 'js-yaml';

// Regression guard for "worn over" stacking armour (RT canon items worn OVER other armour, e.g. the
// Void Weave Cloak from Lure of the Expanse). Such armour must ADD its AP to the location like a
// cybernetic, not compete in the highest-AP-wins comparison — otherwise a low-AP cloak worn over a
// Carapace is silently discarded. `_computeArmour` (acolyte.mjs) isn't node-importable (Foundry
// globals at load), so these are source-level + data invariants.

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

test('armourPoints template declares stacksArmour (default false = non-stacking)', () => {
    const tpl = JSON.parse(read('src/template.json')).Item.templates.armourPoints;
    assert.equal(tpl.stacksArmour, false, 'armourPoints template must include stacksArmour defaulting to false');
});

test('_computeArmour adds stacking armour to total and excludes it from the max()', () => {
    const src = read('src/module/documents/acolyte.mjs');
    // a dedicated loop adds stacksArmour items to the location total (like cybernetics)
    assert.match(src, /stacksArmour\)[\s\S]{0,260}total \+= effectiveArmourAP/,
        'stacking armour must be added to the location total via effectiveArmourAP');
    // the highest-AP-wins worn loop must skip stacking items so they neither win nor lose the max
    assert.match(src, /!item\.system\.stacksArmour/,
        'the max-AP worn-armour loop must exclude stacksArmour items');
});

test('the Void Weave Cloak is flagged as stacking (worn over other armour)', () => {
    const cloak = yaml.loadAll(read('src/packs/armour/armour.yml'))
        .filter(Boolean).find((d) => d.name === 'Void Weave Cloak');
    assert.ok(cloak, 'Void Weave Cloak must exist in the armour pack');
    assert.equal(cloak.data.stacksArmour, true, 'Void Weave Cloak must set stacksArmour: true');
    // 3 AP to Body, Arms, Legs; none to Head (canon)
    assert.equal(cloak.data.armourPoints.body, 3);
    assert.equal(cloak.data.armourPoints.head, 0);
});
