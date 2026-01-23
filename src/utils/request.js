import axios from 'axios';

const request = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/v1', // 注意这里有 /v1
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
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// 响应拦截器 - 适配你的统一响应格式
request.interceptors.response.use(
    (response) => {
        const { data: responseData } = response;

        // 你的响应格式: { code: 0, message: "success", data: {...}, timestamp: ... }
        if (responseData && responseData.code === 0) {
            // 成功响应，返回data字段的内容
            return responseData.data;
        } else {
            // 业务错误，返回reject
            return Promise.reject({
                code: responseData.code || -1,
                message: responseData.message || '请求失败',
                data: responseData.data
            });
        }
    },
    (error) => {
        // HTTP错误（网络错误、超时、状态码错误等）
        if (error.response?.status === 401) {
            // token过期，跳转到登录页
            localStorage.removeItem('token');
            localStorage.removeItem('userInfo');
            window.location.href = '/login';
        }

        // 统一的错误处理
        const message = error.response?.data?.message || error.message || '请求失败';
        return Promise.reject({
            code: error.response?.status || 500,
            message,
            data: error.response?.data
        });
    }
);

export default request;