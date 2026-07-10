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
 * Vẽ biểu đồ phân phối tần suất số lượng nhân vật rate-up sở hữu
 * @param {string} canvasId - ID của thẻ canvas
 * @param {Object} results - Kết quả từ MonteCarloSimulator.run
 * @param {Object} strategiesConfig - Thông tin cấu hình các chiến thuật
 */
export function drawDistributionChart(canvasId, results, strategiesConfig) {
    destroyChartIfExists(canvasId);

    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    // Tìm khoảng giá trị số nhân vật sở hữu lớn nhất để làm trục X
    let maxOwned = 0;
    Object.keys(results).forEach(strategyId => {
        const distKeys = Object.keys(results[strategyId].distribution).map(Number);
        if (distKeys.length > 0) {
            maxOwned = Math.max(maxOwned, ...distKeys);
        }
    });

    // Tạo nhãn trục X (từ 0 đến maxOwned)
    const labels = [];
    for (let i = 0; i <= maxOwned; i++) {
        labels.push(`${i} nhân vật`);
    }

    const colors = {
        save_commit: {
            border: '#ff6b00',
            bg: 'rgba(255, 107, 0, 0.6)'
        },
        yolo: {
            border: '#0077b6',
            bg: 'rgba(0, 119, 182, 0.6)'
        },
        pull_60: {
            border: '#9d4edd',
            bg: 'rgba(157, 78, 221, 0.6)'
        },
        '60_plus': {
            border: '#00b4d8',
            bg: 'rgba(0, 180, 216, 0.6)'
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
        for (let i = 0; i <= maxOwned; i++) {
            data.push(dist[i] || 0); // Lấy phần trăm người chơi trúng đúng i nhân vật
        }

        const strategyInfo = strategiesConfig[strategyId];
        const color = colors[strategyId] || { border: '#ccc', bg: 'rgba(200, 200, 200, 0.5)' };

        return {
            label: strategyInfo ? strategyInfo.name : strategyId,
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
                    text: 'Phân Phối Tỉ Lệ Sở Hữu Nhân Vật Giới Hạn',
                    color: '#ffffff',
                    font: {
                        size: 16,
                        family: 'Outfit'
                    }
                },
                legend: {
                    position: 'top',
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
                            return ` ${context.dataset.label}: ${context.raw.toFixed(2)}% người chơi`;
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
                        text: 'Phần trăm người chơi (%)',
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
 * Vẽ biểu đồ so sánh hiệu suất/hiệu quả gacha của các chiến thuật
 * @param {string} canvasId 
 * @param {Object} results 
 * @param {Object} strategiesConfig 
 */
export function drawComparisonChart(canvasId, results, strategiesConfig) {
    destroyChartIfExists(canvasId);

    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const labels = Object.keys(results).map(strategyId => {
        return strategiesConfig[strategyId] ? strategiesConfig[strategyId].name : strategyId;
    });

    // 1. Tỉ lệ trúng Featured nhân vật (%)
    const ownershipData = Object.keys(results).map(strategyId => results[strategyId].ownershipRate);
    
    // 2. Số pull trung bình để trúng 1 Featured nhân vật
    const pullsPerFeaturedData = Object.keys(results).map(strategyId => {
        const val = results[strategyId].avgPullsPerFeaturedChar;
        return val === Infinity || isNaN(val) ? 0 : val;
    });

    const ctx = canvas.getContext('2d');
    chartInstances[canvasId] = new window.Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Tỉ lệ sở hữu Featured trên mỗi banner (%)',
                    data: ownershipData,
                    backgroundColor: 'rgba(255, 107, 0, 0.7)',
                    borderColor: '#ff6b00',
                    borderWidth: 2,
                    borderRadius: 4,
                    yAxisID: 'y'
                },
                {
                    label: 'Số pull trung bình cho 1 Featured (Hiệu năng)',
                    data: pullsPerFeaturedData,
                    backgroundColor: 'rgba(157, 78, 221, 0.7)',
                    borderColor: '#9d4edd',
                    borderWidth: 2,
                    borderRadius: 4,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'So Sánh Tỉ Lệ Sở Hữu & Hiệu Năng Sử Dụng Vé',
                    color: '#ffffff',
                    font: {
                        size: 16,
                        family: 'Outfit'
                    }
                },
                legend: {
                    position: 'top',
                    labels: {
                        color: '#a0aebf',
                        font: {
                            family: 'Inter'
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
                    position: 'left',
                    grid: {
                        color: '#1f2937'
                    },
                    ticks: {
                        color: '#a0aebf',
                        callback: function(value) {
                            return value + '%';
                        }
                    },
                    title: {
                        display: true,
                        text: 'Tỉ lệ sở hữu (%)',
                        color: '#a0aebf'
                    }
                },
                y1: {
                    position: 'right',
                    grid: {
                        drawOnChartArea: false // Ẩn lưới trục Y thứ 2 để tránh rối mắt
                    },
                    ticks: {
                        color: '#a0aebf',
                        callback: function(value) {
                            return value + ' pull';
                        }
                    },
                    title: {
                        display: true,
                        text: 'Số pull trung bình',
                        color: '#a0aebf'
                    }
                }
            }
        }
    });
}
