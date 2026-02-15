// src/api/favorite.js
import request from '../utils/request';
import { ensureInt64Fields } from '../utils/dataFormat';

const favoriteApi = {
    // 通用添加收藏/点赞
    async addFavorite(params) {
        const processedData = ensureInt64Fields({
            target: params.target,
            type: params.type,
            id: String(params.id)
        });
        return request.post('/favorite', processedData);
    },

    // 通用移除收藏/取消点赞
    async removeFavorite(params) {
        const processedData = ensureInt64Fields({
            target: params.target,
            type: params.type,
            id: String(params.id)
        });
        return request({
            url: '/favorite/del',
            method: 'post',
            data: processedData
        });
    },

    // 检查单个点赞状态
    async checkFavoriteStatus(params) {
        const processedData = ensureInt64Fields({
            target: params.target,
            type: params.type,
            id: String(params.id)
        });
        return request.post('/favorite/check', processedData);
    },

    // 批量检查点赞状态（用于评论列表）
    async batchCheckFavoriteStatus(params) {
        const promises = params.ids.map(id =>
            this.checkFavoriteStatus({
                target: params.target,
                type: 0, // type 不影响，后端会返回实际类型
                id
            }).catch(err => {
                console.warn(`获取点赞状态失败 id=${id}`, err);
                return null;
            })
        );
        const results = await Promise.all(promises);
        const statusMap = {};
        params.ids.forEach((id, index) => {
            const res = results[index];
            if (res) {
                statusMap[id] = {
                    isLiked: res.is_favorite && res.favorite_type === 0,
                    isDisliked: res.is_favorite && res.favorite_type === 1,
                    likeCount: res.total_likes || 0,
                    dislikeCount: res.total_dislikes || 0
                };
            } else {
                statusMap[id] = { isLiked: false, isDisliked: false, likeCount: 0, dislikeCount: 0 };
            }
        });
        return statusMap;
    },

    // 获取点赞统计
    async getFavoriteStats(params) {
        const processedData = ensureInt64Fields({
            target: params.target,
            id: String(params.id)
        });
        return request.post('/favorite/stats', processedData);
    },

    // 视频点赞
    async likeVideo(videoId) {
        return this.addFavorite({ target: 0, type: 0, id: String(videoId) });
    },
    async unlikeVideo(videoId) {
        return this.removeFavorite({ target: 0, type: 0, id: String(videoId) });
    },
    async dislikeVideo(videoId) {
        return this.addFavorite({ target: 0, type: 1, id: String(videoId) });
    },
    async undislikeVideo(videoId) {
        return this.removeFavorite({ target: 0, type: 1, id: String(videoId) });
    },

    // 评论点赞
    async likeComment(commentId) {
        return this.addFavorite({ target: 1, type: 0, id: String(commentId) });
    },
    async unlikeComment(commentId) {
        return this.removeFavorite({ target: 1, type: 0, id: String(commentId) });
    },
    async dislikeComment(commentId) {
        return this.addFavorite({ target: 1, type: 1, id: String(commentId) });
    },
    async undislikeComment(commentId) {
        return this.removeFavorite({ target: 1, type: 1, id: String(commentId) });
    },

    // 获取用户点赞视频列表
    async listFavoriteVideo(params) {
        const processedData = ensureInt64Fields({
            userId: params.userId || "0",
            page_stats: { page: params.page || 1, size: params.pageSize || 20 },
            include_stats: params.includeStats || false
        });
        return request.post('/favorite/video/list', processedData);
    }
};

export { favoriteApi };
export default favoriteApi;