/**
 * 数据格式化工具
 */

/**
 * 确保int64字段是整数
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
 * 格式化视频数据
 */
export const formatVideoData = (videoData) => {
    if (!videoData) return null;

    return {
        id: videoData.id || 0,
        title: videoData.title || '无标题',
        description: videoData.description || '',
        author: videoData.author?.name || '用户',
        authorId: videoData.author?.id || 0,
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

    return {
        id: commentData.id || 0,
        content: commentData.content || '',
        user: {
            id: commentData.user?.id || 0,
            name: commentData.user?.name || '用户',
            avatar: commentData.user?.avatar || '/default-avatar.png'
        },
        replyUser: commentData.replyUser ? {
            id: commentData.replyUser.id || 0,
            name: commentData.replyUser.name || '用户'
        } : null,
        likeCount: commentData.likeCount || 0,
        dislikeCount: commentData.dislikeCount || 0,
        isLiked: commentData.isLiked || false,
        isDisliked: commentData.isDisliked || false,
        date: formatRelativeTime(commentData.created_at || commentData.date),
        comments: commentData.comments ? commentData.comments.map(formatCommentData) : [],
        replyCount: commentData.replyCount || 0
    };
};

/**
 * 格式化相对时间
 */
export const formatRelativeTime = (date) => {
    if (!date) return '刚刚';

    const now = new Date();
    const targetDate = new Date(date);
    const diffInSeconds = Math.floor((now - targetDate) / 1000);

    if (diffInSeconds < 60) return '刚刚';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}分钟前`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}小时前`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}天前`;
    if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)}个月前`;
    return `${Math.floor(diffInSeconds / 31536000)}年前`;
};

/**
 * 构建评论树
 */
export const buildCommentTree = (comments) => {
    if (!Array.isArray(comments)) return [];

    const commentMap = new Map();
    const rootComments = [];

    comments.forEach(comment => {
        commentMap.set(comment.id, {
            ...comment,
            children: []
        });
    });

    commentMap.forEach(comment => {
        if (comment.parentId === 0) {
            rootComments.push(comment);
        } else {
            const parent = commentMap.get(comment.parentId);
            if (parent) {
                parent.children.push(comment);
                parent.children.sort((a, b) => new Date(a.date) - new Date(b.date));
            }
        }
    });

    rootComments.sort((a, b) => new Date(b.date) - new Date(a.date));
    return rootComments;
};


export const formatCollectionData = (collection) => {
    return {
        id: parseInt(collection.id) || 0,
        userId: parseInt(collection.user_id) || 0,
        name: collection.name || '',
        description: collection.description || '',
        videoCount: collection.videoCount || 0,
        createdAt: collection.created_at || '',
        updatedAt: collection.updated_at || ''
    };
};

export const formatVideoCollectionData = (video) => {
    const baseVideo = formatVideoData(video);
    return {
        ...baseVideo,
        isCollected: video.isCollected || false,
        collectedCount: parseInt(video.collectedCount) || 0
    };
};