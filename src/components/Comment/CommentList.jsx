import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { getCurrentUser } from '../../api/user';
import { commentApi, formatCommentData, buildCommentTree } from '../../api/comment';
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

            const response = await commentApi.getVideoComments({
                videoId,
                page: pageNum,
                pageSize: 20
            });

            if (response && Array.isArray(response.comments)) {
                const formattedComments = response.comments.map(formatCommentData);
                const commentTree = buildCommentTree(formattedComments);

                if (pageNum === 1) {
                    setComments(commentTree);
                } else {
                    setComments(prev => [...prev, ...commentTree]);
                }

                // 检查是否还有更多评论
                const total = response.page_stats?.total || 0;
                const loadedCount = pageNum * 20;
                setHasMore(loadedCount < total);
            } else {
                setComments([]);
                setHasMore(false);
            }

            setPage(pageNum);
        } catch (error) {
            console.error('加载评论失败:', error);
            setError('加载评论失败，请稍后重试');
        } finally {
            setLoading(false);
        }
    };

    // 暴露方法给父组件
    useImperativeHandle(ref, () => ({
        reload: () => {
            loadComments();
        },
        addComment: (newComment) => {
            const formattedComment = formatCommentData(newComment);
            setComments(prev => [formattedComment, ...prev]);
        }
    }));

    const loadMoreComments = () => {
        if (!loading && hasMore) {
            loadComments(page + 1);
        }
    };

    const handleSubmitComment = async (content, parentId = 0, replyUserId = 0) => {
        if (!content.trim() || !currentUser) return;

        try {
            const response = await commentApi.createComment({
                videoId,
                content,
                parentId,
                replyUserId
            });

            if (response && response.comment) {
                const newComment = formatCommentData(response.comment);

                if (parentId === 0) {
                    // 根评论
                    setComments(prev => [newComment, ...prev]);
                } else {
                    // 子评论，需要更新对应父评论
                    setComments(prev =>
                        prev.map(comment => {
                            if (comment.id === parentId) {
                                const updatedComments = [...(comment.comments || []), newComment];
                                return {
                                    ...comment,
                                    comments: updatedComments,
                                    replyCount: updatedComments.length
                                };
                            }
                            return comment;
                        })
                    );
                }

                // 重置状态
                setReplyContent('');
                setReplyToComment(null);
                setShowReplyInput(null);

                return true; // 返回成功状态
            }
        } catch (error) {
            console.error('发表评论失败:', error);
            setError('发表评论失败，请稍后重试');
            return false;
        }
    };

    const handleReply = (commentId, user) => {
        setShowReplyInput(commentId);
        setReplyToComment({ commentId, user });
        setReplyContent(`@${user?.name || '用户'} `);
    };

    // 处理回复提交
    const handleReplySubmit = async (commentId, content) => {
        if (!content.trim()) return false;

        try {
            const response = await commentApi.createComment({
                videoId,
                content: content.trim(),
                parentId: commentId,
                replyUserId: replyToComment?.user?.id || 0
            });

            if (response && response.comment) {
                const newReply = formatCommentData(response.comment);

                // 更新评论列表
                setComments(prev =>
                    prev.map(comment => {
                        if (comment.id === commentId) {
                            const updatedReplies = [...(comment.comments || []), newReply];
                            return {
                                ...comment,
                                comments: updatedReplies,
                                replyCount: updatedReplies.length
                            };
                        }
                        return comment;
                    })
                );

                // 关闭回复输入框
                setShowReplyInput(null);
                setReplyContent('');
                setReplyToComment(null);

                return true;
            }
        } catch (error) {
            console.error('回复评论失败:', error);
            setError('回复评论失败，请稍后重试');
            return false;
        }
    };

    const handleLike = async (commentId, isLiked) => {
        try {
            // TODO: 调用点赞/取消点赞接口
            // const response = isLiked
            //     ? await commentApi.likeComment(commentId)
            //     : await commentApi.unlikeComment(commentId);

            // 本地更新
            setComments(prev =>
                prev.map(comment => updateCommentLikes(comment, commentId, isLiked))
            );
        } catch (error) {
            console.error('点赞失败:', error);
        }
    };

    const updateCommentLikes = (comment, targetId, isLiked) => {
        if (comment.id === targetId) {
            return {
                ...comment,
                likeCount: isLiked ? (comment.likeCount || 0) + 1 : Math.max((comment.likeCount || 0) - 1, 0),
                isLiked
            };
        }

        if (comment.comments && comment.comments.length > 0) {
            return {
                ...comment,
                comments: comment.comments.map(child =>
                    updateCommentLikes(child, targetId, isLiked)
                )
            };
        }

        return comment;
    };

    const handleDelete = async (commentId) => {
        try {
            await commentApi.deleteComment(commentId);

            // 从评论列表中移除
            setComments(prev => removeComment(prev, commentId));
        } catch (error) {
            console.error('删除评论失败:', error);
            setError('删除评论失败，请稍后重试');
        }
    };

    const removeComment = (commentsList, targetId) => {
        return commentsList.filter(comment => {
            if (comment.id === targetId) return false;

            if (comment.comments && comment.comments.length > 0) {
                comment.comments = removeComment(comment.comments, targetId);
            }

            return true;
        });
    };

    const handleLoadChildComments = async (commentId) => {
        try {
            const response = await commentApi.getChildComments({
                commentId,
                page: 1,
                pageSize: 10
            });

            if (response && Array.isArray(response.comments)) {
                const formattedComments = response.comments.map(formatCommentData);

                // 更新对应评论的子评论
                setComments(prev =>
                    prev.map(comment => {
                        if (comment.id === commentId) {
                            return {
                                ...comment,
                                comments: formattedComments,
                                replyCount: formattedComments.length
                            };
                        }
                        return comment;
                    })
                );
            }
        } catch (error) {
            console.error('加载子评论失败:', error);
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
            {/* 评论统计 */}
            <div className="comment-header">
                <h3>评论 ({comments.length})</h3>
            </div>

            {/* 评论列表 */}
            <div className="comments-container">
                {comments.length > 0 ? (
                    <>
                        {comments.map(comment => (
                            <CommentItem
                                key={comment.id}
                                comment={comment}
                                currentUserId={currentUser?.id}
                                onLike={handleLike}
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

                        {/* 加载更多 */}
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