// src/components/Comment/CommentList.jsx
import React, { useState, useEffect, forwardRef, useImperativeHandle, useCallback } from 'react';
import { getCurrentUser } from '../../api/user';
import { commentApi, formatCommentData, buildCommentTree } from '../../api/comment';
import { favoriteApi } from '../../api/favorite';
import { debounce } from '../../utils/favoriteHelper';
import CommentItem from './CommentItem';
import './CommentList.css';

const CommentList = forwardRef(({
                                    videoId,
                                    initialComments = []
                                }, ref) => {
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

    const loadComments = async (pageNum = 1) => {
        try {
            setLoading(true);
            setError(null);

            console.log('加载评论，视频ID:', videoId, '页码:', pageNum);

            const response = await commentApi.getVideoComments({
                videoId,
                page: pageNum,
                pageSize: 20
            });

            console.log('评论API响应:', response);

            if (response && response.comments) {
                let commentList = [];
                let total = 0;

                // 根据后端返回格式处理
                if (response.comments && Array.isArray(response.comments)) {
                    commentList = response.comments;
                } else if (response.data && response.data.comments && Array.isArray(response.data.comments)) {
                    commentList = response.data.comments;
                }

                // 处理分页信息
                if (response.page_stats) {
                    total = response.page_stats.total || commentList.length;
                } else if (response.data && response.data.page_stats) {
                    total = response.data.page_stats.total || commentList.length;
                } else if (response.total) {
                    total = response.total;
                } else {
                    total = commentList.length;
                }

                // 检查后端是否返回嵌套结构
                const hasNestedComments = commentList.some(comment =>
                    comment.comments && Array.isArray(comment.comments) && comment.comments.length > 0
                );

                let formattedComments;

                if (hasNestedComments) {
                    // 后端已经返回了嵌套结构，直接格式化
                    console.log('后端返回了嵌套评论结构');
                    formattedComments = commentList.map(comment => formatCommentData(comment));
                } else {
                    // 后端返回平铺结构，需要构建树形结构
                    console.log('后端返回平铺结构，需要构建树形结构');
                    formattedComments = buildCommentTree(commentList);
                }

                console.log('格式化后的评论:', formattedComments);

                if (pageNum === 1) {
                    setComments(formattedComments);
                } else {
                    setComments(prev => [...prev, ...formattedComments]);
                }

                // 更新分页信息
                const loadedCount = pageNum * 20;
                setTotalCount(total);
                setHasMore(formattedComments.length >= 20 || loadedCount < total);
            } else {
                console.warn('没有获取到评论数据');
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
        reload: () => {
            loadComments();
        },
        addComment: (newComment) => {
            const formattedComment = formatCommentData(newComment);
            setComments(prev => [formattedComment, ...prev]);
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

                // 递归查找并添加回复到对应的评论
                const addReplyToComment = (commentsList, targetId, reply) => {
                    return commentsList.map(comment => {
                        if (comment.id === String(targetId)) {
                            return {
                                ...comment,
                                comments: [...(comment.comments || []), newReply],
                                replyCount: (comment.replyCount || 0) + 1
                            };
                        }

                        if (comment.comments && comment.comments.length > 0) {
                            return {
                                ...comment,
                                comments: addReplyToComment(comment.comments, targetId, reply)
                            };
                        }

                        return comment;
                    });
                };

                setComments(prev => addReplyToComment(prev, commentId, newReply));
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

    // 使用防抖处理点赞
    const debouncedLike = useCallback(
        debounce(async (commentId, isLiked) => {
            if (!currentUser) {
                alert('请先登录后才能点赞评论');
                return;
            }

            try {
                let response;
                if (isLiked) {
                    response = await favoriteApi.unlikeComment(commentId);
                } else {
                    response = await favoriteApi.likeComment(commentId);
                }

                if (response) {
                    // 递归更新评论点赞状态
                    const updateCommentLikeState = (commentsList) => {
                        return commentsList.map(comment => {
                            if (comment.id === commentId) {
                                return {
                                    ...comment,
                                    isLiked: !isLiked,
                                    isDisliked: false,
                                    likeCount: isLiked
                                        ? Math.max(0, (comment.likeCount || 0) - 1)
                                        : (comment.likeCount || 0) + 1
                                };
                            }

                            if (comment.comments && comment.comments.length > 0) {
                                return {
                                    ...comment,
                                    comments: updateCommentLikeState(comment.comments)
                                };
                            }

                            return comment;
                        });
                    };

                    setComments(prev => updateCommentLikeState(prev));
                }
            } catch (error) {
                console.error('评论点赞操作失败:', error);
                alert('操作失败，请稍后重试');
            }
        }, 300),
        [currentUser]
    );

    // 使用防抖处理点踩
    const debouncedDislike = useCallback(
        debounce(async (commentId, isDisliked) => {
            if (!currentUser) {
                alert('请先登录后才能点踩评论');
                return;
            }

            try {
                let response;
                if (isDisliked) {
                    response = await favoriteApi.undislikeComment(commentId);
                } else {
                    response = await favoriteApi.dislikeComment(commentId);
                }

                if (response) {
                    // 递归更新评论点踩状态
                    const updateCommentDislikeState = (commentsList) => {
                        return commentsList.map(comment => {
                            if (comment.id === commentId) {
                                return {
                                    ...comment,
                                    isLiked: false,
                                    isDisliked: !isDisliked,
                                    dislikeCount: isDisliked
                                        ? Math.max(0, (comment.dislikeCount || 0) - 1)
                                        : (comment.dislikeCount || 0) + 1
                                };
                            }

                            if (comment.comments && comment.comments.length > 0) {
                                return {
                                    ...comment,
                                    comments: updateCommentDislikeState(comment.comments)
                                };
                            }

                            return comment;
                        });
                    };

                    setComments(prev => updateCommentDislikeState(prev));
                }
            } catch (error) {
                console.error('评论点踩操作失败:', error);
                alert('操作失败，请稍后重试');
            }
        }, 300),
        [currentUser]
    );

    const handleDelete = async (commentId) => {
        if (!window.confirm('确定要删除这条评论吗？')) return;

        try {
            await commentApi.deleteComment(commentId);

            // 递归删除评论
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
                <button onClick={() => loadComments()} className="retry-btn">
                    重试
                </button>
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
                                onLike={debouncedLike}
                                onDislike={debouncedDislike}
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