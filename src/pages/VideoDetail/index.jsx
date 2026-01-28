import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { videoApi } from '../../api/video';
import { getCurrentUser } from '../../api/user';
import { formatVideoData } from '../../utils/dataFormat';
import CommentList from '../../components/Comment/CommentList';
import CommentInput from '../../components/Comment/CommentInput';
import './VideoDetail.css';

const DEFAULT_AVATAR = '/default-avatar.png';

const VideoDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [video, setVideo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isLiked, setIsLiked] = useState(false);
    const [isFollowing, setIsFollowing] = useState(false);
    const [error, setError] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [newCommentAdded, setNewCommentAdded] = useState(0); // 用于触发评论列表更新

    // 评论列表ref，用于调用其内部方法
    const commentListRef = useRef(null);

    useEffect(() => {
        if (id) {
            fetchVideoDetail();
        }

        // 获取当前用户信息
        const user = getCurrentUser();
        setCurrentUser(user);
    }, [id]);

    const fetchVideoDetail = async () => {
        try {
            setLoading(true);
            setError(null);

            console.log('开始获取视频详情，ID:', id);

            const response = await videoApi.getVideoById(id);

            console.log('视频详情响应:', response);

            if (response && response.video) {
                const formattedVideo = formatVideoData(response.video);
                setVideo(formattedVideo);
                setIsLiked(formattedVideo.isFavorite || false);
                setIsFollowing(formattedVideo.isFollowing || false);
            } else {
                setError('视频不存在或已删除');
            }
        } catch (error) {
            console.error('获取视频详情失败:', error);
            setError(`获取视频失败: ${error.message || '未知错误'}`);

            // 如果API失败，加载模拟数据
            loadMockVideo();
        } finally {
            setLoading(false);
        }
    };

    // 加载模拟视频数据（备用）
    const loadMockVideo = () => {
        console.log('加载模拟视频数据');
        const mockVideo = {
            id: parseInt(id) || 1,
            title: '演示视频：美丽的风景',
            description: '这是一个演示视频，展示了美丽的风景。实际视频数据将从服务器获取。',
            author: '系统演示',
            authorId: 1,
            avatar: DEFAULT_AVATAR,
            views: '12500',
            likes: '1200',
            comments: 342,
            shares: 89,
            videoUrl: 'https://example.com/video.mp4',
            thumbnail: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
            uploadTime: '2小时前',
            tags: ['演示', '风景', '自然'],
            isFavorite: false,
            isFollowing: false,
            play_url: '' // 模拟数据可能没有play_url
        };

        setVideo(mockVideo);
        setIsLiked(false);
        setIsFollowing(false);
    };

    const handleLike = () => {
        // 这里需要调用点赞/取消点赞接口
        // 暂时先本地更新
        setIsLiked(!isLiked);
        if (video) {
            setVideo({
                ...video,
                likes: isLiked ? video.likes - 1 : video.likes + 1
            });
        }
    };

    const handleFollow = () => {
        // 这里需要调用关注/取消关注接口
        // 暂时先本地更新
        setIsFollowing(!isFollowing);
    };

    const handleImageError = (e) => {
        e.target.onerror = null;
        e.target.src = DEFAULT_AVATAR;
    };

    // 处理新评论提交
    const handleCommentSubmit = (newComment) => {
        console.log('新评论提交成功:', newComment);

        // 更新评论计数
        if (video) {
            setVideo({
                ...video,
                comments: (video.comments || 0) + 1
            });
        }

        // 触发评论列表重新加载
        setNewCommentAdded(prev => prev + 1);

        // 如果有commentListRef，可以调用其重新加载方法
        if (commentListRef.current) {
            // 这里假设CommentList有reload方法
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

    return (
        <div className="video-detail-container">
            <button className="back-button" onClick={() => navigate(-1)}>
                ← 返回
            </button>

            {error && (
                <div className="video-error-banner">
                    <p>{error}（显示模拟数据）</p>
                </div>
            )}

            <div className="video-detail-content">
                {/* 左侧：视频播放器 */}
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

                    {/* 视频信息 */}
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

                    {/* 作者信息 */}
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
                            <button
                                className={`follow-btn ${isFollowing ? 'following' : ''}`}
                                onClick={handleFollow}
                            >
                                {isFollowing ? '已关注' : '+ 关注'}
                            </button>
                            <button className="message-btn">私信</button>
                        </div>
                    </div>

                    {/* 评论输入区域 */}
                    <div className="comment-input-section">
                        <h3>发表评论</h3>
                        <CommentInput
                            videoId={video.id}
                            currentUser={currentUser}
                            onCommentSubmit={handleCommentSubmit}
                        />
                    </div>

                    {/* 评论列表 */}
                    <div className="comments-section">
                        <CommentList
                            key={`comment-list-${video.id}-${newCommentAdded}`} // 强制重新渲染
                            ref={commentListRef}
                            videoId={video.id}
                            initialComments={[]}
                        />
                    </div>
                </div>

                {/* 右侧：互动区域 */}
                <div className="interaction-section">
                    <div className="interaction-buttons">
                        <button
                            className={`interaction-btn like-btn ${isLiked ? 'liked' : ''}`}
                            onClick={handleLike}
                        >
                            <span className="icon">❤️</span>
                            <span className="count">{isLiked ? (video.likes || 0) + 1 : video.likes || 0}</span>
                        </button>

                        <button className="interaction-btn comment-btn">
                            <span className="icon">💬</span>
                            <span className="count">{video.comments || 0}</span>
                        </button>

                        <button className="interaction-btn share-btn">
                            <span className="icon">↪️</span>
                            <span className="count">{video.shares || 0}</span>
                        </button>

                        <button className="interaction-btn collect-btn">
                            <span className="icon">⭐</span>
                            <span className="text">收藏</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VideoDetail;