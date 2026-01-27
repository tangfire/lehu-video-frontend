import request from '../utils/request';

// 视频API服务
export const videoApi = {
    // 预注册上传视频
    preSign4UploadVideo: (data) => {
        console.log('预注册上传视频请求:', data);
        // 确保size是整数
        const requestData = {
            ...data,
            size: parseInt(data.size) || 0
        };
        return request.post('/video/upload', requestData);
    },

    // 预注册上传封面
    preSign4UploadCover: (data) => {
        console.log('预注册上传封面请求:', data);
        // 确保size是整数
        const requestData = {
            ...data,
            size: parseInt(data.size) || 0
        };
        return request.post('/cover/upload', requestData);
    },

    // 通用确认上传完成
    reportFinishUpload: (fileId, data = {}) => {
        console.log('报告上传完成，文件ID:', fileId);
        return request.post(`/file/${fileId}/finish`, data);
    },

    // 确认视频上传完成
    reportVideoFinishUpload: (data) => {
        console.log('确认视频上传完成请求:', data);
        return request.post('/video/finish', data);
    },

    // 刷视频（获取视频流）
    feedShortVideo: (data) => {
        // 确保int64字段是整数
        const processedData = {
            latest_time: data.latest_time ? Math.floor(data.latest_time) : Math.floor(Date.now() / 1000),
            user_id: parseInt(data.user_id) || 0,
            feed_num: parseInt(data.feed_num) || 10
        };
        console.log('发送视频流请求数据:', processedData);
        return request.post('/video/feed', processedData);
    },

    // 获取视频信息
    getVideoById: (videoId) => {
        const id = parseInt(videoId) || 0;
        console.log('获取视频详情ID:', id);
        return request.get(`/video/${id}`);
    },

    // 获取当前用户的发布视频列表
    listPublishedVideo: (data) => {
        // 确保分页参数是整数
        const processedData = {
            page_stats: {
                page: parseInt(data.page_stats?.page) || 1,
                page_size: parseInt(data.page_stats?.page_size) || 20
            }
        };
        if (data.user_id) {
            processedData.user_id = parseInt(data.user_id);
        }
        return request.post('/video/list', processedData);
    }
};