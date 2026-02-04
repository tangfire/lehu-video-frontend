import React, { useState, useEffect } from 'react';
import { getCurrentUser } from '../../api/user';
import {followApi} from '../../api/follow';
import './FollowButton.css';

const FollowButton = ({
                          userId,
                          initialIsFollowing = false,
                          onFollowChange,
                          size = 'medium',
                          showText = true,
                          className = ''
                      }) => {
    const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
    const [loading, setLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        const user = getCurrentUser();
        setCurrentUser(user);
    }, []);

    useEffect(() => {
        setIsFollowing(initialIsFollowing);
    }, [initialIsFollowing]);

    const handleFollowToggle = async () => {
        if (!currentUser) {
            alert('请先登录后再关注');
            return;
        }

        if (currentUser.id === userId) {
            alert('不能关注自己');
            return;
        }

        if (loading) return;

        setLoading(true);
        try {
            if (isFollowing) {
                // 取消关注
                await followApi.removeFollow(userId);
                setIsFollowing(false);
                if (onFollowChange) {
                    onFollowChange(false);
                }
            } else {
                // 关注
                await followApi.addFollow(userId);
                setIsFollowing(true);
                if (onFollowChange) {
                    onFollowChange(true);
                }
            }
        } catch (error) {
            console.error('关注操作失败:', error);
            alert(error.message || '操作失败，请稍后重试');
        } finally {
            setLoading(false);
        }
    };

    if (!currentUser) {
        return (
            <button
                className={`follow-btn ${size} ${className}`}
                onClick={() => window.location.href = '/login'}
            >
                {showText && '关注'}
            </button>
        );
    }

    if (currentUser.id === userId) {
        return null; // 不显示自己的关注按钮
    }

    const getButtonText = () => {
        if (isFollowing) {
            return showText ? '已关注' : '';
        }
        return showText ? '关注' : '+';
    };

    return (
        <button
            className={`follow-btn ${size} ${isFollowing ? 'following' : ''} ${loading ? 'loading' : ''} ${className}`}
            onClick={handleFollowToggle}
            disabled={loading}
        >
            {loading ? (
                <span className="follow-loading">
                    <span className="loading-dot"></span>
                </span>
            ) : (
                <>
                    {isFollowing ? '✓' : '+'}
                    {showText && <span className="follow-text">{getButtonText()}</span>}
                </>
            )}
        </button>
    );
};

export default FollowButton;
