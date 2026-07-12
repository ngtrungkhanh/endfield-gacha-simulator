import { formatNumber, strategyName, t } from './i18n.js';

/**
 * Wrapper hỗ trợ vẽ biểu đồ bằng thư viện Chart.js
 */

// Quản lý các đối tượng biểu đồ để hủy trước khi vẽ lại (tránh trùng đè)
const chartInstances = {};

/**
 * Hủy biểu đồ cũ nếu đã tồn tại trên canvas
 * @param {string} canvasId 
 */
function destroyChartIfExists(canvasId) {
    if (chartInstances[canvasId]) {
        chartInstances[canvasId].destroy();
        delete chartInstances[canvasId];
    }
}

/**
 * Cập nhật động dải trục X dựa trên các chiến thuật (datasets) đang hiển thị
 * @param {Object} chart - Đối tượng Chart.js
 */
function updateChartDistributionRange(chart) {
    let maxOwned = 0;
    let minOwned = Infinity;

    chart.data.datasets.forEach((dataset, index) => {
        if (chart.isDatasetVisible(index)) {
            const dist = dataset._fullDist;
            if (dist) {
                const distKeys = Object.keys(dist).map(Number);
                if (distKeys.length > 0) {
                    maxOwned = Math.max(maxOwned, ...distKeys);
                    minOwned = Math.min(minOwned, ...distKeys);
                }
            }
        }
    });

    if (minOwned === Infinity) {
        minOwned = 0;
        maxOwned = 0;
    }

    // Rebuild nhãn trục X
    const labels = [];
    for (let i = minOwned; i <= maxOwned; i++) {
        labels.push(t('chart.distribution.label', { count: formatNumber(i) }));
    }
    chart.data.labels = labels;

    // Rebuild dữ liệu cho từng dataset để map đúng theo nhãn trục X mới
    chart.data.datasets.forEach(dataset => {
        const dist = dataset._fullDist;
        if (dist) {
            const newData = [];
            for (let i = minOwned; i <= maxOwned; i++) {
                newData.push(dist[i] || 0);
            }
            dataset.data = newData;
        }
    });

    chart.update();
}

/**
 * Vẽ biểu đồ phân phối tần suất số lượng nhân vật rate-up sở hữu
 * @param {string} canvasId - ID của thẻ canvas
 * @param {Object} results - Kết quả từ MonteCarloSimulator.run
 * @param {Object} strategiesConfig - Thông tin cấu hình các chiến thuật
 */
export function drawDistributionChart(canvasId, results, strategiesConfig) {
    destroyChartIfExists(canvasId);

    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    // Tìm khoảng giá trị số nhân vật sở hữu nhỏ nhất và lớn nhất để làm trục X
    let maxOwned = 0;
    let minOwned = Infinity;
    Object.keys(results).forEach(strategyId => {
        const distKeys = Object.keys(results[strategyId].distribution).map(Number);
        if (distKeys.length > 0) {
            maxOwned = Math.max(maxOwned, ...distKeys);
            minOwned = Math.min(minOwned, ...distKeys);
        }
    });
    if (minOwned === Infinity) minOwned = 0;

    // Tạo nhãn trục X (từ minOwned đến maxOwned)
    const labels = [];
    for (let i = minOwned; i <= maxOwned; i++) {
        labels.push(t('chart.distribution.label', { count: formatNumber(i) }));
    }

    const colors = {
        save_commit: {
            border: '#ff6b00',
            bg: 'rgba(255, 107, 0, 0.6)'
        },
        save_commit_single: {
            border: '#2a9d8f',
            bg: 'rgba(42, 157, 143, 0.6)'
        },
        yolo: {
            border: '#0077b6',
            bg: 'rgba(0, 119, 182, 0.6)'
        },
        pull_60: {
            border: '#9d4edd',
            bg: 'rgba(157, 78, 221, 0.6)'
        },
        roll_meta: {
            border: '#ffb800',
            bg: 'rgba(255, 184, 0, 0.6)'
        }
    };

    // Tạo datasets cho từng chiến thuật
    const datasets = Object.keys(results).map(strategyId => {
        const dist = results[strategyId].distribution;
        const data = [];
        for (let i = minOwned; i <= maxOwned; i++) {
            data.push(dist[i] || 0); // Lấy phần trăm người chơi trúng đúng i nhân vật
        }

        const strategyInfo = strategiesConfig[strategyId];
        const color = colors[strategyId] || { border: '#ccc', bg: 'rgba(200, 200, 200, 0.5)' };

        return {
            label: strategyInfo ? strategyName(strategyId) : strategyId,
            _fullDist: dist,
            data: data,
            borderColor: color.border,
            backgroundColor: color.bg,
            borderWidth: 2,
            borderRadius: 4,
            hoverBackgroundColor: color.border
        };
    });

    const ctx = canvas.getContext('2d');
    chartInstances[canvasId] = new window.Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: t('chart.distribution.title'),
                    color: '#ffffff',
                    font: {
                        size: 16,
                        family: 'Outfit'
                    }
                },
                legend: {
                    position: 'top',
                    onClick: function(e, legendItem, legend) {
                        const index = legendItem.datasetIndex;
                        const ci = legend.chart;
                        if (ci.isDatasetVisible(index)) {
                            ci.hide(index);
                            legendItem.hidden = true;
                        } else {
                            ci.show(index);
                            legendItem.hidden = false;
                        }
                        updateChartDistributionRange(ci);
                    },
                    labels: {
                        color: '#a0aebf',
                        font: {
                            family: 'Inter'
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return ` ${context.dataset.label}: ${t('chart.playersPercent', { value: formatNumber(context.raw, { maximumFractionDigits: 2 }) })}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: '#1f2937'
                    },
                    ticks: {
                        color: '#a0aebf',
                        font: {
                            family: 'Inter'
                        }
                    }
                },
                y: {
                    grid: {
                        color: '#1f2937'
                    },
                    ticks: {
                        color: '#a0aebf',
                        font: {
                            family: 'Inter'
                        },
                        callback: function(value) {
                            return value + '%';
                        }
                    },
                    title: {
                        display: true,
                        text: t('chart.playersAxis'),
                        color: '#a0aebf',
                        font: {
                            family: 'Inter'
                        }
                    }
                }
            }
        }
    });
}

/**
 * Vẽ biểu đồ phân phối tần suất số lượng vũ khí rate-up sở hữu
 * @param {string} canvasId - ID của thẻ canvas
 * @param {Object} results - Kết quả từ MonteCarloSimulator.run
 * @param {Object} strategiesConfig - Thông tin cấu hình các chiến thuật
 */
export function drawWeaponDistributionChart(canvasId, results, strategiesConfig) {
    destroyChartIfExists(canvasId);

    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    // Tìm khoảng giá trị số vũ khí sở hữu nhỏ nhất và lớn nhất để làm trục X
    let maxOwned = 0;
    let minOwned = Infinity;
    Object.keys(results).forEach(strategyId => {
        const distKeys = Object.keys(results[strategyId].weaponDistribution).map(Number);
        if (distKeys.length > 0) {
            maxOwned = Math.max(maxOwned, ...distKeys);
            minOwned = Math.min(minOwned, ...distKeys);
        }
    });
    if (minOwned === Infinity) minOwned = 0;

    // Tạo nhãn trục X (từ minOwned đến maxOwned)
    const labels = [];
    for (let i = minOwned; i <= maxOwned; i++) {
        labels.push(t('chart.weaponDistribution.label', { count: formatNumber(i) }));
    }

    const colors = {
        save_commit: {
            border: '#ff6b00',
            bg: 'rgba(255, 107, 0, 0.6)'
        },
        save_commit_single: {
            border: '#2a9d8f',
            bg: 'rgba(42, 157, 143, 0.6)'
        },
        yolo: {
            border: '#0077b6',
            bg: 'rgba(0, 119, 182, 0.6)'
        },
        pull_60: {
            border: '#9d4edd',
            bg: 'rgba(157, 78, 221, 0.6)'
        },
        roll_meta: {
            border: '#ffb800',
            bg: 'rgba(255, 184, 0, 0.6)'
        }
    };

    // Tạo datasets cho từng chiến thuật
    const datasets = Object.keys(results).map(strategyId => {
        const dist = results[strategyId].weaponDistribution;
        const data = [];
        for (let i = minOwned; i <= maxOwned; i++) {
            data.push(dist[i] || 0); // Lấy phần trăm người chơi trúng đúng i vũ khí
        }

        const strategyInfo = strategiesConfig[strategyId];
        const color = colors[strategyId] || { border: '#ccc', bg: 'rgba(200, 200, 200, 0.5)' };

        return {
            label: strategyInfo ? strategyName(strategyId) : strategyId,
            _fullDist: dist,
            data: data,
            borderColor: color.border,
            backgroundColor: color.bg,
            borderWidth: 2,
            borderRadius: 4,
            hoverBackgroundColor: color.border
        };
    });

    const ctx = canvas.getContext('2d');
    chartInstances[canvasId] = new window.Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            _isWeapon: true,
            plugins: {
                title: {
                    display: true,
                    text: t('chart.weaponDistribution.title'),
                    color: '#ffffff',
                    font: {
                        size: 16,
                        family: 'Outfit'
                    }
                },
                legend: {
                    position: 'top',
                    onClick: function(e, legendItem, legend) {
                        const index = legendItem.datasetIndex;
                        const ci = legend.chart;
                        if (ci.isDatasetVisible(index)) {
                            ci.hide(index);
                            legendItem.hidden = true;
                        } else {
                            ci.show(index);
                            legendItem.hidden = false;
                        }
                        updateChartDistributionRange(ci);
                    },
                    labels: {
                        color: '#a0aebf',
                        font: {
                            family: 'Inter'
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return ` ${context.dataset.label}: ${t('chart.playersPercent', { value: formatNumber(context.raw, { maximumFractionDigits: 2 }) })}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: '#1f2937'
                    },
                    ticks: {
                        color: '#a0aebf',
                        font: {
                            family: 'Inter'
                        }
                    }
                },
                y: {
                    grid: {
                        color: '#1f2937'
                    },
                    ticks: {
                        color: '#a0aebf',
                        font: {
                            family: 'Inter'
                        },
                        callback: function(value) {
                            return value + '%';
                        }
                    },
                    title: {
                        display: true,
                        text: t('chart.playersAxis'),
                        color: '#a0aebf',
                        font: {
                            family: 'Inter'
                        }
                    }
                }
            }
        }
    });
}
