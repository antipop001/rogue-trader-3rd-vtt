// BUG-Q-215 — Astropath Transcendent rolls an extra d10 on the Perils of the Warp table and
// discards one die for a more favourable (lowest) result (RT Core p.159).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { astropathPerilsResult } from '../../src/module/rolls/roll-helpers.mjs';

test('BUG-Q-215: discarding the extra wins when the originals are already lowest', () => {
    // tens=0 units=1 → 01; extra=9 only makes things worse, so keep (0,1)=1.
    assert.equal(astropathPerilsResult(0, 1, 9), 1);
});

test('BUG-Q-215: extra can replace the tens digit for a lower result', () => {
    // (tens=8, units=2) = 82; extra=1 in the tens slot → (1,2)=12 < 82, < (8,1)=81.
    assert.equal(astropathPerilsResult(8, 2, 1), 12);
});

test('BUG-Q-215: extra can replace the units digit for a lower result', () => {
    // (tens=3, units=9) = 39; extra=0 in the units slot → (3,0)=30; (0,9)=9 is lowest.
    assert.equal(astropathPerilsResult(3, 9, 0), 9);
});

test('BUG-Q-215: 00 reads as 100 (Destruction) and is avoided when any alternative exists', () => {
    // (0,0)=100 worst; extra=5 gives (5,0)=50 and (0,5)=5 — keep 5, never 100.
    assert.equal(astropathPerilsResult(0, 0, 5), 5);
});

test('BUG-Q-215: all-zero dice leave only Destruction (100)', () => {
    assert.equal(astropathPerilsResult(0, 0, 0), 100);
});

test('BUG-Q-215: result is always one of the three discard readings', () => {
    for (let t = 0; t < 10; t++) for (let u = 0; u < 10; u++) for (let x = 0; x < 10; x++) {
        const pc = (a, b) => { const v = a * 10 + b; return v === 0 ? 100 : v; };
        const candidates = [pc(t, u), pc(x, u), pc(t, x)];
        assert.equal(astropathPerilsResult(t, u, x), Math.min(...candidates));
    }
});
