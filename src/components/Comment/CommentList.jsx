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

            if (response) {
                let commentList = [];

                // 处理不同的响应格式
                if (Array.isArray(response)) {
                    commentList = response;
                } else if (response.comments && Array.isArray(response.comments)) {
                    commentList = response.comments;
                } else if (response.list && Array.isArray(response.list)) {
                    commentList = response.list;
                }

                // 格式化评论数据
                const formattedComments = commentList.map(formatCommentData);
                console.log('格式化后的评论:', formattedComments);

                // 构建评论树
                const commentTree = buildCommentTree(formattedComments);
                console.log('构建的评论树:', commentTree);

                if (pageNum === 1) {
                    setComments(commentTree);
                } else {
                    setComments(prev => [...prev, ...commentTree]);
                }

                // 更新分页信息
                const total = response.total || response.count || commentList.length;
                const loadedCount = pageNum * 20;
                setTotalCount(total);
                setHasMore(commentTree.length >= 20 || loadedCount < total);
            } else {
                console.warn('没有获取到评论数据');
                setComments([]);
                setHasMore(false);
            }

            setPage(pageNum);
        } catch (error) {
            console.error('加载评论失败:', error);
            setError(`加载评论失败: ${error.message || '未知错误'}`);

            // 加载模拟数据作为备选
            if (pageNum === 1) {
                loadMockComments();
            }
        } finally {
            setLoading(false);
        }
    };

    const loadMockComments = () => {
        console.log('加载模拟评论数据');
        const mockComments = [
            {
                id: 1,
                content: '这个视频真不错，学到了很多！',
                date: '2小时前',
                likeCount: 45,
                dislikeCount: 2,
                isLiked: false,
                isDisliked: false,
                user: {
                    id: 101,
                    name: '用户A',
                    avatar: '/default-avatar.png'
                },
                comments: [
                    {
                        id: 11,
                        content: '我也这么觉得！',
                        date: '1小时前',
                        likeCount: 12,
                        dislikeCount: 0,
                        isLiked: false,
                        isDisliked: false,
                        user: {
                            id: 102,
                            name: '用户B',
                            avatar: '/default-avatar.png'
                        },
                        replyUser: {
                            id: 101,
                            name: '用户A'
                        },
                        comments: []
                    }
                ]
            },
            {
                id: 2,
                content: '感谢分享，期待更多内容！',
                date: '3小时前',
                likeCount: 23,
                dislikeCount: 1,
                isLiked: true,
                isDisliked: false,
                user: {
                    id: 103,
                    name: '用户C',
                    avatar: '/default-avatar.png'
                },
                comments: []
            }
        ];

        setComments(mockComments);
        setTotalCount(mockComments.length);
        setHasMore(false);
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

            if (response) {
                const newReply = formatCommentData(response);

                setComments(prev =>
                    prev.map(comment => {
                        if (comment.id === commentId) {
                            return {
                                ...comment,
                                comments: [...(comment.comments || []), newReply]
                            };
                        }
                        return comment;
                    })
                );

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
                    setComments(prev =>
                        prev.map(comment =>
                            updateCommentState(comment, commentId, {
                                isLiked: !isLiked,
                                isDisliked: false,
                                likeCount: isLiked
                                    ? Math.max(0, (comment.likeCount || 0) - 1)
                                    : (comment.likeCount || 0) + 1,
                                dislikeCount: comment.isDisliked
                                    ? Math.max(0, (comment.dislikeCount || 0) - 1)
                                    : comment.dislikeCount
                            })
                        )
                    );
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
                    setComments(prev =>
                        prev.map(comment =>
                            updateCommentState(comment, commentId, {
                                isLiked: false,
                                isDisliked: !isDisliked,
                                likeCount: comment.isLiked
                                    ? Math.max(0, (comment.likeCount || 0) - 1)
                                    : comment.likeCount,
                                dislikeCount: isDisliked
                                    ? Math.max(0, (comment.dislikeCount || 0) - 1)
                                    : (comment.dislikeCount || 0) + 1
                            })
                        )
                    );
                }
            } catch (error) {
                console.error('评论点踩操作失败:', error);
                alert('操作失败，请稍后重试');
            }
        }, 300),
        [currentUser]
    );

    const updateCommentState = (comment, targetId, newState) => {
        if (comment.id === targetId) {
            return {
                ...comment,
                ...newState
            };
        }

        if (comment.comments && comment.comments.length > 0) {
            return {
                ...comment,
                comments: comment.comments.map(child =>
                    updateCommentState(child, targetId, newState)
                )
            };
        }

        return comment;
    };

    const handleDelete = async (commentId) => {
        if (!window.confirm('确定要删除这条评论吗？')) return;

        try {
            await commentApi.deleteComment(commentId);
            setComments(prev => removeComment(prev, commentId));
            setTotalCount(prev => prev - 1);
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