import assert from 'node:assert/strict';
import test from 'node:test';

import { runSingleDetailedSimulation, seedToUint32 } from '../js/single-run.js';

const referenceConfig = {
    strategyId: 'save_commit',
    seed: '20260711',
    numBanners: 10,
    startingCharTickets: 80,
    startingWeaponTickets: 8000,
    incomePerBanner: 44,
    weaponIncomePerBanner: 500
};

test('single run is reproducible and restores Math.random', () => {
    const originalRandom = Math.random;
    const first = runSingleDetailedSimulation(referenceConfig);
    const second = runSingleDetailedSimulation(referenceConfig);

    assert.equal(Math.random, originalRandom);
    assert.deepEqual(first, second);
    assert.equal(first.config.numericSeed, 20260711);
});

test('reference seed matches the documented detailed run totals', () => {
    const run = runSingleDetailedSimulation(referenceConfig);

    assert.equal(run.banners.length, 10);
    assert.equal(run.summary.featuredCharacters, 6);
    assert.equal(run.summary.featuredWeapons, 6);
    assert.equal(run.summary.totalCharPulls, 820);
    assert.equal(run.summary.totalUrgentPulls, 90);
    assert.equal(run.summary.totalWeaponPulls, 310);
    assert.equal(run.summary.charTickets, 60);
    assert.equal(run.summary.arsenalTickets, 16440);
    assert.equal(run.summary.bondQuota, 10);
});

test('text seeds are stable 32-bit values and every strategy can run once', () => {
    assert.equal(seedToUint32('endfield'), seedToUint32('endfield'));
    assert.notEqual(seedToUint32('endfield'), seedToUint32('endfield-2'));

    for (const strategyId of ['save_commit', 'save_commit_single', 'yolo', 'pull_60', 'roll_meta']) {
        const run = runSingleDetailedSimulation({
            ...referenceConfig,
            strategyId,
            seed: `test-${strategyId}`,
            numBanners: 2
        });
        assert.equal(run.banners.length, 2, strategyId);
        assert.ok(run.summary.charTickets >= 0, strategyId);
        assert.ok(run.summary.arsenalTickets >= 0, strategyId);
    }
});
