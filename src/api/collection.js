import request from '../utils/request';
import { ensureInt64Fields } from '../utils/dataFormat';

export const collectionApi = {
    // 创建收藏夹
    createCollection: (data) => {
        const processedData = {
            name: data.name,
            description: data.description || ''
        };
        console.log('创建收藏夹请求:', processedData);
        return request.post('/collection', processedData);
    },

    // 删除收藏夹
    removeCollection: (collectionId) => {
        const processedData = ensureInt64Fields({
            id: collectionId
        });
        console.log('删除收藏夹请求:', processedData);
        return request.delete(`/collection/${processedData.id}`);
    },

    // 获取用户收藏夹列表
    listCollections: (data) => {
        const processedData = {
            page_stats: {
                page: data.page || 1,
                size: data.pageSize || 20,
                sort: data.sort || 'id_desc'
            }
        };
        console.log('获取收藏夹列表请求:', processedData);
        return request.post('/collection/list', processedData);
    },

    // 更新收藏夹信息
    updateCollection: (data) => {
        const processedData = ensureInt64Fields({
            id: data.id,
            name: data.name,
            description: data.description || ''
        });
        console.log('更新收藏夹请求:', processedData);
        return request.put('/collection', processedData);
    },

    // 添加视频到收藏夹
    addVideoToCollection: (data) => {
        const processedData = ensureInt64Fields({
            collection_id: data.collectionId,
            video_id: data.videoId
        });
        console.log('添加视频到收藏夹请求:', processedData);
        return request.post('/collection/video', processedData);
    },

    // 从收藏夹移除视频
    removeVideoFromCollection: (data) => {
        const processedData = ensureInt64Fields({
            collection_id: data.collectionId,
            video_id: data.videoId
        });
        console.log('从收藏夹移除视频请求:', processedData);
        return request.delete(`/collection/${processedData.collection_id}/video/${processedData.video_id}`);
    },

    // 获取收藏夹中的视频列表
    listVideosInCollection: (data) => {
        const processedData = ensureInt64Fields({
            collection_id: data.collectionId,
            page_stats: {
                page: data.page || 1,
                size: data.pageSize || 20,
                sort: data.sort || 'id_desc'
            }
        });
        console.log('获取收藏夹视频列表请求:', processedData);
        return request.post('/collection/video/list', processedData);
    },

    // 检查视频是否已收藏
    checkVideoCollected: (videoId) => {
        // 这个需要先获取用户的收藏夹，然后检查每个收藏夹中是否有该视频
        // 或者可以扩展后端API来直接检查
        return new Promise((resolve) => {
            // 暂时返回false，后续需要根据实际情况实现
            resolve({ isCollected: false, collections: [] });
        });
    }
};
