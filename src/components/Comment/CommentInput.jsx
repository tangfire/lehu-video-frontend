import React, { useState } from 'react';
import { commentApi } from '../../api/comment';
import './CommentInput.css';

const DEFAULT_AVATAR = '/default-avatar.png';

const CommentInput = ({
                          videoId,
                          currentUser,
                          parentId = 0,
                          replyTo = null,
                          placeholder = "写下你的评论...",
                          onCommentSubmit,
                          onCancel
                      }) => {
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!content.trim()) {
            setError('评论内容不能为空');
            return;
        }

        if (!currentUser) {
            setError('请先登录');
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const response = await commentApi.createComment({
                videoId,
                content: content.trim(),
                parentId,
                replyUserId: replyTo?.id || 0
            });

            if (response && response.comment) {
                // 清空输入框
                setContent('');

                // 通知父组件
                if (onCommentSubmit) {
                    onCommentSubmit(response.comment);
                }

                // 如果是回复，关闭回复框
                if (onCancel) {
                    onCancel();
                }
            }
        } catch (error) {
            console.error('发表评论失败:', error);
            setError(`发表失败: ${error.message || '未知错误'}`);
        } finally {
            setLoading(false);
        }
    };

    const handleImageError = (e) => {
        e.target.onerror = null;
        e.target.src = DEFAULT_AVATAR;
    };

    const handleKeyDown = (e) => {
        // Ctrl + Enter 提交
        if (e.ctrlKey && e.key === 'Enter') {
            handleSubmit(e);
        }
    };

    if (!currentUser) {
        return (
            <div className="comment-login-prompt">
                <p>请先登录后发表评论</p>
                <button
                    onClick={() => window.location.href = '/login'}
                    className="login-btn"
                >
                    立即登录
                </button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="comment-input-form">
            {/* 用户头像和基本信息 */}
            <div className="comment-user-info">
                <img
                    src={currentUser.avatar || DEFAULT_AVATAR}
                    alt={currentUser.name}
                    className="user-avatar"
                    onError={handleImageError}
                />
                <span className="user-name">{currentUser.name}</span>
            </div>

            {/* 回复提示 */}
            {replyTo && (
                <div className="reply-hint">
                    回复 <span className="reply-username">@{replyTo.name}</span>
                    <button
                        type="button"
                        onClick={onCancel}
                        className="cancel-reply-hint"
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* 文本输入框 */}
            <div className="input-wrapper">
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    className="comment-textarea"
                    maxLength="500"
                    rows={replyTo ? 2 : 3}
                    disabled={loading}
                />

                {/* 字数统计 */}
                <div className="textarea-footer">
                    <span className={`char-count ${content.length >= 450 ? 'warning' : ''} ${content.length >= 490 ? 'error' : ''}`}>
                        {content.length}/500
                    </span>
                </div>
            </div>

            {/* 错误提示 */}
            {error && (
                <div className="input-error">
                    {error}
                </div>
            )}

            {/* 操作按钮 */}
            <div className="input-actions">
                {onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        className="cancel-btn"
                        disabled={loading}
                    >
                        取消
                    </button>
                )}
                <button
                    type="submit"
                    className="submit-btn"
                    disabled={loading || !content.trim()}
                >
                    {loading ? '发送中...' : '发送'}
                    {content.trim() && <span className="shortcut-hint"> (Ctrl+Enter)</span>}
                </button>
            </div>
        </form>
    );
};

export default CommentInput;