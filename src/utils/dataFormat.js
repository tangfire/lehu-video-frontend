// src/utils/dataFormat.js
/**
 * 数据格式化工具
 */

/**
 * 确保int64字段是整数，ID字段是字符串
 */
export const ensureInt64Fields = (data) => {
    if (!data || typeof data !== 'object') return data;

    const result = { ...data };

    // ID字段 - 必须保持为字符串
    const stringIdFields = [
        'id', 'user_id', 'video_id', 'file_id', 'collection_id',
        'parent_id', 'reply_user_id', 'comment_id',
        'userId', 'videoId', 'collectionId', 'parentId', 'replyUserId', 'commentId'
    ];

    // int64字段 - 转换为数字
    const int64Fields = [
        'page', 'size', 'limit', 'feed_num', 'latest_time',
        'favoriteCount', 'commentCount', 'collectedCount',
        'like_count', 'dislike_count', 'reply_count'
    ];

    Object.keys(result).forEach(key => {
        const value = result[key];

        if (value === undefined || value === null) {
            return;
        }

        // 处理ID字段
        if (stringIdFields.includes(key)) {
            if (typeof value === 'number') {
                result[key] = String(value);
            } else if (typeof value === 'string') {
                // 确保空字符串转为"0"
                result[key] = value.trim() === '' ? '0' : value;
            }
        }
        // 处理int64字段
        else if (int64Fields.includes(key)) {
            if (typeof value === 'string') {
                const num = parseInt(value, 10);
                result[key] = isNaN(num) ? 0 : num;
            }
        }

        // 递归处理嵌套对象和数组
        if (Array.isArray(value)) {
            result[key] = value.map(item =>
                typeof item === 'object' && item !== null ? ensureInt64Fields(item) : item
            );
        } else if (typeof value === 'object' && value !== null) {
            result[key] = ensureInt64Fields(value);
        }
    });

    return result;
};

/**
 * 格式化视频数据
 */
export const formatVideoData = (videoData) => {
    if (!videoData) return null;

    // 提取ID字段并确保为字符串
    const videoId = videoData.id ? String(videoData.id) : "0";
    const authorId = videoData.author?.id ? String(videoData.author.id) : "0";

    return {
        id: videoId,
        title: videoData.title || '无标题',
        description: videoData.description || '',
        author: videoData.author?.name || '用户',
        authorId: authorId,
        avatar: videoData.author?.avatar || '/default-avatar.png',
        views: videoData.playCount || videoData.views || 0,
        likes: videoData.favoriteCount || videoData.likes || 0,
        dislikes: videoData.dislikeCount || videoData.dislikes || 0,
        comments: videoData.commentCount || videoData.comments || 0,
        shares: videoData.shareCount || videoData.shares || 0,
        videoUrl: videoData.play_url || videoData.videoUrl || '',
        thumbnail: videoData.cover_url || videoData.thumbnail || '',
        uploadTime: formatRelativeTime(videoData.created_at || videoData.uploadTime),
        tags: videoData.tags || [],
        isFavorite: videoData.isFavorite || false,
        isDisliked: videoData.isDisliked || false,
        isFollowing: videoData.author?.isFollowing || false,
        play_url: videoData.play_url || videoData.videoUrl || '',
        collectedCount: videoData.collectedCount || 0,
        isCollected: videoData.isCollected || false
    };
};

/**
 * 格式化评论数据
 */
export const formatCommentData = (commentData) => {
    if (!commentData) return null;

    // 提取ID字段并确保为字符串
    const commentId = commentData.id ? String(commentData.id) : "0";
    const userId = commentData.user?.id ? String(commentData.user.id) : "0";
    const replyUserId = commentData.replyUser?.id ? String(commentData.replyUser.id) : "0";
    const parentId = commentData.parent_id ? String(commentData.parent_id) : "0";

    return {
        id: commentId,
        content: commentData.content || '',
        user: {
            id: userId,
            name: commentData.user?.name || '用户',
            avatar: commentData.user?.avatar || '/default-avatar.png'
        },
        replyUser: commentData.replyUser ? {
            id: replyUserId,
            name: commentData.replyUser.name || '用户'
        } : null,
        likeCount: commentData.likeCount || 0,
        dislikeCount: commentData.dislikeCount || 0,
        isLiked: commentData.isLiked || false,
        isDisliked: commentData.isDisliked || false,
        date: formatRelativeTime(commentData.created_at || commentData.date),
        parentId: parentId,
        comments: commentData.comments ? commentData.comments.map(formatCommentData) : [],
        replyCount: commentData.replyCount || 0
    };
};

/**
 * 格式化相对时间
 */
export const formatRelativeTime = (date) => {
    if (!date) return '刚刚';

    try {
        const now = new Date();
        const targetDate = new Date(date);
        const diffInSeconds = Math.floor((now - targetDate) / 1000);

        if (diffInSeconds < 60) return '刚刚';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}分钟前`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}小时前`;
        if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}天前`;
        if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)}个月前`;
        return `${Math.floor(diffInSeconds / 31536000)}年前`;
    } catch (error) {
        return date;
    }
};