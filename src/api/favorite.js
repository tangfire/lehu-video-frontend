// src/api/favorite.js
import request from '../utils/request';
import { ensureInt64Fields } from '../utils/dataFormat';

const favoriteApi = {
    // 通用添加收藏/点赞
    async addFavorite(params) {
        const processedData = ensureInt64Fields({
            target: params.target,
            type: params.type,
            id: String(params.id) // 确保是字符串
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

    // 检查点赞状态
    async checkFavoriteStatus(params) {
        const processedData = ensureInt64Fields({
            target: params.target,
            type: params.type,
            id: String(params.id)
        });
        return request.post('/favorite/check', processedData);
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
        return this.addFavorite({
            target: 0, // FAVORITE_TARGET_VIDEO
            type: 0,   // FAVORITE_TYPE_LIKE
            id: String(videoId)
        });
    },

    // 取消视频点赞
    async unlikeVideo(videoId) {
        return this.removeFavorite({
            target: 0, // FAVORITE_TARGET_VIDEO
            type: 0,   // FAVORITE_TYPE_LIKE
            id: String(videoId)
        });
    },

    // 视频点踩
    async dislikeVideo(videoId) {
        return this.addFavorite({
            target: 0, // FAVORITE_TARGET_VIDEO
            type: 1,   // FAVORITE_TYPE_DISLIKE
            id: String(videoId)
        });
    },

    // 取消视频点踩
    async undislikeVideo(videoId) {
        return this.removeFavorite({
            target: 0, // FAVORITE_TARGET_VIDEO
            type: 1,   // FAVORITE_TYPE_DISLIKE
            id: String(videoId)
        });
    },

    // 评论点赞
    async likeComment(commentId) {
        return this.addFavorite({
            target: 1, // FAVORITE_TARGET_COMMENT
            type: 0,   // FAVORITE_TYPE_LIKE
            id: String(commentId)
        });
    },

    // 取消评论点赞
    async unlikeComment(commentId) {
        return this.removeFavorite({
            target: 1, // FAVORITE_TARGET_COMMENT
            type: 0,   // FAVORITE_TYPE_LIKE
            id: String(commentId)
        });
    },

    // 评论点踩
    async dislikeComment(commentId) {
        return this.addFavorite({
            target: 1, // FAVORITE_TARGET_COMMENT
            type: 1,   // FAVORITE_TYPE_DISLIKE
            id: String(commentId)
        });
    },

    // 取消评论点踩
    async undislikeComment(commentId) {
        return this.removeFavorite({
            target: 1, // FAVORITE_TARGET_COMMENT
            type: 1,   // FAVORITE_TYPE_DISLIKE
            id: String(commentId)
        });
    },

    // 获取用户点赞视频列表
    async listFavoriteVideo(params) {
        const processedData = ensureInt64Fields({
            userId: params.userId || "0",
            page_stats: {
                page: params.page || 1,
                size: params.pageSize || 20
            },
            include_stats: params.includeStats || false
        });
        return request.post('/favorite/video/list', processedData);
    }
};

export { favoriteApi };
export default favoriteApi;