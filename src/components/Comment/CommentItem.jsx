import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiHeart, FiMessageCircle, FiMoreVertical } from 'react-icons/fi';
import { FaThumbsDown } from 'react-icons/fa';
import './CommentItem.css';

const DEFAULT_AVATAR = '/default-avatar.png';

const CommentItem = ({
                         comment,
                         currentUserId,
                         onLike,
                         onDislike,
                         onReply,
                         onDelete,
                         onReplySubmit,
                         showReplyInput,
                         onToggleReply,
                         replyContent,
                         setReplyContent,
                         replyToComment,
                         depth = 0
                     }) => {
    const [showActions, setShowActions] = useState(false);
    const [localReplyContent, setLocalReplyContent] = useState('');
    const [isSubmittingReply, setIsSubmittingReply] = useState(false);
    const [isLiking, setIsLiking] = useState(false);
    const [isDisliking, setIsDisliking] = useState(false);

    const isCurrentUser = currentUserId === comment.user?.id;

    const handleLike = async () => {
        if (!currentUserId) {
            alert('请先登录后才能点赞评论');
            return;
        }

        if (isLiking) return;

        setIsLiking(true);
        try {
            await onLike(comment.id, comment.isLiked);
        } catch (error) {
            console.error('点赞操作失败:', error);
        } finally {
            setIsLiking(false);
        }
    };

    const handleDislike = async () => {
        if (!currentUserId) {
            alert('请先登录后才能点踩评论');
            return;
        }

        if (isDisliking) return;

        setIsDisliking(true);
        try {
            await onDislike(comment.id, comment.isDisliked);
        } catch (error) {
            console.error('点踩操作失败:', error);
        } finally {
            setIsDisliking(false);
        }
    };

    const handleReply = () => {
        if (onReply) {
            onReply(comment.id, comment.user);
            setLocalReplyContent(`@${comment.user?.name || '用户'} `);
        }
    };

    const handleDelete = () => {
        if (onDelete && window.confirm('确定要删除这条评论吗？')) {
            onDelete(comment.id);
        }
    };

    const handleImageError = (e) => {
        e.target.onerror = null;
        e.target.src = DEFAULT_AVATAR;
        console.warn('头像加载失败，使用默认头像');
    };

    const handleSubmitReply = async () => {
        if (!onReplySubmit) return;

        const contentToSubmit = replyContent || localReplyContent;
        if (!contentToSubmit.trim()) {
            alert('回复内容不能为空');
            return;
        }

        setIsSubmittingReply(true);
        try {
            const success = await onReplySubmit(comment.id, contentToSubmit);
            if (success) {
                setLocalReplyContent('');
                if (setReplyContent) setReplyContent('');
                if (onToggleReply) onToggleReply(null);
            }
        } catch (error) {
            console.error('提交回复失败:', error);
        } finally {
            setIsSubmittingReply(false);
        }
    };

    const handleCancelReply = () => {
        setLocalReplyContent('');
        if (setReplyContent) setReplyContent('');
        if (onToggleReply) onToggleReply(null);
    };

    const handleReplyInputChange = (e) => {
        const value = e.target.value;
        setLocalReplyContent(value);
        if (setReplyContent) {
            setReplyContent(value);
        }
    };

    const isReplyingThisComment = showReplyInput === comment.id;

    return (
        <div className={`comment-item ${depth > 0 ? 'child-comment' : ''}`}>
            <div className="comment-content">
                <Link
                    to={`/user/${comment.user?.id}`}
                    className="comment-avatar"
                >
                    <img
                        src={comment.user?.avatar || DEFAULT_AVATAR}
                        alt={comment.user?.name}
                        onError={handleImageError}
                    />
                </Link>

                <div className="comment-body">
                    <div className="comment-header">
                        <div className="comment-user-info">
                            <Link
                                to={`/user/${comment.user?.id}`}
                                className="comment-username"
                            >
                                {comment.user?.name || '用户'}
                            </Link>

                            {comment.replyUser && (
                                <span className="reply-to">
                                    回复
                                    <Link
                                        to={`/user/${comment.replyUser?.id}`}
                                        className="reply-username"
                                    >
                                        {comment.replyUser?.name}
                                    </Link>
                                </span>
                            )}
                        </div>

                        <div className="comment-time">
                            {comment.date}
                        </div>
                    </div>

                    <div className="comment-text">
                        {comment.content}
                    </div>

                    <div className="comment-actions">
                        <button
                            className={`comment-action-btn like-btn ${comment.isLiked ? 'liked' : ''}`}
                            onClick={handleLike}
                            disabled={isLiking}
                        >
                            <FiHeart />
                            <span>{comment.likeCount || 0}</span>
                            {isLiking && <span className="action-loading"></span>}
                        </button>

                        <button
                            className={`comment-action-btn dislike-btn ${comment.isDisliked ? 'disliked' : ''}`}
                            onClick={handleDislike}
                            disabled={isDisliking}
                        >
                            <FaThumbsDown />
                            <span>{comment.dislikeCount || 0}</span>
                            {isDisliking && <span className="action-loading"></span>}
                        </button>

                        <button
                            className="comment-action-btn reply-btn"
                            onClick={handleReply}
                        >
                            <FiMessageCircle />
                            <span>回复</span>
                        </button>

                        <div className="comment-more">
                            <button
                                className="more-btn"
                                onClick={() => setShowActions(!showActions)}
                            >
                                <FiMoreVertical />
                            </button>

                            {showActions && (
                                <div className="more-actions">
                                    {isCurrentUser && (
                                        <button
                                            className="delete-btn"
                                            onClick={handleDelete}
                                        >
                                            删除
                                        </button>
                                    )}
                                    <button
                                        className="report-btn"
                                        onClick={() => setShowActions(false)}
                                    >
                                        举报
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {isReplyingThisComment && (
                        <div className="reply-input-wrapper">
                            <textarea
                                className="reply-textarea"
                                placeholder="写下你的回复..."
                                value={replyContent || localReplyContent}
                                onChange={handleReplyInputChange}
                                autoFocus
                                maxLength="500"
                                rows={3}
                            />
                            <div className="reply-actions">
                                <button
                                    className="cancel-reply-btn"
                                    onClick={handleCancelReply}
                                    disabled={isSubmittingReply}
                                >
                                    取消
                                </button>
                                <button
                                    className="submit-reply-btn"
                                    onClick={handleSubmitReply}
                                    disabled={isSubmittingReply || !(replyContent || localReplyContent).trim()}
                                >
                                    {isSubmittingReply ? '发送中...' : '回复'}
                                </button>
                            </div>
                        </div>
                    )}

                    {comment.comments && comment.comments.length > 0 && (
                        <div className="child-comments">
                            {comment.comments.map(childComment => (
                                <CommentItem
                                    key={childComment.id}
                                    comment={childComment}
                                    currentUserId={currentUserId}
                                    onLike={onLike}
                                    onDislike={onDislike}
                                    onReply={onReply}
                                    onDelete={onDelete}
                                    onReplySubmit={onReplySubmit}
                                    showReplyInput={showReplyInput}
                                    onToggleReply={onToggleReply}
                                    replyContent={replyContent}
                                    setReplyContent={setReplyContent}
                                    replyToComment={replyToComment}
                                    depth={depth + 1}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CommentItem;