// src/api/comment.js
import request from '../utils/request';
import { ensureInt64Fields } from '../utils/dataFormat';

export const commentApi = {
    // 创建评论
    createComment: (data) => {
        const processedData = ensureInt64Fields({
            video_id: String(data.videoId),
            content: data.content,
            parent_id: data.parentId ? String(data.parentId) : "0",
            reply_user_id: data.replyUserId ? String(data.replyUserId) : "0"
        });
        return request.post('/comment', processedData);
    },

    // 删除评论
    deleteComment: (commentId) => {
        return request.delete(`/comment/${commentId}`);
    },

    // 获取视频评论列表
    getVideoComments: (data) => {
        const processedData = ensureInt64Fields({
            video_id: String(data.videoId),
            page_stats: {
                page: data.page || 1,
                size: data.pageSize || 20
            }
        });
        return request.post('/comment/video', processedData);
    },

    // 获取子评论列表
    getChildComments: (data) => {
        const processedData = ensureInt64Fields({
            comment_id: String(data.commentId),
            page_stats: {
                page: data.page || 1,
                size: data.pageSize || 10
            }
        });
        return request.post('/comment/child', processedData);
    }
};

/**
 * 格式化评论数据
 */
export const formatCommentData = (commentData) => {
    if (!commentData) return null;

    // 确保ID是字符串
    const commentId = String(commentData.id || "0");
    const parentId = commentData.parent_id ? String(commentData.parent_id) : "0";

    // 格式化用户信息
    const formatUser = (user) => {
        if (!user) return {
            id: "0",
            name: '用户',
            avatar: '/default-avatar.png',
            is_following: false
        };

        return {
            id: String(user.id || "0"),
            name: user.name || '用户',
            avatar: user.avatar || '/default-avatar.png',
            is_following: user.is_following || false
        };
    };

    // 格式化回复用户信息
    const formatReplyUser = (replyUser) => {
        if (!replyUser) return null;

        return {
            id: String(replyUser.id || "0"),
            name: replyUser.name || '用户',
            avatar: replyUser.avatar || '/default-avatar.png'
        };
    };

    const formattedComment = {
        id: commentId,
        content: commentData.content || '',
        date: formatCommentTime(commentData.date),
        likeCount: commentData.like_count || 0,
        dislikeCount: 0, // 后端返回中没有dislike_count
        isLiked: commentData.is_liked || false,
        isDisliked: false, // 需要另外的接口获取
        parentId: parentId,
        replyCount: commentData.reply_count || 0,

        // 用户信息
        user: formatUser(commentData.user),

        // 回复用户信息
        replyUser: formatReplyUser(commentData.reply_user),

        // 子评论 - 递归格式化
        comments: []
    };

    // 递归格式化子评论
    if (commentData.comments && Array.isArray(commentData.comments)) {
        formattedComment.comments = commentData.comments.map(child => formatCommentData(child));
    }

    return formattedComment;
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
 * 构建评论树（如果后端没有返回嵌套结构，使用这个函数）
 */
export const buildCommentTree = (comments) => {
    if (!Array.isArray(comments)) return [];

    const commentMap = new Map();
    const rootComments = [];

    // 第一遍：创建所有评论的映射
    comments.forEach(comment => {
        const formattedComment = formatCommentData(comment);
        commentMap.set(formattedComment.id, {
            ...formattedComment,
            comments: []
        });
    });

    // 第二遍：构建父子关系
    comments.forEach(comment => {
        const formattedComment = formatCommentData(comment);
        const node = commentMap.get(formattedComment.id);

        if (formattedComment.parentId === "0" || !formattedComment.parentId) {
            // 根评论
            rootComments.push(node);
        } else {
            // 子评论：找到父评论
            const parent = commentMap.get(formattedComment.parentId);
            if (parent) {
                parent.comments.push(node);
            } else {
                // 如果找不到父评论，作为根评论处理
                console.warn(`找不到父评论 ${formattedComment.parentId}，将评论 ${formattedComment.id} 作为根评论`);
                rootComments.push(node);
            }
        }
    });

    // 对根评论按时间倒序排序
    rootComments.sort((a, b) => {
        try {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return dateB - dateA;
        } catch (e) {
            return 0;
        }
    });

    // 对每个父评论的子评论按时间正序排序
    rootComments.forEach(comment => {
        if (comment.comments && comment.comments.length > 0) {
            comment.comments.sort((a, b) => {
                try {
                    const dateA = new Date(a.date);
                    const dateB = new Date(b.date);
                    return dateA - dateB;
                } catch (e) {
                    return 0;
                }
            });
        }
    });

    return rootComments;
};