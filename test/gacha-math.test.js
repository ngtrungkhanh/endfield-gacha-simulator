import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { rollCharacter, rollWeaponIssue } from '../js/gacha-math.js';
import { SimulatorPlayer, runSingleBannerForPlayer, shouldForceSingleNearMilestone } from '../js/strategies.js';
import { MonteCarloSimulator } from '../js/simulator.js';

const originalRandom = Math.random;

afterEach(() => {
    Math.random = originalRandom;
});

function useRandomSequence(values, fallback = 0.99) {
    const queue = [...values];
    Math.random = () => queue.length > 0 ? queue.shift() : fallback;
}

function characterState(overrides = {}) {
    return {
        pity6: 0,
        pity5: 0,
        pullsSinceFeatured: 0,
        bannerPullsCount: 0,
        guarantee120Consumed: false,
        ...overrides
    };
}

test('5★ character keeps the exact base band and is never rate-up', () => {
    useRandomSequence([0.05]);
    const result = rollCharacter(characterState());
    assert.equal(result.rarity, 5);
    assert.equal(result.isFeatured, false);

    useRandomSequence([0.09]);
    assert.equal(rollCharacter(characterState()).rarity, 4);
});

test('Urgent 5★ is never rate-up', () => {
    useRandomSequence([0.05]);
    const result = rollCharacter(characterState(), true);
    assert.equal(result.rarity, 5);
    assert.equal(result.isFeatured, false);
});

test('soft pity starts at pull 66 and hard pity triggers at pull 80', () => {
    useRandomSequence([0.05]);
    assert.equal(rollCharacter(characterState({ pity6: 64 })).rarity, 5);

    useRandomSequence([0.05, 0.9, 0.9]);
    assert.equal(rollCharacter(characterState({ pity6: 65 })).rarity, 6);

    useRandomSequence([0.99, 0.9, 0.9]);
    assert.equal(rollCharacter(characterState({ pity6: 79 })).rarity, 6);
});

test('featured guarantee 120 is consumed once per banner', () => {
    useRandomSequence([0.99]);
    const state = characterState({ pullsSinceFeatured: 119 });
    const guaranteed = rollCharacter(state);
    assert.equal(guaranteed.rarity, 6);
    assert.equal(guaranteed.isFeatured, true);
    assert.equal(state.guarantee120Consumed, true);

    state.pullsSinceFeatured = 119;
    state.pity6 = 0;
    state.pity5 = 0;
    useRandomSequence([0.99]);
    assert.equal(rollCharacter(state).rarity, 4);
});

test('weapon featured guarantee is consumed once and 5★ is not rate-up', () => {
    const state = {
        issuesCount: 0,
        issuesSince6: 0,
        issuesSinceFeatured: 7,
        featuredGuaranteeConsumed: false
    };

    useRandomSequence([]);
    const guaranteed = rollWeaponIssue(state);
    assert.equal(guaranteed.items.some(item => item.rarity === 6 && item.isFeatured), true);
    assert.equal(state.featuredGuaranteeConsumed, true);

    state.issuesSinceFeatured = 7;
    useRandomSequence([]);
    const nextIssue = rollWeaponIssue(state);
    assert.equal(nextIssue.items.some(item => item.isFeatured), false);

    const freshState = { issuesCount: 0, issuesSince6: 0, issuesSinceFeatured: 0, featuredGuaranteeConsumed: false };
    useRandomSequence([0.10]);
    const fiveStarIssue = rollWeaponIssue(freshState);
    const fiveStar = fiveStarIssue.items.find(item => item.rarity === 5);
    assert.ok(fiveStar);
    assert.equal(fiveStar.isFeatured, false);
});

test('weapon milestone rewards alternate between off-rate selectors and Featured weapons', () => {
    const state = {
        issuesCount: 0,
        issuesSince6: 0,
        issuesSinceFeatured: 0,
        featuredGuaranteeConsumed: true
    };
    const rewards = new Map();

    useRandomSequence([]);
    for (let issue = 1; issue <= 42; issue++) {
        const result = rollWeaponIssue(state);
        if (result.milestoneReward) rewards.set(issue, result.milestoneReward);
    }

    assert.deepEqual([...rewards], [
        [10, 'selector_box'],
        [18, 'featured_weapon'],
        [26, 'selector_box'],
        [34, 'featured_weapon'],
        [42, 'selector_box']
    ]);
});

test('expiring Dossier is consumed even when free pulls already found Featured', () => {
    const player = new SimulatorPlayer(1);
    player.nextBannerDossierTickets = 10;
    const charState = characterState();
    const weaponState = { issuesCount: 0, issuesSince6: 0, issuesSinceFeatured: 0, featuredGuaranteeConsumed: false };

    useRandomSequence([
        ...Array(15).fill(0.99),
        0.001, 0.1,
        ...Array(9).fill(0.99)
    ]);

    runSingleBannerForPlayer('save_commit', player, charState, weaponState, 0, 0, 0, 1);
    assert.equal(player.currentBannerDossierTickets, 0);
    assert.equal(charState.bannerPullsCount, 20);
});

test('Pull 60 counts Dossier toward its budget', () => {
    const player = new SimulatorPlayer(1);
    player.charTickets = 40;
    player.nextBannerDossierTickets = 10;
    const charState = characterState();
    const weaponState = { issuesCount: 0, issuesSince6: 0, issuesSinceFeatured: 0, featuredGuaranteeConsumed: false };
    useRandomSequence([]);

    runSingleBannerForPlayer('pull_60', player, charState, weaponState, 0, 0, 0, 1);
    assert.equal(charState.bannerPullsCount, 60);
    assert.equal(player.currentBannerDossierTickets, 0);
});

test('Pull 60 waits for 8 saved weapon Issues before pulling weapons', () => {
    const runWithArsenal = (arsenalTickets) => {
        const player = new SimulatorPlayer(1);
        player.arsenalTickets = arsenalTickets;
        const charState = characterState();
        const weaponState = { issuesCount: 0, issuesSince6: 0, issuesSinceFeatured: 0, featuredGuaranteeConsumed: false };

        useRandomSequence([
            ...Array(16).fill(0.99),
            0.001, 0.1,
            ...Array(9).fill(0.99)
        ]);

        const result = runSingleBannerForPlayer('pull_60', player, charState, weaponState, 0, 0, 0, 1);
        return { player, result };
    };

    const belowThreshold = runWithArsenal(1980);
    assert.equal(belowThreshold.result.gotFeaturedChar, true);
    assert.equal(belowThreshold.result.weaponIssues.length, 0);
    assert.ok(belowThreshold.player.arsenalTickets >= 1980);

    const atThreshold = runWithArsenal(15840);
    assert.equal(atThreshold.result.gotFeaturedChar, true);
    assert.ok(atThreshold.result.weaponIssues.length > 0);
    assert.ok(atThreshold.result.weaponIssues.length <= 8);
});

test('all strategies switch to x1 only when fewer than 10 pulls remain to 30/60/120', () => {
    const state = characterState({ milestone30Triggered: false, milestone60Triggered: false });
    assert.equal(shouldForceSingleNearMilestone(state, 20), false);
    assert.equal(shouldForceSingleNearMilestone(state, 21), true);

    state.milestone30Triggered = true;
    assert.equal(shouldForceSingleNearMilestone(state, 50), false);
    assert.equal(shouldForceSingleNearMilestone(state, 51), true);

    state.milestone60Triggered = true;
    state.pullsSinceFeatured = 110;
    assert.equal(shouldForceSingleNearMilestone(state, 60), false);
    state.pullsSinceFeatured = 111;
    assert.equal(shouldForceSingleNearMilestone(state, 60), true);
    state.guarantee120Consumed = true;
    assert.equal(shouldForceSingleNearMilestone(state, 60), false);
});

test('ownership rate counts players who obtained every unique Limited and ignores dupes', () => {
    const completed = new SimulatorPlayer(1);
    completed.ownedFeaturedCharacters = 5;
    completed.ownedFeaturedUnique = 2;
    completed.ownedFeaturedDupes = 3;
    completed.totalCharPulls = 100;
    completed.totalLimitedPulls = 40;
    completed.totalUrgentPulls = 10;

    const incomplete = new SimulatorPlayer(2);
    incomplete.ownedFeaturedCharacters = 5;
    incomplete.ownedFeaturedUnique = 1;
    incomplete.ownedFeaturedDupes = 4;
    incomplete.totalCharPulls = 100;
    incomplete.totalLimitedPulls = 40;
    incomplete.totalUrgentPulls = 10;

    const result = MonteCarloSimulator.analyzeResults([completed, incomplete], 2);
    assert.equal(result.ownershipRate, 50);
    assert.equal(result.avgPullsPerFeaturedChar, 10);
    assert.deepEqual(result.distribution, { 1: 50, 2: 50 });
});

test('120 guarantee statistic increments when the guaranteed Featured is obtained', () => {
    const player = new SimulatorPlayer(1);
    player.charTickets = 200;
    const charState = characterState();
    const weaponState = { issuesCount: 0, issuesSince6: 0, issuesSinceFeatured: 0, featuredGuaranteeConsumed: false };

    // Luôn trượt các roll tự nhiên và 50/50; hard pity 80 sẽ ra off-rate,
    // sau đó Featured chỉ xuất hiện nhờ guarantee ở pull 120.
    useRandomSequence([]);
    runSingleBannerForPlayer('save_commit_single', player, charState, weaponState, 0, 0, 0, 1);

    assert.equal(charState.bannerPullsCount, 120);
    assert.equal(player.timesHit120Guarantee, 1);
    assert.equal(player.ownedFeaturedCharacters, 1);
});

test('dynamic featured guarantee for interactive pulling', () => {
    const state = characterState({
        featuredCountThisBanner: 0,
        bannerPullsCount: 119
    });
    useRandomSequence([0.99]);
    const res1 = rollCharacter(state);
    assert.equal(res1.rarity, 6);
    assert.equal(res1.isFeatured, true);
    assert.equal(state.featuredCountThisBanner, 1);

    state.bannerPullsCount = 239;
    state.pity6 = 0;
    state.pity5 = 0;
    useRandomSequence([0.99]);
    const res2 = rollCharacter(state);
    assert.equal(res2.rarity, 6);
    assert.equal(res2.isFeatured, true);
    assert.equal(state.featuredCountThisBanner, 2);

    state.bannerPullsCount = 479;
    state.pity6 = 0;
    state.pity5 = 0;
    useRandomSequence([0.99]);
    const res3 = rollCharacter(state);
    assert.equal(res3.rarity, 6);
    assert.equal(res3.isFeatured, true);
    assert.equal(state.featuredCountThisBanner, 3);
});
