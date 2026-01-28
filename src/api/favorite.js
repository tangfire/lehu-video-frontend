import request from '../utils/request';

const favoriteApi = {
    // 通用添加收藏
    async addFavorite(params) {
        return request({
            url: '/favorite',
            method: 'POST',
            data: {
                target: params.target,
                type: params.type,
                id: params.id
            }
        });
    },

    // 通用移除收藏
    async removeFavorite(params) {
        return request({
            url: '/favorite',
            method: 'DELETE',
            params: {
                target: params.target,
                type: params.type,
                id: params.id
            }
        });
    },

    // 视频点赞
    async likeVideo(videoId) {
        return this.addFavorite({
            target: 0,
            type: 0,
            id: videoId
        });
    },

    // 取消视频点赞
    async unlikeVideo(videoId) {
        return this.removeFavorite({
            target: 0,
            type: 0,
            id: videoId
        });
    },

    // 视频点踩
    async dislikeVideo(videoId) {
        return this.addFavorite({
            target: 0,
            type: 1,
            id: videoId
        });
    },

    // 取消视频点踩
    async undislikeVideo(videoId) {
        return this.removeFavorite({
            target: 0,
            type: 1,
            id: videoId
        });
    },

    // 评论点赞
    async likeComment(commentId) {
        return this.addFavorite({
            target: 1,
            type: 0,
            id: commentId
        });
    },

    // 取消评论点赞
    async unlikeComment(commentId) {
        return this.removeFavorite({
            target: 1,
            type: 0,
            id: commentId
        });
    },

    // 评论点踩
    async dislikeComment(commentId) {
        return this.addFavorite({
            target: 1,
            type: 1,
            id: commentId
        });
    },

    // 取消评论点踩
    async undislikeComment(commentId) {
        return this.removeFavorite({
            target: 1,
            type: 1,
            id: commentId
        });
    }
};

export { favoriteApi };
export default favoriteApi;