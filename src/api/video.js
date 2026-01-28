import request from '../utils/request';
import { ensureInt64Fields } from '../utils/dataFormat';

export const videoApi = {
    // 获取视频详情
    getVideoById: (id) => {
        const videoId = parseInt(id) || 0;
        console.log('获取视频详情请求，ID:', videoId);
        return request.get(`/video/${videoId}`);
    },

    // 获取视频流
    feedShortVideo: (data) => {
        const processedData = ensureInt64Fields({
            latest_time: data.latest_time,
            user_id: data.user_id || 0,
            feed_num: data.feed_num || 10
        });

        console.log('获取视频流请求:', processedData);
        return request.post('/video/feed', processedData);
    },

    // 获取用户视频列表
    getUserVideos: (userId, page = 1, pageSize = 20) => {
        const processedData = ensureInt64Fields({
            user_id: userId,
            page_stats: {
                page: parseInt(page),
                size: parseInt(pageSize),
                sort: 'date_desc'
            }
        });

        console.log('获取用户视频请求:', processedData);
        return request.post('/video/user', processedData);
    },

    // 上传视频
    uploadVideo: (formData) => {
        return request({
            url: '/video',
            method: 'POST',
            data: formData,
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
    }
};