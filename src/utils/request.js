// utils/request.js
import axios from 'axios';
import { clearUserData } from '../api/user';

// 创建axios实例
const request = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/v1',
    timeout: 30000, // 增加到30秒
    headers: {
        'Content-Type': 'application/json'
    }
});

// 请求跟踪
const pendingRequests = new Map();
const requestTimers = new Map();

// 生成请求唯一标识
const generateRequestKey = (config) => {
    return `${config.method}_${config.url}_${JSON.stringify(config.data)}_${JSON.stringify(config.params)}`;
};

// 请求拦截器
request.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // 处理请求数据，确保ID为字符串
        if (config.data) {
            config.data = processRequestData(config.data);
        }

        if (config.params) {
            config.params = processRequestData(config.params);
        }

        // 检查是否重复请求
        const requestKey = generateRequestKey(config);
        if (pendingRequests.has(requestKey)) {
            console.log('🔄 取消重复请求:', requestKey);
            return Promise.reject(new Error('重复请求已取消'));
        }

        // 添加请求标记
        pendingRequests.set(requestKey, true);

        // 30秒后自动清理
        const timer = setTimeout(() => {
            pendingRequests.delete(requestKey);
            requestTimers.delete(requestKey);
        }, 30000);

        requestTimers.set(requestKey, timer);

        console.log('🚀 API请求:', {
            url: config.url,
            method: config.method,
            data: config.data,
            params: config.params,
            headers: config.headers
        });

        return config;
    },
    (error) => {
        console.error('请求拦截器错误:', error);
        return Promise.reject(error);
    }
);

// 响应拦截器
request.interceptors.response.use(
    (response) => {
        const { data: responseData } = response;

        // 清理请求标记
        const requestKey = generateRequestKey(response.config);
        pendingRequests.delete(requestKey);
        const timer = requestTimers.get(requestKey);
        if (timer) {
            clearTimeout(timer);
            requestTimers.delete(requestKey);
        }

        console.log('✅ API响应:', {
            url: response.config.url,
            status: response.status,
            data: responseData
        });

        // 处理响应数据，确保ID为字符串
        const processedData = processResponseData(responseData);

        if (processedData && processedData.code === 0) {
            return processedData.data;
        } else if (processedData && processedData.code !== undefined) {
            // 业务错误
            const error = {
                code: processedData.code || -1,
                message: processedData.message || '请求失败',
                data: processedData.data,
                timestamp: processedData.timestamp
            };
            console.error('❌ 业务错误:', error);
            return Promise.reject(error);
        } else {
            // 没有code字段，直接返回数据
            return processedData;
        }
    },
    (error) => {
        // 清理请求标记
        if (error.config) {
            const requestKey = generateRequestKey(error.config);
            pendingRequests.delete(requestKey);
            const timer = requestTimers.get(requestKey);
            if (timer) {
                clearTimeout(timer);
                requestTimers.delete(requestKey);
            }
        }

        console.error('❌ HTTP错误:', {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            message: error.message,
            config: error.config
        });

        if (error.response?.status === 401) {
            console.log('Token过期，清除用户数据');
            clearUserData();
            setTimeout(() => {
                window.location.href = '/login';
            }, 100);
        }

        const message = error.response?.data?.message || error.message || '请求失败';
        const rejectError = {
            code: error.response?.status || 500,
            message,
            data: error.response?.data
        };

        return Promise.reject(rejectError);
    }
);

// 处理请求数据，确保ID为字符串
function processRequestData(data) {
    if (!data || typeof data !== 'object') return data;

    const process = (obj) => {
        if (Array.isArray(obj)) {
            return obj.map(item => process(item));
        }

        if (obj && typeof obj === 'object') {
            const result = { ...obj };
            Object.keys(result).forEach(key => {
                const value = result[key];

                // 处理ID字段
                if (key.includes('id') || key.includes('Id') || key.includes('ID')) {
                    if (typeof value === 'number') {
                        result[key] = String(value);
                    }
                }

                // 递归处理嵌套对象
                if (value && typeof value === 'object') {
                    result[key] = process(value);
                }
            });
            return result;
        }

        return obj;
    };

    return process(data);
}

// 处理响应数据，确保ID为字符串
function processResponseData(data) {
    if (!data || typeof data !== 'object') return data;

    const process = (obj) => {
        if (Array.isArray(obj)) {
            return obj.map(item => process(item));
        }

        if (obj && typeof obj === 'object') {
            const result = { ...obj };
            Object.keys(result).forEach(key => {
                const value = result[key];

                // 处理ID字段
                if (key.includes('id') || key.includes('Id') || key.includes('ID')) {
                    if (typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(value))) {
                        result[key] = String(value);
                    }
                }

                // 递归处理嵌套对象
                if (value && typeof value === 'object') {
                    result[key] = process(value);
                }
            });
            return result;
        }

        return obj;
    };

    return process(data);
}

// 添加取消请求的方法
export const cancelRequest = (config) => {
    const requestKey = generateRequestKey(config);
    if (pendingRequests.has(requestKey)) {
        pendingRequests.delete(requestKey);
        const timer = requestTimers.get(requestKey);
        if (timer) {
            clearTimeout(timer);
            requestTimers.delete(requestKey);
        }
    }
};

// 清除所有待处理请求
export const clearAllPendingRequests = () => {
    pendingRequests.clear();
    requestTimers.forEach(timer => clearTimeout(timer));
    requestTimers.clear();
};

export default request;