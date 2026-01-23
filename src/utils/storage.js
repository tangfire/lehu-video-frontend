// 存储用户信息
export const setUserInfo = (userInfo) => {
    localStorage.setItem('userInfo', JSON.stringify(userInfo));
};

// 获取用户信息
export const getUserInfo = () => {
    const userInfo = localStorage.getItem('userInfo');
    return userInfo ? JSON.parse(userInfo) : null;
};

// 清除用户信息
export const clearUserInfo = () => {
    localStorage.removeItem('userInfo');
    localStorage.removeItem('token');
};