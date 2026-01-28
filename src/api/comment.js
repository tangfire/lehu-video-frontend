// src/api/comment.js
import request from '../utils/request';

export const commentApi = {
    // 创建评论
    createComment: (data) => {
        return request.post('/comment', {
            video_id: data.videoId,
            content: data.content,
            parent_id: data.parentId || 0,
            reply_user_id: data.replyUserId || 0
        });
    },

    // 删除评论
    deleteComment: (commentId) => {
        return request.delete(`/comment/${commentId}`);
    },

    // 获取视频评论列表
    getVideoComments: (data) => {
        return request.post('/comment/video', {
            video_id: data.videoId,
            page_stats: {
                page: data.page || 1,
                size: data.pageSize || 20,
                sort: data.sort || 'date_desc'
            }
        });
    },

    // 获取子评论列表
    getChildComments: (data) => {
        return request.post('/comment/child', {
            comment_id: data.commentId,
            page_stats: {
                page: data.page || 1,
                size: data.pageSize || 10,
                sort: data.sort || 'date_asc'
            }
        });
    }
};

/**
 * 格式化评论数据
 */
export const formatCommentData = (commentData) => {
    if (!commentData) return null;

    return {
        id: commentData.id || commentData.comment_id || 0,
        content: commentData.content || '',
        date: formatCommentTime(commentData.created_at || commentData.date),
        likeCount: commentData.like_count || commentData.likeCount || 0,
        dislikeCount: commentData.dislike_count || commentData.dislikeCount || 0,
        isLiked: Boolean(commentData.is_liked || commentData.isLiked),
        isDisliked: Boolean(commentData.is_disliked || commentData.isDisliked),
        parentId: commentData.parent_id || commentData.parentId || 0,

        // 用户信息
        user: commentData.user || commentData.user_info ? {
            id: (commentData.user?.id || commentData.user_info?.id || 0),
            name: (commentData.user?.name || commentData.user_info?.name || '用户'),
            avatar: (commentData.user?.avatar || commentData.user_info?.avatar || '/default-avatar.png')
        } : {
            id: 0,
            name: '用户',
            avatar: '/default-avatar.png'
        },

        // 回复用户信息
        replyUser: commentData.reply_user || commentData.replyUser ? {
            id: (commentData.reply_user?.id || commentData.replyUser?.id || 0),
            name: (commentData.reply_user?.name || commentData.replyUser?.name || '用户')
        } : null,

        // 子评论
        comments: (commentData.comments || []).map(child => formatCommentData(child))
    };
};

/**
 * 格式化评论时间
 */
export const formatCommentTime = (dateString) => {
    if (!dateString) return '刚刚';

    try {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return `${diffInSeconds}秒前`;
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}分钟前`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}小时前`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}天前`;

        // 超过一周显示具体日期
        return date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch (error) {
        return dateString;
    }
};

/**
 * 构建评论树
 */
export const buildCommentTree = (comments) => {
    if (!Array.isArray(comments)) return [];

    const commentMap = new Map();
    const rootComments = [];

    // 第一遍：创建所有评论的映射
    comments.forEach(comment => {
        commentMap.set(comment.id, {
            ...comment,
            comments: []
        });
    });

    // 第二遍：构建父子关系
    comments.forEach(comment => {
        const node = commentMap.get(comment.id);

        if (comment.parentId === 0) {
            // 根评论
            rootComments.push(node);
        } else {
            // 子评论：找到父评论
            const parent = commentMap.get(comment.parentId);
            if (parent) {
                parent.comments.push(node);
            } else {
                // 如果找不到父评论，作为根评论处理
                console.warn(`找不到父评论 ${comment.parentId}，将评论 ${comment.id} 作为根评论`);
                rootComments.push(node);
            }
        }
    });

    // 对根评论按时间倒序排序
    rootComments.sort((a, b) => new Date(b.date) - new Date(a.date));

    // 对每个父评论的子评论按时间正序排序
    rootComments.forEach(comment => {
        if (comment.comments && comment.comments.length > 0) {
            comment.comments.sort((a, b) => new Date(a.date) - new Date(b.date));
        }
    });

    return rootComments;
};