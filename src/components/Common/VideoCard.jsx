import { Link } from 'react-router-dom';
import { FiEye, FiHeart, FiMessageCircle } from 'react-icons/fi';
import './VideoCard.css';

const VideoCard = ({ video }) => {
    // 获取封面图片URL
    const getThumbnailUrl = () => {
        if (video.cover_url) return video.cover_url;
        if (video.thumbnail) return video.thumbnail;
        if (video.coverUrl) return video.coverUrl;
        return 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80';
    };

    // 获取头像URL
    const getAvatarUrl = () => {
        if (video.avatar) return video.avatar;
        if (video.author?.avatar) return video.author.avatar;
        return '/default-avatar.png';
    };

    return (
        <div className="video-card">
            <Link to={`/video/${video.id}`} className="video-link">
                <div className="video-thumbnail">
                    <img
                        src={getThumbnailUrl()}
                        alt={video.title}
                        loading="lazy"
                        onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80';
                        }}
                    />
                    <div className="video-duration">{video.duration || '0:00'}</div>
                    <div className="video-overlay"></div>
                </div>

                <div className="video-content">
                    <div className="video-author">
                        <img
                            src={getAvatarUrl()}
                            alt={video.author}
                            className="author-avatar"
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = '/default-avatar.png';
                            }}
                        />
                        <span className="author-name">{video.author || '用户'}</span>
                    </div>

                    <h3 className="video-title">{video.title || '未命名视频'}</h3>

                    <div className="video-stats">
                        <div className="stat">
                            <FiEye />
                            <span>{video.views || video.viewCount || 0}</span>
                        </div>
                        <div className="stat">
                            <FiHeart />
                            <span>{video.likes || video.favoriteCount || 0}</span>
                        </div>
                        <div className="stat">
                            <FiMessageCircle />
                            <span>{video.comments || video.commentCount || 0}</span>
                        </div>
                    </div>

                    <div className="video-meta">
                        <span className="upload-time">{video.uploadTime || '刚刚'}</span>
                    </div>
                </div>
            </Link>
        </div>
    );
};

export default VideoCard;