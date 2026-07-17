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
test('reference seed produces stable detailed run totals', () => {
    const run = runSingleDetailedSimulation(referenceConfig);

    assert.equal(run.banners.length, 10);
    assert.equal(run.summary.featuredCharacters, 6);
    assert.equal(run.summary.featuredWeapons, 5);
    assert.equal(run.summary.totalCharPulls, 760);
    assert.equal(run.summary.totalUrgentPulls, 60);
    assert.equal(run.summary.totalDossierPulls, 50);
    assert.equal(run.summary.totalWeaponPulls, 260);
    assert.equal(run.summary.charTickets, 115);
    assert.equal(run.summary.arsenalTickets, 22200);
    assert.equal(run.summary.bondQuota, 5);
    assert.ok(typeof run.summary.timesHit120Guarantee === 'number');
    assert.equal(
        run.summary.offBannerStandard6,
        run.banners.reduce((total, banner) => total + banner.limitedCounts.standard6, 0)
    );
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

test('pull_60 strategy upgrades target to 120 pulls conditionally if budget allows', () => {
    let triggeredUpgraded = false;
    for (let i = 0; i < 15; i++) {
        const run = runSingleDetailedSimulation({
            strategyId: 'pull_60',
            seed: `seed-pull-60-upg-${i}`,
            numBanners: 2,
            startingCharTickets: 400,
            startingWeaponTickets: 0,
            incomePerBanner: 50,
            weaponIncomePerBanner: 0
        });
        for (const banner of run.banners) {
            const pulls = banner.result.charPulls || [];
            if (pulls.some(p => p.actionPhase === 'strategy_upgraded')) {
                triggeredUpgraded = true;
            }
        }
    }
    assert.ok(triggeredUpgraded, 'Should have triggered strategy_upgraded at least once in 15 runs with abundant budget');
});

test('meta banners are randomly selected and seed-reproducible', () => {
    const config1 = {
        strategyId: 'roll_meta',
        seed: 'fixed-seed-meta-123',
        numBanners: 10,
        numMetaBanners: 3,
        startingCharTickets: 100,
        startingWeaponTickets: 0,
        incomePerBanner: 50,
        weaponIncomePerBanner: 0
    };

    const run1 = runSingleDetailedSimulation(config1);
    const run2 = runSingleDetailedSimulation(config1);

    // Verify reproducibility
    assert.deepEqual(run1.banners[0].after.metaBannersSet, run2.banners[0].after.metaBannersSet);

    // Verify randomness by comparing with another seed
    const config2 = {
        ...config1,
        seed: 'fixed-seed-meta-456'
    };
    const run3 = runSingleDetailedSimulation(config2);
    
    const set1 = Array.from(run1.banners[0].after.metaBannersSet || []);
    const set3 = Array.from(run3.banners[0].after.metaBannersSet || []);
    
    // Check they are not identical arrays
    assert.notDeepEqual(set1.sort(), set3.sort());
});
