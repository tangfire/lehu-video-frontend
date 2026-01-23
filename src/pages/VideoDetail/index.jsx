import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import './VideoDetail.css';

const VideoDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [video, setVideo] = useState(null);
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newComment, setNewComment] = useState('');
    const [isLiked, setIsLiked] = useState(false);
    const [isFollowing, setIsFollowing] = useState(false);

    useEffect(() => {
        // 模拟API调用
        const mockVideo = {
            id: parseInt(id),
            title: '美丽的日出景色，真的太治愈了',
            description: '拍摄于黄山，凌晨4点起床等待日出，看到的那一刻所有的辛苦都值得了！大自然真的太美了！',
            author: '旅行摄影师',
            authorId: 1,
            avatar: 'https://randomuser.me/api/portraits/men/1.jpg',
            views: '12.5万',
            likes: '1.2万',
            comments: 342,
            shares: 89,
            videoUrl: 'https://example.com/video.mp4', // 实际项目中使用真实的视频URL
            uploadTime: '2小时前',
            tags: ['旅行', '风景', '日出', '黄山', '治愈']
        };

        const mockComments = [
            {
                id: 1,
                user: '用户A',
                avatar: 'https://randomuser.me/api/portraits/women/10.jpg',
                content: '太美了！我也想去黄山看日出！',
                time: '1小时前',
                likes: 123
            },
            {
                id: 2,
                user: '用户B',
                avatar: 'https://randomuser.me/api/portraits/men/11.jpg',
                content: '拍摄技术真不错，构图很好！',
                time: '2小时前',
                likes: 89
            },
            {
                id: 3,
                user: '用户C',
                avatar: 'https://randomuser.me/api/portraits/women/12.jpg',
                content: '这个地方的具体位置在哪里呀？',
                time: '3小时前',
                likes: 45
            }
        ];

        setTimeout(() => {
            setVideo(mockVideo);
            setComments(mockComments);
            setLoading(false);
        }, 500);
    }, [id]);

    const handleLike = () => {
        setIsLiked(!isLiked);
        // 这里应该调用API更新点赞状态
    };

    const handleFollow = () => {
        setIsFollowing(!isFollowing);
        // 这里应该调用API更新关注状态
    };

    const handleCommentSubmit = (e) => {
        e.preventDefault();
        if (newComment.trim()) {
            const newCommentObj = {
                id: comments.length + 1,
                user: '当前用户',
                avatar: 'https://randomuser.me/api/portraits/men/20.jpg',
                content: newComment,
                time: '刚刚',
                likes: 0
            };
            setComments([newCommentObj, ...comments]);
            setNewComment('');
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
            {/* 返回按钮 */}
            <button className="back-button" onClick={() => navigate(-1)}>
                ← 返回
            </button>

            <div className="video-detail-content">
                {/* 左侧：视频播放器 */}
                <div className="video-player-section">
                    <div className="video-player">
                        {/* 实际项目中应该使用视频播放器组件 */}
                        <div className="video-placeholder">
                            <img src={`https://picsum.photos/800/450?random=${id}`} alt="视频封面" />
                            <div className="play-button">▶</div>
                        </div>
                    </div>

                    {/* 视频信息 */}
                    <div className="video-info">
                        <h1 className="video-title">{video.title}</h1>

                        <div className="video-meta-info">
                            <div className="views-count">
                                <span>👁️ {video.views} 观看</span>
                            </div>
                            <div className="upload-time">
                                发布于 {video.uploadTime}
                            </div>
                        </div>

                        <div className="video-description">
                            <p>{video.description}</p>
                            <div className="video-tags">
                                {video.tags.map(tag => (
                                    <span key={tag} className="tag">#{tag}</span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* 作者信息 */}
                    <div className="author-section">
                        <Link to={`/user/${video.authorId}`} className="author-info">
                            <img src={video.avatar} alt={video.author} className="author-avatar" />
                            <div className="author-details">
                                <h3>{video.author}</h3>
                                <p>旅行摄影师 • 12.3万粉丝</p>
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
                </div>

                {/* 右侧：互动区域 */}
                <div className="interaction-section">
                    {/* 互动按钮 */}
                    <div className="interaction-buttons">
                        <button
                            className={`interaction-btn like-btn ${isLiked ? 'liked' : ''}`}
                            onClick={handleLike}
                        >
                            <span className="icon">❤️</span>
                            <span className="count">{isLiked ? parseInt(video.likes) + 1 : video.likes}</span>
                        </button>

                        <button className="interaction-btn comment-btn">
                            <span className="icon">💬</span>
                            <span className="count">{video.comments}</span>
                        </button>

                        <button className="interaction-btn share-btn">
                            <span className="icon">↪️</span>
                            <span className="count">{video.shares}</span>
                        </button>

                        <button className="interaction-btn collect-btn">
                            <span className="icon">⭐</span>
                            <span className="text">收藏</span>
                        </button>
                    </div>

                    {/* 评论区域 */}
                    <div className="comments-section">
                        <h3 className="comments-title">评论 ({comments.length})</h3>

                        {/* 发表评论 */}
                        <form className="comment-form" onSubmit={handleCommentSubmit}>
                            <input
                                type="text"
                                placeholder="写下你的评论..."
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                className="comment-input"
                            />
                            <button type="submit" className="comment-submit-btn">发送</button>
                        </form>

                        {/* 评论列表 */}
                        <div className="comments-list">
                            {comments.map(comment => (
                                <div key={comment.id} className="comment-item">
                                    <img src={comment.avatar} alt={comment.user} className="comment-avatar" />
                                    <div className="comment-content">
                                        <div className="comment-header">
                                            <span className="comment-user">{comment.user}</span>
                                            <span className="comment-time">{comment.time}</span>
                                        </div>
                                        <p className="comment-text">{comment.content}</p>
                                        <div className="comment-actions">
                                            <button className="comment-like-btn">
                                                <span>❤️ {comment.likes}</span>
                                            </button>
                                            <button className="comment-reply-btn">回复</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VideoDetail;