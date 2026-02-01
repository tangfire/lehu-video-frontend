// src/api/collection.js
import request from '../utils/request';
import { ensureInt64Fields } from '../utils/dataFormat';

export const collectionApi = {
    // 创建收藏夹
    createCollection: (data) => {
        const processedData = ensureInt64Fields({
            name: data.name,
            description: data.description || ''
        });
        return request.post('/collection', processedData);
    },

    // 删除收藏夹
    removeCollection: (collectionId) => {
        return request.delete(`/collection/${collectionId}`);
    },

    // 列出用户的收藏夹
    listCollections: (data) => {
        const processedData = ensureInt64Fields({
            page_stats: {
                page: data.page || 1,
                size: data.pageSize || 20
            }
        });
        return request.post('/collection/list', processedData);
    },

    // 更新收藏夹信息
    updateCollection: (data) => {
        const processedData = ensureInt64Fields({
            id: String(data.id), // 确保是字符串
            name: data.name,
            description: data.description || ''
        });
        return request.put('/collection', processedData);
    },

    // 将视频添加到收藏夹
    addVideoToCollection: (data) => {
        const processedData = ensureInt64Fields({
            collection_id: String(data.collectionId),
            video_id: String(data.videoId)
        });
        return request.post('/collection/video', processedData);
    },

    // 从收藏夹中移除视频
    removeVideoFromCollection: (data) => {
        return request.delete(`/collection/${data.collectionId}/video/${data.videoId}`);
    },

    // 列出收藏夹中的视频
    listVideosInCollection: (data) => {
        const processedData = ensureInt64Fields({
            collection_id: String(data.collectionId),
            page_stats: {
                page: data.page || 1,
                size: data.pageSize || 20
            }
        });
        return request.post('/collection/video/list', processedData);
    }
};