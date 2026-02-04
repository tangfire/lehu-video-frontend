import request from '../../utils/request';
import { ensureInt64Fields } from '../../utils/dataFormat';

/**
 * 关注相关API
 */
const followApi = {
    /**
     * 关注用户
     * @param {string|number} userId 要关注的用户ID
     */
    addFollow: (userId) => {
        const data = ensureInt64Fields({
            user_id: String(userId)
        });
        return request.post('/follow', data);
    },

    /**
     * 取消关注用户
     * @param {string|number} userId 要取消关注的用户ID
     */
    removeFollow: (userId) => {
        return request.delete(`/follow/${userId}`);
    },

    /**
     * 获取关注列表
     * @param {Object} params 参数
     * @param {string|number} params.userId 用户ID
     * @param {number} params.type 类型: 0=FOLLOWING, 1=FOLLOWER, 2=BOTH
     * @param {number} params.page 页码，默认1
     * @param {number} params.size 每页数量，默认20
     */
    listFollowing: (params) => {
        const requestBody = ensureInt64Fields({
            user_id: String(params.userId),
            type: params.type || 0,
            page_stats: {
                page: params.page || 1,
                size: params.size || 20
            }
        });

        return request.post('/follow/list', requestBody);
    },

    /**
     * 获取关注用户列表（我关注的）
     * @param {string|number} userId 用户ID
     * @param {number} page 页码
     * @param {number} size 每页数量
     */
    getFollowingList: (userId, page = 1, size = 20) => {
        return followApi.listFollowing({
            userId,
            type: 0, // FOLLOWING
            page,
            size
        });
    },

    /**
     * 获取粉丝列表（关注我的）
     * @param {string|number} userId 用户ID
     * @param {number} page 页码
     * @param {number} size 每页数量
     */
    getFollowerList: (userId, page = 1, size = 20) => {
        return followApi.listFollowing({
            userId,
            type: 1, // FOLLOWER
            page,
            size
        });
    },

    /**
     * 获取互相关注列表
     * @param {string|number} userId 用户ID
     * @param {number} page 页码
     * @param {number} size 每页数量
     */
    getMutualFollowList: (userId, page = 1, size = 20) => {
        return followApi.listFollowing({
            userId,
            type: 2, // BOTH
            page,
            size
        });
    },

    /**
     * 检查是否关注了用户
     * @param {string|number} targetUserId 目标用户ID
     */
    checkFollowStatus: (targetUserId) => {
        const currentUser = JSON.parse(localStorage.getItem('userInfo'));
        if (!currentUser) return Promise.resolve({ is_following: false });

        // 通过获取关注列表来检查
        return followApi.getFollowingList(currentUser.id, 1, 100)
            .then(response => {
                const isFollowing = response.users?.some(user =>
                    user.id === String(targetUserId)
                ) || false;
                return { is_following: isFollowing };
            })
            .catch(error => {
                console.error('检查关注状态失败:', error);
                return { is_following: false };
            });
    },

    /**
     * 批量检查关注状态
     * @param {Array<string|number>} userIds 用户ID数组
     */
    batchCheckFollowStatus: (userIds) => {
        const currentUser = JSON.parse(localStorage.getItem('userInfo'));
        if (!currentUser) return Promise.resolve({});

        return followApi.getFollowingList(currentUser.id, 1, 200)
            .then(response => {
                const followingIds = new Set(
                    response.users?.map(user => user.id) || []
                );

                const statusMap = {};
                userIds.forEach(userId => {
                    statusMap[userId] = followingIds.has(String(userId));
                });

                return statusMap;
            })
            .catch(error => {
                console.error('批量检查关注状态失败:', error);
                return {};
            });
    }
};

export default followApi;