import assert from 'node:assert/strict';
import test from 'node:test';

import { runSingleDetailedSimulation } from '../js/single-run.js';
import {
    buildCharacterPullGroups,
    calculatePullArsenal,
    featuredCharacterHits,
    featuredWeaponHits
} from '../js/single-run-view.js';

test('character timeline compacts x10 batches and keeps Urgent in chronological order', () => {
    const run = runSingleDetailedSimulation({
        strategyId: 'save_commit',
        seed: '20260711',
        numBanners: 1,
        startingCharTickets: 180,
        startingWeaponTickets: 0,
        incomePerBanner: 44,
        weaponIncomePerBanner: 0
    });
    const groups = buildCharacterPullGroups(run.banners[0]);

    assert.deepEqual(groups.slice(0, 4).map(group => group.kind), ['standard', 'free', 'ten', 'urgent']);
    assert.equal(groups[2].entries[0].pull, 11);
    assert.equal(groups[2].entries.at(-1).pull, 30);
    assert.equal(groups[2].batchIds.size, 2);
    assert.equal(groups[3].entries.length, 10);
    assert.equal(groups[3].triggerPull, 30);
    assert.ok(groups.filter(group => group.kind === 'single').every(group => group.entries.length <= 10));
});

test('Arsenal earned by a compact group includes hidden 4-star rewards', () => {
    assert.equal(calculatePullArsenal([
        { rarity: 6 },
        { rarity: 5 },
        { rarity: 4 },
        { rarity: 4 }
    ]), 2240);
});

test('featured hit helpers expose character pity and exact weapon pull positions', () => {
    assert.deepEqual(featuredCharacterHits([
        { rarity: 6, isFeatured: true, isUrgent: false, bannerPullsCountAfter: 67, pity6Before: 65 },
        { rarity: 6, isFeatured: true, isUrgent: true }
    ]), [
        { urgent: false, pull: 67, pity: 66 },
        { urgent: true, pull: 1, pity: null }
    ]);

    assert.deepEqual(featuredWeaponHits([
        { items: [{ rarity: 4 }, { rarity: 6, isFeatured: true }], milestoneReward: null },
        { items: [{ rarity: 5 }], milestoneReward: 'featured_weapon' }
    ]), [
        { issue: 1, pull: 2, milestone: false },
        { issue: 2, pull: null, milestone: true }
    ]);
});
