// utils/request.js
import axios from 'axios';
import { clearUserData } from '../api/user';

// 创建axios实例
const request = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/v1',
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json'
    }
});

// 请求跟踪
const pendingRequests = new Map();
const requestTimers = new Map();

// 生成请求唯一标识
const generateRequestKey = (config) => {
    const url = config.url || '';
    const method = config.method || 'get';
    const methodLower = method.toLowerCase();

    // 定义读操作的 URL 关键词（可根据实际接口扩展）
    const readUrlPatterns = [
        '/video/feed',
        '/video/list',
        '/comment/video',
        '/comment/child',
        '/collection/list',
        '/friends',
        '/group/joined',
        // 如果有其他读接口，继续添加
    ];
    const isReadUrl = readUrlPatterns.some(pattern => url.includes(pattern));

    // 如果是 GET 请求，或 URL 匹配读操作列表 → 视为读请求，每次生成唯一 key
    if (methodLower === 'get' || isReadUrl) {
        return `${method}_${url}_${Date.now()}_${Math.random()}`;
    }

    // 写操作：使用原有防重逻辑（相同 key 的请求会被取消）
    const dataStr = config.data ? JSON.stringify(config.data) : '';
    const paramsStr = config.params ? JSON.stringify(config.params) : '';
    return `${method}_${url}_${dataStr}_${paramsStr}`;
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

        // 检查是否重复请求（只在非聊天请求时检查）
        const requestKey = generateRequestKey(config);
        const url = config.url || '';

        // 对于非聊天请求，保持防重逻辑
        const isChatRequest = url.includes('/conversations') ||
            url.includes('/messages') ||
            (url.includes('/conversation') && config.method?.toLowerCase() === 'post');
        const isVideoFeed = url.includes('/video/feed');

        if (!isChatRequest && !isVideoFeed && pendingRequests.has(requestKey)) {
            console.log('🔄 取消重复请求:', requestKey);
            return Promise.reject(new Error('重复请求已取消'));
        }

        // 添加请求标记（对于聊天请求，使用不同的key避免冲突）
        pendingRequests.set(requestKey, true);

        // 30秒后自动清理
        const timer = setTimeout(() => {
            pendingRequests.delete(requestKey);
            requestTimers.delete(requestKey);
        }, 30000);

        requestTimers.set(requestKey, timer);

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

        // 处理响应数据，确保ID为字符串
        const processedData = processResponseData(responseData);

        if (processedData && processedData.code === 0) {
            return processedData.data;
        } else if (processedData && processedData.code !== undefined) {
            const error = {
                code: processedData.code || -1,
                message: processedData.message || '请求失败',
                data: processedData.data,
                timestamp: processedData.timestamp
            };
            return Promise.reject(error);
        } else {
            return processedData;
        }
    },
    (error) => {
        if (error.config) {
            const requestKey = generateRequestKey(error.config);
            pendingRequests.delete(requestKey);
            const timer = requestTimers.get(requestKey);
            if (timer) {
                clearTimeout(timer);
                requestTimers.delete(requestKey);
            }
        }

        if (error.response?.status === 401) {
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
                if (key.includes('id') || key.includes('Id') || key.includes('ID')) {
                    if (typeof value === 'number') {
                        result[key] = String(value);
                    }
                }
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
                if (key.includes('id') || key.includes('Id') || key.includes('ID')) {
                    if (typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(value))) {
                        result[key] = String(value);
                    }
                }
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