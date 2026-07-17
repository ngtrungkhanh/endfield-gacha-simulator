import test from 'node:test';
import assert from 'node:assert/strict';

import { calculateMinimumTicketsRequired } from '../js/gacha-math.js';

function referenceCurrentBannerCost({ pity5, pity120, quota, targetRoll }) {
    let virtualTickets = Math.floor(quota / 25);
    let quotaRemainder = quota % 25;
    let minimumBalance = Math.min(0, virtualTickets);

    const grantQuota = () => {
        quotaRemainder += 10;
        virtualTickets += Math.floor(quotaRemainder / 25);
        quotaRemainder %= 25;
    };

    for (let roll = pity120 + 1; roll <= targetRoll; roll++) {
        virtualTickets--;
        minimumBalance = Math.min(minimumBalance, virtualTickets);

        pity5++;
        if (roll === 120) {
            grantQuota();
            pity5 = 0;
        } else if (pity5 === 10) {
            grantQuota();
            pity5 = 0;
        }

        if (roll === 30 && pity120 < 30) {
            grantQuota(); // 10 Urgent được nhận sau khi đã trả pull thứ 30.
        }
    }

    return Math.max(0, -minimumBalance);
}

test('minimum ticket formula matches the safe per-pull reference on current-banner boundaries', () => {
    const quotas = [0, 5, 10, 15, 20, 24];

    for (let pity5 = 0; pity5 <= 9; pity5++) {
        for (let pity120 = 0; pity120 <= 119; pity120++) {
            const targets = new Set([
                pity120,
                Math.min(120, pity120 + 1),
                Math.max(pity120, 30),
                Math.max(pity120, 60),
                120
            ]);

            for (const quota of quotas) {
                for (const targetRoll of targets) {
                    const actual = calculateMinimumTicketsRequired({
                        pity5,
                        pity120,
                        quota,
                        targetRolls: targetRoll
                    });
                    const expected = referenceCurrentBannerCost({
                        pity5,
                        pity120,
                        quota,
                        targetRoll
                    });

                    assert.equal(
                        actual,
                        expected,
                        `pity5=${pity5}, pity120=${pity120}, quota=${quota}, target=${targetRoll}`
                    );
                }
            }
        }
    }
});

test('pull 60 to 120 requires 58 current tickets in the safe formula', () => {
    assert.equal(calculateMinimumTicketsRequired({
        pity5: 0,
        pity120: 60,
        quota: 0,
        targetRolls: 120
    }), 58);
});

test('quota received on the final pull cannot pay for that pull', () => {
    assert.equal(calculateMinimumTicketsRequired({
        pity5: 9,
        pity120: 60,
        quota: 20,
        targetRolls: 61
    }), 1);
});

test('route 120 then next-banner 60 includes Standard, Free, Dossier and Urgent quota', () => {
    assert.equal(calculateMinimumTicketsRequired({
        pity5: 0,
        pity120: 60,
        quota: 0,
        targetRolls: [120, 60]
    }), 95);
});

test('future banner only receives Dossier when the previous banner reached pull 60', () => {
    assert.equal(calculateMinimumTicketsRequired({
        pity5: 0,
        pity120: 30,
        quota: 0,
        targetRolls: [30, 60]
    }), 48);
});

test('free future pulls can generate quota tickets before paid pulls start', () => {
    assert.equal(calculateMinimumTicketsRequired({
        pity5: 0,
        pity120: 60,
        quota: 20,
        targetRolls: [60, 30]
    }), 8);
});

test('future target rejects milestones below mandatory Free and Dossier pulls', () => {
    assert.throws(() => calculateMinimumTicketsRequired({
        pity5: 0,
        pity120: 60,
        quota: 0,
        targetRolls: [60, 10]
    }), /cannot be lower than 20/);
});

test('minimum ticket formula validates pity, quota and target inputs', () => {
    assert.throws(() => calculateMinimumTicketsRequired({
        pity5: 10,
        pity120: 0,
        quota: 0,
        targetRolls: 60
    }), /pity5/);

    assert.throws(() => calculateMinimumTicketsRequired({
        pity5: 0,
        pity120: 20,
        quota: -1,
        targetRolls: 60
    }), /quota/);

    assert.throws(() => calculateMinimumTicketsRequired({
        pity5: 0,
        pity120: 20,
        quota: 0,
        targetRolls: 10
    }), /cannot be lower than pity120/);
});
