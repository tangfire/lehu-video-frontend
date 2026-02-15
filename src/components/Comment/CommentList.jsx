// src/components/Comment/CommentList.jsx
import React, { useState, useEffect, forwardRef, useImperativeHandle, useCallback } from 'react';
import { getCurrentUser } from '../../api/user';
import { commentApi, formatCommentData, buildCommentTree } from '../../api/comment';
import { favoriteApi } from '../../api/favorite';
import { debounce } from '../../utils/favoriteHelper';
import CommentItem from './CommentItem';
import './CommentList.css';

const CommentList = forwardRef(({ videoId, initialComments = [] }, ref) => {
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [showReplyInput, setShowReplyInput] = useState(null);
    const [replyContent, setReplyContent] = useState('');
    const [replyToComment, setReplyToComment] = useState(null);
    const [error, setError] = useState(null);
    const [totalCount, setTotalCount] = useState(0);

    const currentUser = getCurrentUser();

    useEffect(() => {
        if (videoId) {
            loadComments();
        }
    }, [videoId]);

    // 递归收集所有评论ID
    const collectCommentIds = (commentsList) => {
        let ids = [];
        commentsList.forEach(comment => {
            ids.push(comment.id);
            if (comment.comments && comment.comments.length > 0) {
                ids = ids.concat(collectCommentIds(comment.comments));
            }
        });
        return ids;
    };

    // 批量加载点赞状态并更新评论树
    const enrichCommentsWithLikeStatus = async (commentsList) => {
        if (!currentUser || commentsList.length === 0) return commentsList;

        const commentIds = collectCommentIds(commentsList);
        if (commentIds.length === 0) return commentsList;

        try {
            const statusMap = await favoriteApi.batchCheckFavoriteStatus({
                target: 1, // 评论
                ids: commentIds
            });

            const updateComments = (list) => {
                return list.map(comment => {
                    const status = statusMap[comment.id] || {
                        isLiked: false,
                        isDisliked: false,
                        likeCount: comment.likeCount || 0,
                        dislikeCount: 0
                    };
                    const updated = {
                        ...comment,
                        isLiked: status.isLiked,
                        isDisliked: status.isDisliked,
                        likeCount: status.likeCount,
                        dislikeCount: status.dislikeCount
                    };
                    if (updated.comments && updated.comments.length > 0) {
                        updated.comments = updateComments(updated.comments);
                    }
                    return updated;
                });
            };

            return updateComments(commentsList);
        } catch (err) {
            console.error('批量获取点赞状态失败:', err);
            return commentsList;
        }
    };

    const loadComments = async (pageNum = 1) => {
        try {
            setLoading(true);
            setError(null);

            const response = await commentApi.getVideoComments({
                videoId,
                page: pageNum,
                pageSize: 20
            });

            if (response && response.comments) {
                let commentList = [];
                let total = 0;

                if (response.comments && Array.isArray(response.comments)) {
                    commentList = response.comments;
                } else if (response.data && response.data.comments && Array.isArray(response.data.comments)) {
                    commentList = response.data.comments;
                }

                if (response.page_stats) {
                    total = response.page_stats.total || commentList.length;
                } else if (response.data && response.data.page_stats) {
                    total = response.data.page_stats.total || commentList.length;
                } else if (response.total) {
                    total = response.total;
                } else {
                    total = commentList.length;
                }

                const hasNestedComments = commentList.some(comment =>
                    comment.comments && Array.isArray(comment.comments) && comment.comments.length > 0
                );

                let formattedComments;
                if (hasNestedComments) {
                    formattedComments = commentList.map(comment => formatCommentData(comment));
                } else {
                    formattedComments = buildCommentTree(commentList);
                }

                const enrichedComments = await enrichCommentsWithLikeStatus(formattedComments);

                if (pageNum === 1) {
                    setComments(enrichedComments);
                } else {
                    setComments(prev => [...prev, ...enrichedComments]);
                }

                const loadedCount = pageNum * 20;
                setTotalCount(total);
                setHasMore(formattedComments.length >= 20 || loadedCount < total);
            } else {
                setComments([]);
                setHasMore(false);
                setTotalCount(0);
            }

            setPage(pageNum);
        } catch (error) {
            console.error('加载评论失败:', error);
            setError(`加载评论失败: ${error.message || '未知错误'}`);
        } finally {
            setLoading(false);
        }
    };

    useImperativeHandle(ref, () => ({
        reload: () => { loadComments(); },
        addComment: (newComment) => {
            const formattedComment = formatCommentData(newComment);
            const enrichedComment = {
                ...formattedComment,
                isLiked: false,
                isDisliked: false,
                likeCount: formattedComment.likeCount || 0,
                dislikeCount: 0
            };
            setComments(prev => [enrichedComment, ...prev]);
            setTotalCount(prev => prev + 1);
        }
    }));

    const loadMoreComments = () => {
        if (!loading && hasMore) {
            loadComments(page + 1);
        }
    };

    const handleReply = (commentId, user) => {
        setShowReplyInput(commentId);
        setReplyToComment({ commentId, user });
        setReplyContent(`@${user?.name || '用户'} `);
    };

    const handleReplySubmit = async (commentId, content) => {
        if (!content.trim() || !currentUser) return false;

        try {
            const response = await commentApi.createComment({
                videoId,
                content: content.trim(),
                parentId: commentId,
                replyUserId: replyToComment?.user?.id || 0
            });

            if (response && response.comment) {
                const newReply = formatCommentData(response.comment);
                const enrichedReply = {
                    ...newReply,
                    isLiked: false,
                    isDisliked: false,
                    likeCount: newReply.likeCount || 0,
                    dislikeCount: 0
                };

                const addReplyToComment = (commentsList) => {
                    return commentsList.map(comment => {
                        if (comment.id === String(commentId)) {
                            return {
                                ...comment,
                                comments: [...(comment.comments || []), enrichedReply],
                                replyCount: (comment.replyCount || 0) + 1
                            };
                        }
                        if (comment.comments && comment.comments.length > 0) {
                            return {
                                ...comment,
                                comments: addReplyToComment(comment.comments)
                            };
                        }
                        return comment;
                    });
                };

                setComments(prev => addReplyToComment(prev));
                setShowReplyInput(null);
                setReplyContent('');
                setReplyToComment(null);
                return true;
            }
        } catch (error) {
            console.error('回复评论失败:', error);
            setError(`回复评论失败: ${error.message || '未知错误'}`);
            return false;
        }
    };

    // 通用点赞/点踩处理器（优化版）
    const handleFavoriteAction = useCallback(
        debounce(async (commentId, actionType, isCurrentlyActive) => {
            if (!currentUser) {
                alert('请先登录后才能操作');
                return;
            }

            try {
                let response;
                if (actionType === 'like') {
                    response = isCurrentlyActive
                        ? await favoriteApi.unlikeComment(commentId)
                        : await favoriteApi.likeComment(commentId);
                } else {
                    response = isCurrentlyActive
                        ? await favoriteApi.undislikeComment(commentId)
                        : await favoriteApi.dislikeComment(commentId);
                }

                // 更新评论树中对应评论的状态
                const updateCommentState = (commentsList) => {
                    return commentsList.map(comment => {
                        if (comment.id === commentId) {
                            const updated = { ...comment };
                            // 更新点赞/点踩状态（根据操作推断）
                            if (actionType === 'like') {
                                updated.isLiked = !isCurrentlyActive;
                                updated.isDisliked = false;
                            } else {
                                updated.isDisliked = !isCurrentlyActive;
                                updated.isLiked = false;
                            }
                            // 使用后端返回的计数覆盖
                            if (response.total_likes !== undefined) {
                                updated.likeCount = response.total_likes;
                            }
                            if (response.total_dislikes !== undefined) {
                                updated.dislikeCount = response.total_dislikes;
                            }
                            return updated;
                        }
                        if (comment.comments && comment.comments.length > 0) {
                            return {
                                ...comment,
                                comments: updateCommentState(comment.comments)
                            };
                        }
                        return comment;
                    });
                };

                setComments(prev => updateCommentState(prev));
            } catch (error) {
                console.error('操作失败:', error);
                alert('操作失败，请稍后重试');
            }
        }, 300),
        [currentUser]
    );

    const handleLike = (commentId, isLiked) => handleFavoriteAction(commentId, 'like', isLiked);
    const handleDislike = (commentId, isDisliked) => handleFavoriteAction(commentId, 'dislike', isDisliked);

    const handleDelete = async (commentId) => {
        if (!window.confirm('确定要删除这条评论吗？')) return;

        try {
            await commentApi.deleteComment(commentId);
            const removeComment = (commentsList) => {
                return commentsList.filter(comment => {
                    if (comment.id === commentId) return false;
                    if (comment.comments && comment.comments.length > 0) {
                        comment.comments = removeComment(comment.comments);
                    }
                    return true;
                });
            };
            setComments(prev => removeComment(prev));
            setTotalCount(prev => prev - 1);
        } catch (error) {
            console.error('删除评论失败:', error);
            setError('删除评论失败，请稍后重试');
        }
    };

    if (error) {
        return (
            <div className="comment-error">
                <p>{error}</p>
                <button onClick={() => loadComments()} className="retry-btn">重试</button>
            </div>
        );
    }

    return (
        <div className="comment-list">
            <div className="comment-header">
                <h3>评论 ({totalCount || comments.length})</h3>
            </div>

            <div className="comments-container">
                {loading && comments.length === 0 ? (
                    <div className="comment-loading">
                        <div className="loading-spinner"></div>
                        <p>加载评论中...</p>
                    </div>
                ) : comments.length > 0 ? (
                    <>
                        {comments.map(comment => (
                            <CommentItem
                                key={comment.id}
                                comment={comment}
                                currentUserId={currentUser?.id}
                                onLike={handleLike}
                                onDislike={handleDislike}
                                onReply={handleReply}
                                onDelete={handleDelete}
                                onReplySubmit={handleReplySubmit}
                                showReplyInput={showReplyInput}
                                onToggleReply={setShowReplyInput}
                                replyContent={replyContent}
                                setReplyContent={setReplyContent}
                                replyToComment={replyToComment}
                            />
                        ))}

                        {hasMore && (
                            <div className="load-more-comments">
                                <button
                                    onClick={loadMoreComments}
                                    disabled={loading}
                                    className="load-more-btn"
                                >
                                    {loading ? '加载中...' : '加载更多评论'}
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="no-comments">
                        <div className="empty-icon">💬</div>
                        <p>还没有评论，快来发表第一条评论吧！</p>
                    </div>
                )}
            </div>
        </div>
    );
});

export default CommentList;