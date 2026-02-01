import request from '../utils/request';

// 用户API服务
export const userApi = {
    // 获取验证码
    getVerificationCode: (data) => {
        return request.post('/user/code', data);
    },

    // 注册 - 根据后端实际返回调整
    register: (data) => {
        return request.post('/user/register', data);
    },

    // 登录
    login: (data) => {
        return request.post('/user/login', data);
    },

    // 获取用户信息（用于查看其他用户信息）
    getUserInfo: (userId) => {
        return request.get('/user/info', {
            params: { user_id: userId }
        });
    },

    // 更新用户信息
    updateUserInfo: (data) => {
        return request.put('/user/info', data);
    },

    // 绑定凭证（手机/邮箱）
    bindUserVoucher: (data) => {
        return request.post('/user/voucher', data);
    },

    // 解绑凭证（手机/邮箱）
    unbindUserVoucher: (data) => {
        return request.delete('/user/voucher', { data });
    }
};

// 工具函数：判断是手机号还是邮箱
export const identifyInputType = (input) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^1[3-9]\d{9}$/; // 简单的中国手机号验证

    if (emailRegex.test(input)) {
        return 'email';
    } else if (phoneRegex.test(input)) {
        return 'mobile';
    }
    return null;
};

// VoucherType枚举
export const VoucherType = {
    PHONE: 0,
    EMAIL: 1
};

// 获取voucher类型文本
export const getVoucherTypeText = (type) => {
    return type === VoucherType.PHONE ? '手机号' : '邮箱';
};


// 更新本地存储的用户信息
export const updateLocalUserInfo = (newUserInfo) => {
    const currentUser = getCurrentUser();
    if (currentUser) {
        const updatedUser = {
            ...currentUser,
            ...newUserInfo,
            // 确保id不变
            id: currentUser.id
        };
        localStorage.setItem('userInfo', JSON.stringify(updatedUser));
        return updatedUser;
    }
    return null;
};



// 存储用户信息时也修复 mobile 字段
export const saveUserData = (token, userInfo) => {
    localStorage.setItem('token', token);

    // 确保userInfo是对象且包含id，将mobile转为字符串
    const userData = {
        id: userInfo.id || userInfo.user_id || "0",
        name: userInfo.name || '',
        avatar: userInfo.avatar || '',
        background_image: userInfo.background_image || '',
        signature: userInfo.signature || '',
        mobile: String(userInfo.mobile || ''), // 转为字符串
        email: userInfo.email || '',
        follow_count: userInfo.follow_count || userInfo.followCount || 0,
        follower_count: userInfo.follower_count || userInfo.followerCount || 0,
        total_favorited: userInfo.total_favorited || userInfo.totalFavorited || 0,
        work_count: userInfo.work_count || userInfo.workCount || 0,
        favorite_count: userInfo.favorite_count || userInfo.favoriteCount || 0
    };

    localStorage.setItem('userInfo', JSON.stringify(userData));
    return userData;
};



/**
 * 用户相关API
 */

export const getCurrentUser = () => {
    try {
        const userInfo = localStorage.getItem('userInfo');
        return userInfo ? JSON.parse(userInfo) : null;
    } catch (error) {
        console.error('获取用户信息失败:', error);
        return null;
    }
};

export const getUserDisplayName = (user) => {
    if (!user) return '用户';
    return user.name || user.username || '用户';
};

export const isLoggedIn = () => {
    const token = localStorage.getItem('token');
    const user = getCurrentUser();
    return !!(token && user);
};

export const clearUserData = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userInfo');
};