import test from 'node:test';
import assert from 'node:assert/strict';

import { drawWeaponDistributionChart } from '../js/chart-helper.js';
import { setLocale } from '../js/i18n.js';

test('weapon distribution keeps localized weapon labels after legend filtering', () => {
    let chart;
    const canvas = { getContext: () => ({}) };
    globalThis.document = {
        getElementById: () => canvas,
        querySelectorAll: () => [],
        documentElement: {}
    };
    globalThis.window = {
        Chart: class {
            constructor(_ctx, config) {
                Object.assign(this, config);
                this.options = config.options;
                this.visible = config.data.datasets.map(() => true);
                chart = this;
            }
            isDatasetVisible(index) { return this.visible[index]; }
            hide(index) { this.visible[index] = false; }
            show(index) { this.visible[index] = true; }
            update() {}
            destroy() {}
        }
    };

    const results = {
        save_commit: { weaponDistribution: { 1: 40, 2: 60 } },
        yolo: { weaponDistribution: { 0: 25, 1: 75 } }
    };

    setLocale('en');
    drawWeaponDistributionChart('weapon-chart-test', results, {
        save_commit: {},
        yolo: {}
    });
    chart.options.plugins.legend.onClick(null, { datasetIndex: 0 }, { chart });
    assert.deepEqual(chart.data.labels, ['0 weapons', '1 weapons']);

    setLocale('vi');
    chart.options.plugins.legend.onClick(null, { datasetIndex: 1 }, { chart });
    assert.deepEqual(chart.data.labels, ['0 vũ khí']);

    delete globalThis.document;
    delete globalThis.window;
});
