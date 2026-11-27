import assert from 'node:assert/strict';
import test from 'node:test';

import * as constants from '../js/constants.js';

test('constants export expected gacha rates and thresholds', () => {
    assert.equal(constants.BASE_RATE_6STAR, 0.008);
    assert.equal(constants.BASE_RATE_5STAR, 0.08);
    assert.equal(constants.FEATURED_RATE_6STAR, 0.5);
    assert.equal(constants.OFF_RATE_LIMITED_CHANCE, 0.1);
    assert.equal(constants.SOFT_PITY_START, 65);
    assert.equal(constants.SOFT_PITY_INCREMENT, 0.05);
    assert.equal(constants.HARD_PITY_6STAR, 80);
    assert.equal(constants.FEATURED_GUARANTEE_THRESHOLD, 120);

    assert.equal(constants.PULL_30_MILESTONE, 30);
    assert.equal(constants.PULL_60_MILESTONE, 60);
    assert.equal(constants.PULL_90_MILESTONE, 90);
    assert.equal(constants.DOSSIER_TICKETS_REWARD, 10);
    assert.equal(constants.POTENTIAL_TOKEN_240_MILESTONE, 240);

    assert.equal(constants.WEAPON_RATE_6STAR, 0.04);
    assert.equal(constants.WEAPON_RATE_5STAR, 0.15);
    assert.equal(constants.WEAPON_FEATURED_RATE, 0.25);
    assert.equal(constants.WEAPON_PITY_4_ISSUES, 3);
    assert.equal(constants.WEAPON_GUARANTEE_8_ISSUES, 7);
    assert.equal(constants.WEAPON_ISSUE_PULLS, 10);
    assert.equal(constants.WEAPON_ISSUE_COST_ARSENAL, 1980);
    assert.equal(constants.WEAPON_SAVED_ISSUES_THRESHOLD, 8);

    assert.equal(constants.META_RESERVE_ADJACENT, 95);
    assert.equal(constants.META_RESERVE_INTERMEDIATE, 105);
});
