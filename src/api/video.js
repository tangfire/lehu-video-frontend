// src/api/video.js
import request from '../utils/request';
import { ensureInt64Fields } from '../utils/dataFormat';

export const videoApi = {
    // 获取视频详情
    getVideoById: (id) => {
        return request.get(`/video/${id}`);
    },

    // 获取视频流
    feedShortVideo: (data) => {
        const processedData = ensureInt64Fields({
            latest_time: data.latest_time || 0,
            user_id: data.user_id || "0",
            feed_num: data.feed_num || 10
        });
        return request.post('/video/feed', processedData);
    },

    // 获取用户的发布视频列表
    listPublishedVideo: (data) => {
        const processedData = ensureInt64Fields({
            page_stats: {
                page: data.page || 1,
                size: data.pageSize || 20
            }
        });
        return request.post('/video/list', processedData);
    },

    // 上传视频预签名 - 添加application/json头
    preSign4UploadVideo: (data) => {
        const processedData = ensureInt64Fields({
            hash: data.hash,
            file_type: data.file_type || 'mp4', // 注意：字段名改为 file_type
            size: data.size,
            filename: data.filename
        });
        return request.post('/video/upload', processedData);
    },

    // 上传封面预签名
    preSign4UploadCover: (data) => {
        const processedData = ensureInt64Fields({
            hash: data.hash,
            file_type: data.file_type || 'png', // 注意：字段名改为 file_type
            size: data.size,
            filename: data.filename
        });
        return request.post('/cover/upload', processedData);
    },

    // 报告视频上传完成
    reportVideoFinishUpload: (data) => {
        const processedData = ensureInt64Fields({
            file_id: String(data.file_id),
            title: data.title,
            cover_url: data.cover_url,
            description: data.description || '',
            video_url: data.video_url
        });
        return request.post('/video/finish', processedData);
    },

    // 通用确认上传完成 - 添加application/json头
    reportFinishUpload: (fileId) => {
        return request.post(`/file/${fileId}/finish`, {}, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
};