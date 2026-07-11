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

test('ownership and efficiency use unique Featured and Limited pulls', () => {
    const player = new SimulatorPlayer(1);
    player.ownedFeaturedCharacters = 3;
    player.ownedFeaturedUnique = 1;
    player.totalCharPulls = 100;
    player.totalLimitedPulls = 40;

    const result = MonteCarloSimulator.analyzeResults([player], 2);
    assert.equal(result.ownershipRate, 50);
    assert.equal(result.avgPullsPerFeaturedChar, 40 / 3);
    assert.deepEqual(result.distribution, { 1: 100 });
});
