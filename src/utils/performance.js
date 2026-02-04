// utils/performance.js
class PerformanceMonitor {
    constructor() {
        this.requests = new Map();
        this.warnings = new Set();
        this.enabled = true;
    }

    // 开始监控请求
    startRequest(url, method) {
        if (!this.enabled) return;

        const key = `${method}_${url}`;
        const now = Date.now();
        const record = this.requests.get(key) || {
            count: 0,
            lastTime: 0,
            durations: []
        };

        record.count++;
        record.lastTime = now;
        record.currentStart = now;

        this.requests.set(key, record);

        // 高频请求警告
        if (record.count > 10 && now - record.lastTime < 10000) {
            const warningKey = `high_freq_${key}`;
            if (!this.warnings.has(warningKey)) {
                console.warn(`⚠️ 高频请求警告: ${method} ${url} 在短时间内被调用了 ${record.count} 次`);
                this.warnings.add(warningKey);
            }
        }
    }

    // 结束监控请求
    endRequest(url, method) {
        if (!this.enabled) return;

        const key = `${method}_${url}`;
        const record = this.requests.get(key);
        if (!record || !record.currentStart) return;

        const duration = Date.now() - record.currentStart;
        record.durations.push(duration);
        record.currentStart = null;

        // 只保留最近10次记录
        if (record.durations.length > 10) {
            record.durations.shift();
        }

        // 慢请求警告
        if (duration > 3000) {
            console.warn(`⚠️ 慢请求警告: ${method} ${url} 耗时 ${duration}ms`);
        }

        // 计算平均耗时
        if (record.durations.length >= 5) {
            const avg = record.durations.reduce((a, b) => a + b, 0) / record.durations.length;
            if (avg > 2000) {
                console.warn(`⚠️ 平均耗时过高: ${method} ${url} 平均耗时 ${avg.toFixed(2)}ms`);
            }
        }
    }

    // 获取性能报告
    getReport() {
        const report = {
            totalRequests: 0,
            highFrequencyWarnings: 0,
            slowRequestWarnings: 0,
            averageDurations: {}
        };

        for (const [key, record] of this.requests) {
            report.totalRequests += record.count;
            if (record.durations.length > 0) {
                const avg = record.durations.reduce((a, b) => a + b, 0) / record.durations.length;
                report.averageDurations[key] = avg.toFixed(2);
            }
        }

        report.highFrequencyWarnings = this.warnings.size;

        return report;
    }

    // 重置监控
    reset() {
        this.requests.clear();
        this.warnings.clear();
    }

    // 启用/禁用监控
    setEnabled(enabled) {
        this.enabled = enabled;
    }
}

export const performanceMonitor = new PerformanceMonitor();