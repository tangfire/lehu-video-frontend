import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { videoApi } from '../../api/video';
import { favoriteApi } from '../../api/favorite';
import { getCurrentUser } from '../../api/user';
import CommentList from '../../components/Comment/CommentList';
import CommentInput from '../../components/Comment/CommentInput';
import FollowButton from '../../components/Follow/FollowButton';
import CollectionSelector from '../../components/Collection/CollectionSelector';
import { formatVideoData, FALLBACK_COVER } from '../../utils/dataFormat';
import { FiAlertCircle, FiBookmark, FiEye, FiHeart, FiMessageCircle, FiSend, FiThumbsDown } from 'react-icons/fi';
import './VideoDetail.css';

const DEFAULT_AVATAR = '/default-avatar.png';

const LikeErrorToast = ({ error, onClose }) => {
    if (!error) return null;
    return (
        <div className="like-error-toast" onClick={onClose}>
            <div className="like-error-content">
                <FiAlertCircle className="like-error-icon" />
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
    const [isCollecting] = useState(false);
    const [showCollectionSelector, setShowCollectionSelector] = useState(false);
    const [isCollected, setIsCollected] = useState(false);
    const [collectionCount, setCollectionCount] = useState(0);

    const commentListRef = useRef(null);

    useEffect(() => {
        const user = getCurrentUser();
        setCurrentUser(user);
    }, []);

    useEffect(() => {
        if (id) {
            fetchVideoDetail();
        }
    }, [id]);

    // 当用户登录状态变化或视频ID变化时，重新获取点赞状态
    useEffect(() => {
        if (video && currentUser) {
            fetchLikeStatus();
        }
    }, [currentUser, video?.id]);

    const fetchVideoDetail = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await videoApi.getVideoById(id);
            if (response && response.video) {
                const videoData = response.video;
                const formattedVideo = formatVideoData(videoData);
                setVideo(formattedVideo);
                setIsCollected(formattedVideo.isCollected || false);
                setCollectionCount(formattedVideo.collectedCount || 0);
                setIsLiked(formattedVideo.isFavorite || false);
                setIsDisliked(false);
                setIsFollowing(formattedVideo.isFollowing || false);
            } else {
                setError('视频不存在或已删除');
            }
        } catch (error) {
            setError(`获取视频失败: ${error.message || '未知错误'}`);
        } finally {
            setLoading(false);
        }
    };

    const fetchLikeStatus = async () => {
        try {
            const res = await favoriteApi.checkFavoriteStatus({
                target: 0,
                type: 0,
                id: video.id
            });
            // res 包含 total_likes, total_dislikes, is_favorite, favorite_type
            setVideo(prev => ({
                ...prev,
                likes: res.total_likes || prev.likes,
                dislikes: res.total_dislikes || prev.dislikes,
                isFavorite: res.is_favorite && res.favorite_type === 0,
                isDisliked: res.is_favorite && res.favorite_type === 1
            }));
            setIsLiked(res.is_favorite && res.favorite_type === 0);
            setIsDisliked(res.is_favorite && res.favorite_type === 1);
        } catch (error) {
            setLikeError(error.message || '互动状态同步失败');
            setTimeout(() => setLikeError(null), 3000);
        }
    };

    const handleLike = useCallback(async () => {
        if (!currentUser) {
            setLikeError('请先登录后才能点赞');
            setTimeout(() => setLikeError(null), 3000);
            return;
        }
        if (!video || isLiking) return;

        setIsLiking(true);
        setLikeError(null);

        try {
            const response = isLiked
                ? await favoriteApi.unlikeVideo(video.id)
                : await favoriteApi.likeVideo(video.id);

            if (response) {
                setVideo(prev => ({
                    ...prev,
                    likes: response.total_likes !== undefined ? response.total_likes : prev.likes,
                    dislikes: response.total_dislikes !== undefined ? response.total_dislikes : prev.dislikes,
                    isFavorite: !isLiked,
                    isDisliked: false
                }));
                setIsLiked(!isLiked);
                setIsDisliked(false);
            }
        } catch (error) {
            setLikeError(error.message || '操作失败，请稍后重试');
        } finally {
            setIsLiking(false);
        }
    }, [video, currentUser, isLiked, isLiking]);

    const handleDislike = useCallback(async () => {
        if (!currentUser) {
            setLikeError('请先登录后才能点踩');
            setTimeout(() => setLikeError(null), 3000);
            return;
        }
        if (!video || isDisliking) return;

        setIsDisliking(true);
        setLikeError(null);

        try {
            const response = isDisliked
                ? await favoriteApi.undislikeVideo(video.id)
                : await favoriteApi.dislikeVideo(video.id);

            if (response) {
                setVideo(prev => ({
                    ...prev,
                    likes: response.total_likes !== undefined ? response.total_likes : prev.likes,
                    dislikes: response.total_dislikes !== undefined ? response.total_dislikes : prev.dislikes,
                    isDisliked: !isDisliked,
                    isFavorite: false
                }));
                setIsDisliked(!isDisliked);
                setIsLiked(false);
            }
        } catch (error) {
            setLikeError(error.message || '操作失败，请稍后重试');
        } finally {
            setIsDisliking(false);
        }
    }, [video, currentUser, isDisliked, isDisliking]);
    const handleFollowChange = (isFollowing) => {
        setIsFollowing(isFollowing);
        setVideo(prev => ({ ...prev, isFollowing }));
    };

    const handleCommentSubmit = () => {
        if (video) {
            setVideo(prev => ({ ...prev, comments: (prev.comments || 0) + 1 }));
        }
        setNewCommentAdded(prev => prev + 1);
        if (commentListRef.current?.reload) commentListRef.current.reload();
    };

    const handleCollect = () => {
        if (!currentUser) {
            setLikeError('请先登录后才能收藏');
            setTimeout(() => setLikeError(null), 3000);
            return;
        }
        setShowCollectionSelector(true);
    };

    const handleCollectionSuccess = () => {
        setIsCollected(true);
        setCollectionCount(prev => prev + 1);
        setVideo(prev => ({
            ...prev,
            isCollected: true,
            collectedCount: (prev.collectedCount || 0) + 1
        }));
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
                <button onClick={() => navigate('/')} className="back-home-btn">返回首页</button>
                <button onClick={fetchVideoDetail} className="retry-btn" style={{ marginLeft: '10px' }}>重试</button>
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

    return (
        <div className="video-detail-container">
            <LikeErrorToast error={likeError} onClose={() => setLikeError(null)} />
            {showCollectionSelector && (
                <div className="collection-modal-overlay">
                    <CollectionSelector
                        videoId={video.id}
                        onClose={() => setShowCollectionSelector(false)}
                        onSuccess={handleCollectionSuccess}
                    />
                </div>
            )}
            <button className="back-button" onClick={() => navigate(-1)}>← 返回</button>

            <div className="video-detail-content">
                <div className="video-player-section">
                    <div className="video-player">
                        {video.play_url || video.videoUrl ? (
                            <video
                                controls
                                className="video-player-element"
                                poster={video.thumbnail || video.cover_url || FALLBACK_COVER}
                                src={video.play_url || video.videoUrl}
                            >您的浏览器不支持视频播放</video>
                        ) : (
                            <div className="video-placeholder">
                                <img src={video.thumbnail || video.cover_url || FALLBACK_COVER} alt={video.title} />
                                <div className="play-button">播放</div>
                            </div>
                        )}
                    </div>

                    <div className="video-info">
                        <h1 className="video-title">{video.title}</h1>
                        <div className="video-meta-info">
                            <span className="views-count"><FiEye /> {video.views || 0} 观看</span>
                            <span className="upload-time">发布于 {video.uploadTime || '刚刚'}</span>
                        </div>
                        {video.description && <div className="video-description"><p>{video.description}</p></div>}
                        {video.tags?.length > 0 && (
                            <div className="video-tags">
                                {video.tags.map(tag => <span key={tag} className="tag">#{tag}</span>)}
                            </div>
                        )}
                    </div>

                    <div className="author-section">
                        <Link to={`/user/${video.authorId || 1}`} className="author-info">
                            <img src={video.avatar || DEFAULT_AVATAR} alt={video.author} className="author-avatar" />
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
                            <span className="icon"><FiHeart /></span>
                            <span className="count">{video.likes || 0}</span>
                            {isLiking && <span className="loading-dot">...</span>}
                        </button>

                        <button
                            className={`interaction-btn dislike-btn ${isDisliked ? 'disliked' : ''} ${isDisliking ? 'loading' : ''}`}
                            onClick={handleDislike}
                            disabled={isDisliking || isLiking}
                        >
                            <span className="icon"><FiThumbsDown /></span>
                            <span className="count">{video.dislikes || 0}</span>
                            {isDisliking && <span className="loading-dot">...</span>}
                        </button>

                        <button className="interaction-btn comment-btn">
                            <span className="icon"><FiMessageCircle /></span>
                            <span className="count">{video.comments || 0}</span>
                        </button>

                        <button className="interaction-btn share-btn">
                            <span className="icon"><FiSend /></span>
                            <span className="count">{video.shares || 0}</span>
                        </button>

                        <button
                            className={`interaction-btn collect-btn ${isCollected ? 'collected' : ''}`}
                            onClick={handleCollect}
                            disabled={isCollecting}
                        >
                            <span className="icon"><FiBookmark /></span>
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
