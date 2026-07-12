import assert from 'node:assert/strict';
import test from 'node:test';

import { runSingleDetailedSimulation, seedToUint32 } from '../js/single-run.js';
import { calculateWorstCaseNetWalletSpent } from '../js/strategies.js';

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
    assert.ok(typeof run.summary.timesHit120Guarantee === 'number');
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

test('calculateWorstCaseNetWalletSpent calculates accurate cost with quota rebates and dossier checks', () => {
    const player = { bondQuota: 0 };

    // target 120, hasDossier = true. 
    // Gross: 120 - 10 (free) - 10 (dossier) = 100 wallet pulls.
    // Max 6-stars is 2. Guaranteed 5-stars = Math.floor((120-2)/10) = 11.
    // Guaranteed quota = 110. Rebate tickets = Math.floor(110/25) = 4.
    // Net: 100 - 4 = 96.
    const net1 = calculateWorstCaseNetWalletSpent(player, 120, true);
    assert.equal(net1, 96);

    // target 120, hasDossier = false.
    // Gross: 120 - 10 = 110 wallet pulls.
    // Net: 110 - 4 = 106.
    const net2 = calculateWorstCaseNetWalletSpent(player, 120, false);
    assert.equal(net2, 106);

    // target 60, hasDossier = true.
    // Gross: 60 - 20 = 40 wallet pulls.
    // Max 6-stars is 1. Guaranteed 5-stars = Math.floor(59/10) = 5.
    // Guaranteed quota = 50. Rebate = 2.
    // Net: 40 - 2 = 38.
    const net3 = calculateWorstCaseNetWalletSpent(player, 60, true);
    assert.equal(net3, 38);

    // target 60, hasDossier = false.
    // Gross: 60 - 10 = 50. Rebate = 2.
    // Net: 50 - 2 = 48.
    const net4 = calculateWorstCaseNetWalletSpent(player, 60, false);
    assert.equal(net4, 48);

    // Test with initial player quota
    const playerWithQuota = { bondQuota: 15 };
    // target 120, hasDossier = true.
    // Guaranteed quota = 110 + 15 = 125. Rebate = Math.floor(125/25) = 5.
    // Net: 100 - 5 = 95.
    const net5 = calculateWorstCaseNetWalletSpent(playerWithQuota, 120, true);
    assert.equal(net5, 95);
});
