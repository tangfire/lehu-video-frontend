import request from '../utils/request';
import { ensureInt64Fields } from '../utils/dataFormat';

// 评论API服务
export const commentApi = {
    // 创建评论
    createComment: (data) => {
        // 确保int64字段是整数
        const processedData = ensureInt64Fields({
            video_id: data.videoId,
            content: data.content,
            parent_id: data.parentId || 0,
            reply_user_id: data.replyUserId || 0
        });

        console.log('创建评论请求:', processedData);
        return request.post('/comment', processedData);
    },

    // 删除评论
    deleteComment: (commentId) => {
        const id = parseInt(commentId) || 0;
        console.log('删除评论请求，ID:', id);
        return request.delete(`/comment/${id}`);
    },

    // 获取视频评论列表
    getVideoComments: (data) => {
        // 确保int64字段是整数
        const processedData = ensureInt64Fields({
            video_id: data.videoId,
            page_stats: {
                page: parseInt(data.page || 1),
                size: parseInt(data.pageSize || 20),
                sort: data.sort || 'date_desc'
            }
        });

        console.log('获取视频评论请求:', processedData);
        return request.post('/comment/video', processedData);
    },

    // 获取子评论列表
    getChildComments: (data) => {
        // 确保int64字段是整数
        const processedData = ensureInt64Fields({
            comment_id: data.commentId,
            page_stats: {
                page: parseInt(data.page || 1),
                size: parseInt(data.pageSize || 10),
                sort: data.sort || 'date_asc'
            }
        });

        console.log('获取子评论请求:', processedData);
        return request.post('/comment/child', processedData);
    },

    // 点赞/取消点赞评论（如果后端有此功能）
    likeComment: (commentId) => {
        const id = parseInt(commentId) || 0;
        console.log('点赞评论请求，ID:', id);
        return request.post(`/comment/${id}/like`);
    },

    // 取消点赞评论
    unlikeComment: (commentId) => {
        const id = parseInt(commentId) || 0;
        console.log('取消点赞评论请求，ID:', id);
        return request.delete(`/comment/${id}/like`);
    }
};

// 评论数据格式化工具
export const formatCommentData = (commentData) => {
    if (!commentData) return null;

    const processedData = ensureInt64Fields(commentData);

    return {
        id: processedData.id || 0,
        videoId: processedData.video_id || 0,
        parentId: processedData.parent_id || 0,
        content: processedData.content || '',
        date: processedData.date || '',
        likeCount: processedData.like_count || 0,
        replyCount: processedData.reply_count || 0,
        isLiked: Boolean(processedData.is_liked),

        // 用户信息
        user: processedData.user ? {
            id: processedData.user.id || 0,
            name: processedData.user.name || '用户',
            avatar: processedData.user.avatar || './default-avatar.png',
            isFollowing: Boolean(processedData.user.is_following)
        } : null,

        // 回复用户信息
        replyUser: processedData.reply_user ? {
            id: processedData.reply_user.id || 0,
            name: processedData.reply_user.name || '用户',
            avatar: processedData.reply_user.avatar || './default-avatar.png',
            isFollowing: Boolean(processedData.reply_user.is_following)
        } : null,

        // 子评论
        comments: (processedData.comments || []).map(childComment =>
            formatCommentData(childComment)
        )
    };
};

// 格式化相对时间
export const formatCommentTime = (dateString) => {
    if (!dateString) return '刚刚';

    try {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) {
            return `${diffInSeconds}秒前`;
        } else if (diffInSeconds < 3600) {
            const minutes = Math.floor(diffInSeconds / 60);
            return `${minutes}分钟前`;
        } else if (diffInSeconds < 86400) {
            const hours = Math.floor(diffInSeconds / 3600);
            return `${hours}小时前`;
        } else if (diffInSeconds < 604800) {
            const days = Math.floor(diffInSeconds / 86400);
            return `${days}天前`;
        } else {
            return date.toLocaleDateString();
        }
    } catch (error) {
        return dateString;
    }
};

// 构建评论树
export const buildCommentTree = (comments) => {
    if (!Array.isArray(comments)) return [];

    const commentMap = new Map();
    const rootComments = [];

    // 首先将所有评论存入map
    comments.forEach(comment => {
        commentMap.set(comment.id, {
            ...comment,
            children: []
        });
    });

    // 构建树结构
    commentMap.forEach(comment => {
        if (comment.parentId === 0) {
            // 根评论
            rootComments.push(comment);
        } else {
            // 子评论
            const parent = commentMap.get(comment.parentId);
            if (parent) {
                parent.children.push(comment);
                parent.children.sort((a, b) => new Date(a.date) - new Date(b.date));
            }
        }
    });

    // 按时间倒序排序根评论
    rootComments.sort((a, b) => new Date(b.date) - new Date(a.date));

    return rootComments;
};