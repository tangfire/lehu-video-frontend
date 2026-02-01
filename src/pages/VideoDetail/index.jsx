import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { videoApi } from '../../api/video';
import { favoriteApi } from '../../api/favorite';
import { getCurrentUser } from '../../api/user';
import { formatVideoData } from '../../utils/dataFormat';
import CommentList from '../../components/Comment/CommentList';
import CommentInput from '../../components/Comment/CommentInput';
import FollowButton from '../../components/Follow/FollowButton';
import { collectionApi } from '../../api/collection';
import CollectionSelector from '../../components/Collection/CollectionSelector';
import './VideoDetail.css';

const DEFAULT_AVATAR = '/default-avatar.png';

const LikeErrorToast = ({ error, onClose }) => {
    if (!error) return null;

    return (
        <div className="like-error-toast" onClick={onClose}>
            <div className="like-error-content">
                <span className="like-error-icon">⚠️</span>
                <span className="like-error-text">{error}</span>
            </div>
        </div>
    );
};

const VideoDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [video, setVideo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isLiked, setIsLiked] = useState(false);
    const [isDisliked, setIsDisliked] = useState(false);
    const [isFollowing, setIsFollowing] = useState(false);
    const [error, setError] = useState(null);
    const [likeError, setLikeError] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [newCommentAdded, setNewCommentAdded] = useState(0);
    const [isLiking, setIsLiking] = useState(false);
    const [isDisliking, setIsDisliking] = useState(false);
    const [isCollecting, setIsCollecting] = useState(false);
    const [showCollectionSelector, setShowCollectionSelector] = useState(false);
    const [isCollected, setIsCollected] = useState(false);
    const [collectionCount, setCollectionCount] = useState(0);

    const commentListRef = useRef(null);

    useEffect(() => {
        if (id) {
            fetchVideoDetail();
        }
        const user = getCurrentUser();
        setCurrentUser(user);
        console.log('当前用户:', user);
    }, [id]);

    const fetchVideoDetail = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await videoApi.getVideoById(id);
            console.log('视频详情响应:', response);

            if (response && response.video) {
                const formattedVideo = formatVideoData(response.video);
                console.log('格式化后的视频数据:', formattedVideo);
                setVideo(formattedVideo);

                // 更新收藏状态
                setIsCollected(formattedVideo.isCollected || false);
                setCollectionCount(formattedVideo.collectedCount || 0);

                // 设置点赞状态
                setIsLiked(formattedVideo.isFavorite || false);
                setIsDisliked(formattedVideo.isDisliked || false);
                setIsFollowing(formattedVideo.isFollowing || false);
            } else {
                setError('视频不存在或已删除');
                loadMockVideo();
            }
        } catch (error) {
            console.error('获取视频详情失败:', error);
            setError(`获取视频失败: ${error.message || '未知错误'}`);
            loadMockVideo();
        } finally {
            setLoading(false);
        }
    };

    const loadMockVideo = () => {
        const mockVideo = {
            id: id || "1",
            title: '演示视频：美丽的风景',
            description: '这是一个演示视频，展示了美丽的风景。实际视频数据将从服务器获取。',
            author: '系统演示',
            authorId: 1,
            avatar: DEFAULT_AVATAR,
            views: '12500',
            likes: '1200',
            dislikes: '50',
            comments: 342,
            shares: 89,
            videoUrl: 'https://example.com/video.mp4',
            thumbnail: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
            uploadTime: '2小时前',
            tags: ['演示', '风景', '自然'],
            isFavorite: false,
            isDisliked: false,
            isFollowing: false,
            play_url: ''
        };

        setVideo(mockVideo);
        setIsLiked(false);
        setIsDisliked(false);
        setIsFollowing(false);
    };

    const handleLike = useCallback(async () => {
        if (!currentUser) {
            setLikeError('请先登录后才能点赞');
            setTimeout(() => setLikeError(null), 3000);
            return;
        }

        if (!video || isLiking) return;

        const wasLiked = isLiked;
        const wasDisliked = isDisliked;

        setIsLiked(!wasLiked);
        setIsDisliked(false);
        if (video) {
            setVideo(prev => ({
                ...prev,
                likes: wasLiked ? Math.max(0, prev.likes - 1) : prev.likes + 1,
                dislikes: wasDisliked ? Math.max(0, prev.dislikes - 1) : prev.dislikes,
                isFavorite: !wasLiked,
                isDisliked: false
            }));
        }

        setIsLiking(true);
        setLikeError(null);

        try {
            let response;
            if (wasLiked) {
                response = await favoriteApi.unlikeVideo(video.id);
            } else {
                response = await favoriteApi.likeVideo(video.id);
                if (wasDisliked) {
                    await favoriteApi.undislikeVideo(video.id);
                }
            }
        } catch (error) {
            console.error('点赞操作失败:', error);
            setIsLiked(wasLiked);
            setIsDisliked(wasDisliked);
            if (video) {
                setVideo(prev => ({
                    ...prev,
                    likes: wasLiked ? prev.likes + 1 : Math.max(0, prev.likes - 1),
                    dislikes: wasDisliked ? prev.dislikes + 1 : Math.max(0, prev.dislikes - 1),
                    isFavorite: wasLiked,
                    isDisliked: wasDisliked
                }));
            }

            setLikeError(error.message || '操作失败，请稍后重试');
            setTimeout(() => setLikeError(null), 3000);
        } finally {
            setIsLiking(false);
        }
    }, [video, currentUser, isLiked, isDisliked, isLiking]);

    const handleDislike = useCallback(async () => {
        if (!currentUser) {
            setLikeError('请先登录后才能点踩');
            setTimeout(() => setLikeError(null), 3000);
            return;
        }

        if (!video || isDisliking) return;

        const wasLiked = isLiked;
        const wasDisliked = isDisliked;

        setIsDisliked(!wasDisliked);
        setIsLiked(false);
        if (video) {
            setVideo(prev => ({
                ...prev,
                dislikes: wasDisliked ? Math.max(0, prev.dislikes - 1) : prev.dislikes + 1,
                likes: wasLiked ? Math.max(0, prev.likes - 1) : prev.likes,
                isDisliked: !wasDisliked,
                isFavorite: false
            }));
        }

        setIsDisliking(true);
        setLikeError(null);

        try {
            let response;
            if (wasDisliked) {
                response = await favoriteApi.undislikeVideo(video.id);
            } else {
                response = await favoriteApi.dislikeVideo(video.id);
                if (wasLiked) {
                    await favoriteApi.unlikeVideo(video.id);
                }
            }
        } catch (error) {
            console.error('点踩操作失败:', error);
            setIsLiked(wasLiked);
            setIsDisliked(wasDisliked);
            if (video) {
                setVideo(prev => ({
                    ...prev,
                    dislikes: wasDisliked ? prev.dislikes + 1 : Math.max(0, prev.dislikes - 1),
                    likes: wasLiked ? prev.likes + 1 : Math.max(0, prev.likes - 1),
                    isDisliked: wasDisliked,
                    isFavorite: wasLiked
                }));
            }

            setLikeError(error.message || '操作失败，请稍后重试');
            setTimeout(() => setLikeError(null), 3000);
        } finally {
            setIsDisliking(false);
        }
    }, [video, currentUser, isLiked, isDisliked, isDisliking]);

    const handleFollowChange = (isFollowing) => {
        setIsFollowing(isFollowing);
        if (video) {
            setVideo(prev => ({
                ...prev,
                isFollowing: isFollowing
            }));
        }
    };

    const handleImageError = (e) => {
        e.target.onerror = null;
        e.target.src = DEFAULT_AVATAR;
    };

    const handleCommentSubmit = (newComment) => {
        console.log('新评论提交成功:', newComment);

        if (video) {
            setVideo(prev => ({
                ...prev,
                comments: (prev.comments || 0) + 1
            }));
        }

        setNewCommentAdded(prev => prev + 1);

        if (commentListRef.current) {
            commentListRef.current.reload && commentListRef.current.reload();
        }
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>加载视频中...</p>
            </div>
        );
    }

    if (error && !video) {
        return (
            <div className="not-found">
                <h2>{error}</h2>
                <button onClick={() => navigate('/')} className="back-home-btn">
                    返回首页
                </button>
                <button onClick={fetchVideoDetail} className="retry-btn" style={{marginLeft: '10px'}}>
                    重试
                </button>
            </div>
        );
    }

    if (!video) {
        return (
            <div className="not-found">
                <h2>视频不存在</h2>
                <button onClick={() => navigate('/')}>返回首页</button>
            </div>
        );
    }

    // 添加收藏处理函数
    const handleCollect = async () => {
        if (!currentUser) {
            setLikeError('请先登录后才能收藏');
            setTimeout(() => setLikeError(null), 3000);
            return;
        }

        setShowCollectionSelector(true);
    };

    // 添加收藏成功回调
    const handleCollectionSuccess = () => {
        setIsCollected(true);
        setCollectionCount(prev => prev + 1);
        if (video) {
            setVideo(prev => ({
                ...prev,
                isCollected: true,
                collectedCount: (prev.collectedCount || 0) + 1
            }));
        }
    };

    return (
        <div className="video-detail-container">
            <LikeErrorToast
                error={likeError}
                onClose={() => setLikeError(null)}
            />

            {showCollectionSelector && (
                <div className="collection-modal-overlay">
                    <CollectionSelector
                        videoId={video?.id}
                        onClose={() => setShowCollectionSelector(false)}
                        onSuccess={handleCollectionSuccess}
                    />
                </div>
            )}

            <button className="back-button" onClick={() => navigate(-1)}>
                ← 返回
            </button>

            {error && (
                <div className="video-error-banner">
                    <p>{error}（显示模拟数据）</p>
                </div>
            )}

            <div className="video-detail-content">
                <div className="video-player-section">
                    <div className="video-player">
                        {video.play_url ? (
                            <video
                                controls
                                className="video-player-element"
                                poster={video.thumbnail}
                                src={video.play_url}
                            >
                                您的浏览器不支持视频播放
                            </video>
                        ) : (
                            <div className="video-placeholder">
                                <img
                                    src={video.thumbnail || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4'}
                                    alt={video.title}
                                />
                                <div className="play-button">▶</div>
                            </div>
                        )}
                    </div>

                    <div className="video-info">
                        <h1 className="video-title">{video.title}</h1>

                        <div className="video-meta-info">
                            <div className="views-count">
                                <span>👁️ {video.views || 0} 观看</span>
                            </div>
                            <div className="upload-time">
                                发布于 {video.uploadTime || '刚刚'}
                            </div>
                        </div>

                        {video.description && (
                            <div className="video-description">
                                <p>{video.description}</p>
                            </div>
                        )}

                        {video.tags && video.tags.length > 0 && (
                            <div className="video-tags">
                                {video.tags.map(tag => (
                                    <span key={tag} className="tag">#{tag}</span>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="author-section">
                        <Link to={`/user/${video.authorId || 1}`} className="author-info">
                            <img
                                src={video.avatar || DEFAULT_AVATAR}
                                alt={video.author}
                                className="author-avatar"
                                onError={handleImageError}
                            />
                            <div className="author-details">
                                <h3>{video.author || '用户'}</h3>
                                <p>短视频创作者</p>
                            </div>
                        </Link>

                        <div className="author-actions">
                            {currentUser && currentUser.id !== video.authorId && (
                                <FollowButton
                                    userId={video.authorId}
                                    initialIsFollowing={video.isFollowing || isFollowing}
                                    onFollowChange={handleFollowChange}
                                    size="medium"
                                    showText={true}
                                    className="follow-btn"
                                />
                            )}
                            {currentUser && currentUser.id !== video.authorId && (
                                <button className="message-btn">私信</button>
                            )}
                        </div>
                    </div>

                    <div className="comment-input-section">
                        <h3>发表评论</h3>
                        <CommentInput
                            videoId={video.id}
                            currentUser={currentUser}
                            onCommentSubmit={handleCommentSubmit}
                        />
                    </div>

                    <div className="comments-section">
                        <CommentList
                            key={`comment-list-${video.id}-${newCommentAdded}`}
                            ref={commentListRef}
                            videoId={video.id}
                            initialComments={[]}
                        />
                    </div>
                </div>

                <div className="interaction-section">
                    <div className="interaction-buttons">
                        <button
                            className={`interaction-btn like-btn ${isLiked ? 'liked' : ''} ${isLiking ? 'loading' : ''}`}
                            onClick={handleLike}
                            disabled={isLiking || isDisliking}
                        >
                            <span className="icon">{isLiked ? '❤️' : '🤍'}</span>
                            <span className="count">{video.likes || 0}</span>
                            {isLiking && <span className="loading-dot">...</span>}
                        </button>

                        <button
                            className={`interaction-btn dislike-btn ${isDisliked ? 'disliked' : ''} ${isDisliking ? 'loading' : ''}`}
                            onClick={handleDislike}
                            disabled={isDisliking || isLiking}
                        >
                            <span className="icon">{isDisliked ? '👎🏼' : '👎'}</span>
                            <span className="count">{video.dislikes || 0}</span>
                            {isDisliking && <span className="loading-dot">...</span>}
                        </button>

                        <button className="interaction-btn comment-btn">
                            <span className="icon">💬</span>
                            <span className="count">{video.comments || 0}</span>
                        </button>

                        <button className="interaction-btn share-btn">
                            <span className="icon">↪️</span>
                            <span className="count">{video.shares || 0}</span>
                        </button>

                        <button
                            className={`interaction-btn collect-btn ${isCollected ? 'collected' : ''}`}
                            onClick={handleCollect}
                            disabled={isCollecting}
                        >
                            <span className="icon">{isCollected ? '⭐️' : '⭐'}</span>
                            <span className="count">{collectionCount}</span>
                            {isCollecting && <span className="loading-dot">...</span>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VideoDetail;
