const MILESTONE_PULLS = new Set([30, 60, 120]);

export function calculatePullArsenal(items) {
    return items.reduce((total, item) => {
        if (item.rarity === 6) return total + 2000;
        if (item.rarity === 5) return total + 200;
        return total + 20;
    }, 0);
}

function createGroup(kind, phase, entry) {
    return {
        kind,
        phase,
        entries: [entry],
        batchIds: new Set(entry.item.rollBatchId === null || entry.item.rollBatchId === undefined ? [] : [entry.item.rollBatchId]),
        triggerPull: kind === 'urgent' ? entry.item.bannerPullsCountAfter : null
    };
}

function canAppend(group, kind, phase) {
    if (!group || group.kind !== kind || group.phase !== phase) return false;
    if (kind === 'single' && group.entries.length >= 10) return false;
    if (kind !== 'urgent') {
        const previousPull = group.entries.at(-1)?.pull;
        if (MILESTONE_PULLS.has(previousPull)) return false;
    }
    return true;
}

function addEntry(groups, kind, phase, entry) {
    let group = groups.at(-1);
    if (!canAppend(group, kind, phase)) {
        group = createGroup(kind, phase, entry);
        groups.push(group);
        return;
    }
    group.entries.push(entry);
    if (entry.item.rollBatchId !== null && entry.item.rollBatchId !== undefined) {
        group.batchIds.add(entry.item.rollBatchId);
    }
}

export function buildCharacterPullGroups(banner) {
    const groups = [];
    const standard = banner.result.standardPulls || [];
    if (standard.length) {
        groups.push({
            kind: 'standard',
            phase: 'standard',
            entries: standard.map((item, index) => ({ item, pull: index + 1 })),
            batchIds: new Set(),
            triggerPull: null
        });
    }

    let urgentPull = 0;
    let wasUrgent = false;
    for (const item of banner.result.charPulls || []) {
        if (item.isUrgent) {
            if (!wasUrgent) urgentPull = 0;
            urgentPull++;
            addEntry(groups, 'urgent', item.actionPhase || 'urgent', { item, pull: urgentPull });
            wasUrgent = true;
            continue;
        }

        wasUrgent = false;
        const kind = item.actionPhase === 'free'
            ? 'free'
            : item.rollMode === 'x1'
                ? 'single'
                : 'ten';
        addEntry(groups, kind, item.actionPhase || 'strategy', {
            item,
            pull: item.bannerPullsCountAfter
        });
    }

    return groups;
}

export function featuredCharacterHits(items) {
    const hits = [];
    let urgentPull = 0;
    let wasUrgent = false;
    for (const item of items || []) {
        if (item.isUrgent) {
            if (!wasUrgent) urgentPull = 0;
            urgentPull++;
            wasUrgent = true;
        } else {
            wasUrgent = false;
        }
        if (!item.isFeatured || item.rarity !== 6) continue;
        hits.push({
            urgent: item.isUrgent === true,
            pull: item.isUrgent ? urgentPull : item.bannerPullsCountAfter,
            pity: item.isUrgent ? null : item.pity6Before + 1
        });
    }
    return hits;
}

export function featuredWeaponHits(issues) {
    const hits = [];
    for (let issueIndex = 0; issueIndex < (issues || []).length; issueIndex++) {
        const issue = issues[issueIndex];
        for (let itemIndex = 0; itemIndex < issue.items.length; itemIndex++) {
            const item = issue.items[itemIndex];
            if (item.rarity === 6 && item.isFeatured) {
                hits.push({
                    issue: issueIndex + 1,
                    pull: issueIndex * 10 + itemIndex + 1,
                    milestone: false
                });
            }
        }
        if (issue.milestoneReward === 'featured_weapon') {
            hits.push({
                issue: issueIndex + 1,
                pull: null,
                milestone: true
            });
        }
    }
    return hits;
}
