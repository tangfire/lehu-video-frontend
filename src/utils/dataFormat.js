/**
 * 视频数据格式化工具
 */

/**
 * 确保int64字段是整数
 * @param {Object} data 请求数据
 * @returns {Object} 处理后的数据
 */
export const ensureInt64Fields = (data) => {
    if (!data || typeof data !== 'object') return data;

    const result = { ...data };
    const int64Fields = [
        'latest_time', 'user_id', 'feed_num', 'video_id', 'file_id',
        'id', 'favoriteCount', 'commentCount', 'collectedCount'
    ];

    Object.keys(result).forEach(key => {
        if (int64Fields.includes(key)) {
            // 如果是int64字段，确保是整数
            const value = result[key];
            if (value !== undefined && value !== null) {
                if (typeof value === 'number') {
                    result[key] = Math.floor(value);
                } else if (typeof value === 'string') {
                    const num = parseInt(value, 10);
                    result[key] = isNaN(num) ? 0 : num;
                }
            } else {
                result[key] = 0;
            }
        }
    });

    return result;
};

/**
 * 将后端视频数据转换为前端格式
 * @param {Object} videoData 后端返回的视频数据
 * @returns {Object} 前端格式的视频数据
 */
export const formatVideoData = (videoData) => {
    if (!videoData) return null;

    // 确保数字字段是整数
    const safeVideoData = ensureInt64Fields(videoData);

    return {
        id: safeVideoData.id || 0,
        title: safeVideoData.title || '无标题',
        author: safeVideoData.author?.name || '未知用户',
        authorId: safeVideoData.author?.id || 0,
        avatar: safeVideoData.author?.avatar || './default-avatar.png',
        views: 0, // 需要额外接口获取
        likes: safeVideoData.favoriteCount || 0,
        comments: safeVideoData.commentCount || 0,
        shares: 0,
        thumbnail: safeVideoData.cover_url || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
        duration: '0:00',
        uploadTime: '刚刚',
        tags: [],
        play_url: safeVideoData.play_url,
        isFavorite: Boolean(safeVideoData.isFavorite),
        isCollected: Boolean(safeVideoData.isCollected),
        isFollowing: Boolean(safeVideoData.author?.isFollowing)
    };
};

/**
 * 格式化时间戳为相对时间
 * @param {number|string} timestamp 时间戳（秒或毫秒）
 * @returns {string} 格式化后的时间
 */
export const formatRelativeTime = (timestamp) => {
    if (!timestamp) return '刚刚';

    let timeInMs;
    if (typeof timestamp === 'number') {
        // 判断是秒还是毫秒
        timeInMs = timestamp < 10000000000 ? timestamp * 1000 : timestamp;
    } else if (typeof timestamp === 'string') {
        timeInMs = new Date(timestamp).getTime();
    } else {
        return '刚刚';
    }

    const now = Date.now();
    const diff = now - timeInMs;

    if (diff < 60000) { // 1分钟内
        return '刚刚';
    } else if (diff < 3600000) { // 1小时内
        const minutes = Math.floor(diff / 60000);
        return `${minutes}分钟前`;
    } else if (diff < 86400000) { // 1天内
        const hours = Math.floor(diff / 3600000);
        return `${hours}小时前`;
    } else if (diff < 604800000) { // 1周内
        const days = Math.floor(diff / 86400000);
        return `${days}天前`;
    } else {
        const date = new Date(timeInMs);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }
};