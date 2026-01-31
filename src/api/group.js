import request from '../utils/request';

export const groupApi = {
    // 创建群聊
    createGroup: (data) => {
        return request.post('/group', data);
    },

    // 获取我创建的群聊
    loadMyGroup: (pageStats = { page: 1, page_size: 20 }) => {
        return request.post('/group/my', {
            page_stats: pageStats
        });
    },

    // 检查群聊加群方式
    checkGroupAddMode: (groupId) => {
        return request.get(`/group/${groupId}/add-mode`);
    },

    // 直接进群
    enterGroupDirectly: (groupId) => {
        return request.post(`/group/${groupId}/enter`);
    },

    // 申请加群
    applyJoinGroup: (groupId, applyReason = '') => {
        return request.post(`/group/${groupId}/apply`, {
            apply_reason: applyReason
        });
    },

    // 退群
    leaveGroup: (groupId) => {
        return request.delete(`/group/${groupId}/leave`);
    },

    // 解散群聊
    dismissGroup: (groupId) => {
        return request.delete(`/group/${groupId}`);
    },

    // 获取群聊信息
    getGroupInfo: (groupId) => {
        return request.get(`/group/${groupId}`);
    },

    // 获取我加入的群聊
    listMyJoinedGroups: (pageStats = { page: 1, page_size: 20 }) => {
        return request.post('/group/joined', {
            page_stats: pageStats
        });
    }
};