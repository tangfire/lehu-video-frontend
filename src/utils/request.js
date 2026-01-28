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

// 响应拦截器
request.interceptors.response.use(
    (response) => {
        const { data: responseData } = response;

        console.log('API响应:', {
            url: response.config.url,
            status: response.status,
            data: responseData
        });

        if (responseData && responseData.code === 0) {
            return responseData.data;
        } else {
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
        console.error('HTTP错误:', {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message,
            config: error.config
        });

        if (error.response?.status === 401) {
            console.log('Token过期，跳转到登录页');
            localStorage.removeItem('token');
            localStorage.removeItem('userInfo');
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

export default request;