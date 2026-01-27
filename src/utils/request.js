import axios from 'axios';

const request = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/v1',
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json'
    }
});

// 请求拦截器
request.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // 调试日志
        console.log('API请求:', {
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

// 响应拦截器 - 适配统一响应格式
request.interceptors.response.use(
    (response) => {
        const { data: responseData } = response;

        console.log('API响应:', {
            url: response.config.url,
            status: response.status,
            data: responseData
        });

        // 你的响应格式: { code: 0, message: "success", data: {...}, timestamp: ... }
        if (responseData && responseData.code === 0) {
            // 成功响应，返回data字段的内容
            return responseData.data;
        } else {
            // 业务错误，返回reject
            const error = {
                code: responseData.code || -1,
                message: responseData.message || '请求失败',
                data: responseData.data,
                timestamp: responseData.timestamp
            };
            console.error('业务错误:', error);
            return Promise.reject(error);
        }
    },
    (error) => {
        // HTTP错误（网络错误、超时、状态码错误等）
        console.error('HTTP错误:', {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message,
            config: error.config
        });

        if (error.response?.status === 401) {
            // token过期，跳转到登录页
            console.log('Token过期，跳转到登录页');
            localStorage.removeItem('token');
            localStorage.removeItem('userInfo');
            setTimeout(() => {
                window.location.href = '/login';
            }, 100);
        }

        // 统一的错误处理
        const message = error.response?.data?.message || error.message || '请求失败';
        const rejectError = {
            code: error.response?.status || 500,
            message,
            data: error.response?.data
        };

        return Promise.reject(rejectError);
    }
);

export default request;