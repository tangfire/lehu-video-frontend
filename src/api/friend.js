import request from '../utils/request';

export const friendApi = {
    // 搜索用户 - 已改为POST请求
    searchUsers: (keyword, pageStats = { page: 1, page_size: 20 }) => {
        return request.post('/friends/search', {
            keyword,
            page_stats: pageStats
        });
    },

    // 发送好友申请
    sendFriendApply: (receiverId, applyReason = '') => {
        return request.post('/friend/apply', {
            receiver_id: receiverId,
            apply_reason: applyReason
        });
    },

    // 处理好友申请
    handleFriendApply: (applyId, accept) => {
        return request.put(`/friend/apply/${applyId}`, {
            accept
        });
    },

    // 获取好友申请列表
    listFriendApplies: (pageStats = { page: 1, page_size: 20 }, status) => {
        return request.post('/friend/applies', {
            page_stats: pageStats,
            status
        });
    },

    // 获取好友列表
    listFriends: (pageStats = { page: 1, page_size: 50 }, groupName) => {
        return request.post('/friends', {
            page_stats: pageStats,
            group_name: groupName
        });
    },

    // 删除好友
    deleteFriend: (friendId) => {
        return request.delete(`/friend/${friendId}`);
    },

    // 更新好友备注
    updateFriendRemark: (friendId, remark) => {
        return request.put(`/friend/${friendId}/remark`, {
            remark
        });
    },

    // 设置好友分组
    setFriendGroup: (friendId, groupName) => {
        return request.put(`/friend/${friendId}/group`, {
            group_name: groupName
        });
    },

    // 检查好友关系
    checkFriendRelation: (targetId) => {
        return request.get(`/friend/${targetId}/relation`);
    },

    // 获取用户在线状态
    getUserOnlineStatus: (userId) => {
        return request.get(`/user/${userId}/online-status`);
    },

    // 批量获取用户在线状态
    batchGetUserOnlineStatus: (userIds) => {
        return request.post('/users/online-status', {
            user_ids: userIds
        });
    }
};