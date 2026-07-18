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

test('budget checkpoint is captured after Free and Dossier but before paid pull 30 optimization', () => {
    const player = new SimulatorPlayer(1);
    player.charTickets = 120;
    player.nextBannerDossierTickets = 10;
    const charState = characterState();
    const weaponState = { issuesCount: 0, issuesSince6: 0, issuesSinceFeatured: 0, featuredGuaranteeConsumed: false };
    useRandomSequence([]);

    const result = runSingleBannerForPlayer('save_commit', player, charState, weaponState, 0, 0, 0, 1);
    const firstWalletPull = result.charPulls.find(item => item.actionPhase === 'commit');

    assert.equal(result.decisionState.dossierPullsUsed, 10);
    assert.equal(result.decisionState.dossierTickets, 0);
    assert.equal(result.decisionState.bannerPullsCount, 20);
    assert.equal(result.decisionState.preBudgetWalletPullsUsed, 10);
    assert.equal(player.totalUrgentPulls, 10);
    assert.ok(result.charPulls.slice(10, 20).every(item => item.actionPhase === 'dossier'));
    assert.ok(result.charPulls.slice(20, 40).every(item => item.actionPhase === 'optimize30'));
    assert.equal(firstWalletPull.bannerPullsCountAfter, 31);
});

test('Save & Commit only optimizes pull 30 after the pull 120 budget is approved', () => {
    const runVariant = (charTickets, optimizeDossierToUrgent) => {
        const player = new SimulatorPlayer(1);
        player.charTickets = charTickets;
        player.nextBannerDossierTickets = 10;
        const charState = characterState();
        const weaponState = { issuesCount: 0, issuesSince6: 0, issuesSinceFeatured: 0, featuredGuaranteeConsumed: false };
        useRandomSequence([]);

        const result = runSingleBannerForPlayer(
            'save_commit',
            player,
            charState,
            weaponState,
            0,
            0,
            0,
            1,
            { optimizeDossierToUrgent }
        );
        return { player, charState, result };
    };

    const insufficient = runVariant(10, true);
    assert.equal(insufficient.charState.bannerPullsCount, 20);
    assert.equal(insufficient.player.totalUrgentPulls, 0);
    assert.equal(insufficient.result.decisionState.canAfford120, false);
    assert.equal(insufficient.result.decisionState.preBudgetWalletPullsUsed, 0);

    const disabled = runVariant(120, false);
    assert.equal(disabled.charState.bannerPullsCount, 120);
    assert.equal(disabled.player.totalUrgentPulls, 10);
    assert.equal(disabled.result.decisionState.bannerPullsCount, 20);
    assert.equal(disabled.result.decisionState.preBudgetWalletPullsUsed, 0);
    assert.equal(disabled.result.charPulls.some(item => item.actionPhase === 'optimize30'), false);

    const enabled = runVariant(120, true);
    assert.equal(enabled.charState.bannerPullsCount, 120);
    assert.equal(enabled.player.totalUrgentPulls, 10);
    assert.equal(enabled.result.decisionState.bannerPullsCount, 20);
    assert.equal(enabled.result.decisionState.preBudgetWalletPullsUsed, 10);
});

test('Save & Commit skips paid optimization when one ticket short of the safe pull 120 budget', () => {
    const player = new SimulatorPlayer(1);
    player.charTickets = 94;
    player.nextBannerDossierTickets = 10;
    const charState = characterState();
    const weaponState = { issuesCount: 0, issuesSince6: 0, issuesSinceFeatured: 0, featuredGuaranteeConsumed: false };
    useRandomSequence([]);

    const result = runSingleBannerForPlayer('save_commit', player, charState, weaponState, 0, 0, 0, 1);
    assert.equal(result.decisionState.bannerPullsCount, 20);
    assert.equal(result.decisionState.worstCaseWalletCost120, 96);
    assert.equal(result.decisionState.charTickets, 95);
    assert.equal(result.decisionState.canAfford120, false);
    assert.equal(result.decisionState.preBudgetWalletPullsUsed, 0);
    assert.equal(result.charPulls.some(item => item.actionPhase === 'commit'), false);
});

test('an authorized pull 30 optimization finishes even if Featured appears on the way', () => {
    const player = new SimulatorPlayer(1);
    player.charTickets = 120;
    player.nextBannerDossierTickets = 10;
    const charState = characterState({ pity6: 59 });
    const weaponState = { issuesCount: 0, issuesSince6: 0, issuesSinceFeatured: 0, featuredGuaranteeConsumed: false };
    useRandomSequence([...Array(39).fill(0.99), 0.1]);

    const result = runSingleBannerForPlayer('save_commit', player, charState, weaponState, 0, 0, 0, 1);
    const optimizedPulls = result.charPulls.filter(item => item.actionPhase === 'optimize30');

    assert.ok(optimizedPulls.some(item => !item.isUrgent && item.isFeatured));
    assert.equal(result.decisionState.bannerPullsCount, 20);
    assert.equal(player.totalUrgentPulls, 10);
    assert.equal(optimizedPulls.length, 20);
});

test('Save & Commit and Yolo finish pull 30 when Featured is obtained at pull 20', () => {
    for (const strategyId of ['save_commit', 'yolo']) {
        const player = new SimulatorPlayer(1);
        player.charTickets = 120;
        player.nextBannerDossierTickets = 10;
        const charState = characterState({ pity6: 79 });
        const weaponState = { issuesCount: 0, issuesSince6: 0, issuesSinceFeatured: 0, featuredGuaranteeConsumed: false };
        useRandomSequence([], 0.1);

        const result = runSingleBannerForPlayer(strategyId, player, charState, weaponState, 0, 0, 0, 1);

        assert.equal(result.gotFeaturedChar, true, strategyId);
        assert.equal(charState.bannerPullsCount, 30, strategyId);
        assert.equal(player.totalUrgentPulls, 10, strategyId);
        assert.ok(result.charPulls.some(item => item.actionPhase === 'finish_milestone'), strategyId);
    }
});

test('Save & Commit (Singles) still stops exactly after Featured at pull 20', () => {
    const player = new SimulatorPlayer(1);
    player.charTickets = 120;
    player.nextBannerDossierTickets = 10;
    const charState = characterState({ pity6: 79 });
    const weaponState = { issuesCount: 0, issuesSince6: 0, issuesSinceFeatured: 0, featuredGuaranteeConsumed: false };
    useRandomSequence([], 0.1);

    const result = runSingleBannerForPlayer('save_commit_single', player, charState, weaponState, 0, 0, 0, 1);

    assert.equal(result.gotFeaturedChar, true);
    assert.equal(charState.bannerPullsCount, 20);
    assert.equal(player.totalUrgentPulls, 0);
    assert.equal(result.charPulls.some(item => item.actionPhase === 'finish_milestone'), false);
});

test('Save & Commit protects virtual next-banner pull 120 while Yolo does not', () => {
    const runVariant = (strategyId, defaultTicketIncome) => {
        const player = new SimulatorPlayer(1);
        player.charTickets = 120;
        const charState = characterState({ pity6: 30 });
        const weaponState = { issuesCount: 0, issuesSince6: 0, issuesSinceFeatured: 0, featuredGuaranteeConsumed: false };
        let hardPityCalls = 0;
        Math.random = () => {
            if (charState.pity6 === 80) {
                hardPityCalls++;
                return hardPityCalls === 1 ? 0.99 : 0.1;
            }
            return 0.99;
        };

        const result = runSingleBannerForPlayer(
            strategyId,
            player,
            charState,
            weaponState,
            0,
            0,
            0,
            1,
            {
                ticketIncomeSchedule: [0],
                defaultTicketIncome
            }
        );
        return { player, charState, result };
    };

    const blockedSave = runVariant('save_commit', 0);
    assert.equal(blockedSave.charState.bannerPullsCount, 50);
    assert.equal(blockedSave.result.decisionState.checks.finishMilestoneProtectsNext120.affordable, false);

    const protectedSave = runVariant('save_commit', 100);
    assert.equal(protectedSave.charState.bannerPullsCount, 60);
    assert.equal(protectedSave.result.decisionState.checks.finishMilestoneProtectsNext120.affordable, true);
    assert.equal(protectedSave.player.nextBannerDossierTickets, 10);

    const yolo = runVariant('yolo', 0);
    assert.equal(yolo.charState.bannerPullsCount, 60);
    assert.equal(yolo.player.nextBannerDossierTickets, 10);
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

test('Pull 60 budget check targets 60 instead of the 120 guarantee', () => {
    const player = new SimulatorPlayer(1);
    player.charTickets = 50;
    const charState = characterState();
    const weaponState = { issuesCount: 0, issuesSince6: 0, issuesSinceFeatured: 0, featuredGuaranteeConsumed: false };
    useRandomSequence([]);

    const result = runSingleBannerForPlayer(
        'pull_60',
        player,
        charState,
        weaponState,
        0,
        0,
        0,
        1,
        {
            ticketIncomeSchedule: [0],
            defaultTicketIncome: 46
        }
    );

    assert.equal(result.decisionState.budgetTargetPulls, 60);
    assert.equal(result.decisionState.budgetRequiredTickets, 48);
    assert.equal(result.decisionState.canAffordTarget, true);
    assert.equal(result.decisionState.selectedTargetPulls, 60);
    assert.equal(charState.bannerPullsCount, 60);
});

test('Pull 60 budget check falls back to pull 30 instead of skipping', () => {
    const player = new SimulatorPlayer(1);
    player.charTickets = 20;
    const charState = characterState();
    const weaponState = { issuesCount: 0, issuesSince6: 0, issuesSinceFeatured: 0, featuredGuaranteeConsumed: false };
    useRandomSequence([]);

    const result = runSingleBannerForPlayer(
        'pull_60',
        player,
        charState,
        weaponState,
        0,
        0,
        0,
        1,
        {
            ticketIncomeSchedule: [0],
            defaultTicketIncome: 46
        }
    );

    assert.equal(result.decisionState.budgetTargetPulls, 30);
    assert.equal(result.decisionState.budgetRequiredTickets, 19);
    assert.equal(result.decisionState.canAffordTarget, true);
    assert.equal(result.decisionState.selectedTargetPulls, 30);
    assert.equal(result.decisionState.fellBackTo30, true);
    assert.equal(charState.bannerPullsCount, 30);
});

test('Pull 60 only falls back to pull 30 when next-banner pull 60 remains protected', () => {
    const runVariant = (nextBannerIncome) => {
        const player = new SimulatorPlayer(1);
        player.charTickets = 20;
        const charState = characterState();
        const weaponState = { issuesCount: 0, issuesSince6: 0, issuesSinceFeatured: 0, featuredGuaranteeConsumed: false };
        useRandomSequence([]);

        const result = runSingleBannerForPlayer(
            'pull_60',
            player,
            charState,
            weaponState,
            0,
            0,
            0,
            2,
            { ticketIncomeSchedule: [0, nextBannerIncome] }
        );
        return { charState, result };
    };

    const short = runVariant(45);
    assert.equal(short.result.decisionState.checks.pull30.affordable, true);
    assert.equal(short.result.decisionState.checks.pull30ProtectsNext60.affordable, false);
    assert.equal(short.result.decisionState.selectedTargetPulls, 0);
    assert.equal(short.charState.bannerPullsCount, 10);

    const protectedRoute = runVariant(46);
    assert.equal(protectedRoute.result.decisionState.checks.pull30ProtectsNext60.affordable, true);
    assert.equal(protectedRoute.result.decisionState.selectedTargetPulls, 30);
    assert.equal(protectedRoute.charState.bannerPullsCount, 30);
});

test('Pull 60 fallback always stops at pull 30 without rechecking current pull 60', () => {
    const player = new SimulatorPlayer(1);
    player.charTickets = 47;
    const charState = characterState();
    const weaponState = { issuesCount: 0, issuesSince6: 0, issuesSinceFeatured: 0, featuredGuaranteeConsumed: false };
    useRandomSequence([
        ...Array(35).fill(0.99),
        0.05,
        0.05,
        ...Array(200).fill(0.99)
    ]);

    const result = runSingleBannerForPlayer(
        'pull_60',
        player,
        charState,
        weaponState,
        0,
        0,
        0,
        2,
        { ticketIncomeSchedule: [0, 19] }
    );

    assert.equal(result.decisionState.initialSelectedTargetPulls, 30);
    assert.equal(result.decisionState.checks.pull60At30, undefined);
    assert.equal(result.decisionState.selectedTargetPulls, 30);
    assert.equal(charState.bannerPullsCount, 30);
});

test('Pull 60 cannot borrow next-banner income to reach pull 120 now', () => {
    const player = new SimulatorPlayer(1);
    player.charTickets = 97;
    const charState = characterState();
    const weaponState = { issuesCount: 0, issuesSince6: 0, issuesSinceFeatured: 0, featuredGuaranteeConsumed: false };
    useRandomSequence([]);

    const result = runSingleBannerForPlayer(
        'pull_60',
        player,
        charState,
        weaponState,
        0,
        0,
        0,
        2,
        { ticketIncomeSchedule: [0, 100] }
    );

    assert.equal(result.decisionState.checks.pull120At60.requiredTickets, 58);
    assert.equal(result.decisionState.checks.pull120At60.availableTickets, 50);
    assert.equal(result.decisionState.checks.pull120At60.affordable, false);
    assert.equal(result.decisionState.upgradedTo120, false);
    assert.equal(charState.bannerPullsCount, 60);
});

test('Pull 60 upgrades at pull 60 when current 120 and next 60 are both protected', () => {
    const player = new SimulatorPlayer(1);
    player.charTickets = 105;
    const charState = characterState();
    const weaponState = { issuesCount: 0, issuesSince6: 0, issuesSinceFeatured: 0, featuredGuaranteeConsumed: false };
    useRandomSequence([]);

    const result = runSingleBannerForPlayer(
        'pull_60',
        player,
        charState,
        weaponState,
        0,
        0,
        0,
        2,
        { ticketIncomeSchedule: [0, 40] }
    );

    assert.equal(result.decisionState.checks.pull120At60.availableTickets, 58);
    assert.equal(result.decisionState.checks.pull120At60.futureIncome, 40);
    assert.equal(result.decisionState.checks.pull120At60.affordable, true);
    assert.equal(result.decisionState.upgradedTo120, true);
    assert.equal(charState.bannerPullsCount, 120);
});

test('Pull 60 protects a virtual next-banner pull 60 on the final simulated banner', () => {
    const player = new SimulatorPlayer(1);
    player.charTickets = 105;
    const charState = characterState();
    const weaponState = { issuesCount: 0, issuesSince6: 0, issuesSinceFeatured: 0, featuredGuaranteeConsumed: false };
    useRandomSequence([]);

    const result = runSingleBannerForPlayer(
        'pull_60',
        player,
        charState,
        weaponState,
        0,
        0,
        0,
        1,
        {
            ticketIncomeSchedule: [0],
            defaultTicketIncome: 40
        }
    );

    assert.equal(result.decisionState.checks.pull120At60.futureIncome, 40);
    assert.equal(result.decisionState.checks.pull120At60.protectedRouteRequiredTickets, 95);
    assert.equal(result.decisionState.upgradedTo120, true);
    assert.equal(charState.bannerPullsCount, 120);
});

test('Roll Meta uses a rolling 95-ticket reserve for an adjacent Meta banner', () => {
    const runWithTickets = (tickets) => {
        const player = new SimulatorPlayer(1);
        player.charTickets = tickets;
        player.metaBannersSet = new Set([1]);
        const charState = characterState();
        const weaponState = { issuesCount: 0, issuesSince6: 0, issuesSinceFeatured: 0, featuredGuaranteeConsumed: false };
        useRandomSequence([]);

        const result = runSingleBannerForPlayer(
            'roll_meta',
            player,
            charState,
            weaponState,
            0,
            0,
            0,
            2,
            { ticketIncomeSchedule: [0, 0] }
        );
        return { charState, result };
    };

    const short = runWithTickets(199);
    assert.equal(short.result.decisionState.checks.metaReserve.reserveTickets, 95);
    assert.equal(short.result.decisionState.checks.metaReserve.affordable, false);
    assert.equal(short.charState.bannerPullsCount, 10);

    const enough = runWithTickets(200);
    assert.equal(enough.result.decisionState.checks.metaReserve.affordable, true);
    assert.equal(enough.charState.bannerPullsCount, 120);
});

test('Roll Meta uses a 105-ticket reserve when an intermediate banner consumes Dossier', () => {
    const player = new SimulatorPlayer(1);
    player.charTickets = 110;
    player.metaBannersSet = new Set([2]);
    const charState = characterState();
    const weaponState = { issuesCount: 0, issuesSince6: 0, issuesSinceFeatured: 0, featuredGuaranteeConsumed: false };
    useRandomSequence([]);

    const result = runSingleBannerForPlayer(
        'roll_meta',
        player,
        charState,
        weaponState,
        0,
        0,
        0,
        3,
        { ticketIncomeSchedule: [0, 50, 50] }
    );

    assert.equal(result.decisionState.checks.metaReserve.reserveTickets, 105);
    assert.equal(result.decisionState.checks.metaReserve.futureIncome, 100);
    assert.equal(result.decisionState.checks.metaReserve.affordable, true);
    assert.equal(charState.bannerPullsCount, 120);
});

test('current Meta banner spends available tickets even without full pull 120 insurance', () => {
    const player = new SimulatorPlayer(1);
    player.charTickets = 20;
    player.metaBannersSet = new Set([0]);
    const charState = characterState();
    const weaponState = { issuesCount: 0, issuesSince6: 0, issuesSinceFeatured: 0, featuredGuaranteeConsumed: false };
    useRandomSequence([]);

    const result = runSingleBannerForPlayer(
        'roll_meta',
        player,
        charState,
        weaponState,
        0,
        0,
        0,
        2,
        { ticketIncomeSchedule: [0, 0] }
    );

    assert.equal(result.decisionState.canAfford120, false);
    assert.equal(result.decisionState.selectedTargetPulls, 120);
    assert.ok(charState.bannerPullsCount > 10);
    assert.equal(player.charTickets, 0);
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
