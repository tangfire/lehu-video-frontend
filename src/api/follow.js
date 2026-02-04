
import request from '../utils/request';

/**
 * 关注相关API
 */
export const followApi = {
    /**
     * 关注用户
     * @param {number} userId 要关注的用户ID
     */
    addFollow: (userId) => {
        return request.post('/follow', {
            user_id: userId
        });
    },

    /**
     * 取消关注用户
     * @param {number} userId 要取消关注的用户ID
     */
    removeFollow: (userId) => {
        return request.delete(`/follow/${userId}`);
    },

    /**
     * 获取关注列表
     * @param {Object} params 参数
     * @param {number} params.userId 用户ID
     * @param {number} params.type 类型: 0=FOLLOWING, 1=FOLLOWER, 2=BOTH
     * @param {number} params.page 页码，默认1
     * @param {number} params.size 每页数量，默认20
     */
    listFollowing: (params) => {
        // 根据proto定义，构建请求体
        const requestBody = {
            user_id: params.userId,
            type: params.type || 0,
            page_stats: {
                page: params.page || 1,
                size: params.size || 20,
                sort: 'created_at_desc'
            }
        };

        return request.post('/follow/list', requestBody);
    },

    /**
     * 获取关注用户列表（我关注的）
     * @param {number} userId 用户ID
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
     * @param {number} userId 用户ID
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
     * @param {number} userId 用户ID
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
    }
};

