import { Link } from 'react-router-dom';
import { FiEye, FiHeart, FiMessageCircle, FiShare2 } from 'react-icons/fi';
import './VideoCard.css';

const VideoCard = ({ video }) => {
    return (
        <div className="video-card">
            <Link to={`/video/${video.id}`} className="video-link">
                <div className="video-thumbnail">
                    <img
                        src={video.thumbnail || video.coverUrl || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4'}
                        alt={video.title}
                        loading="lazy"
                    />
                    <div className="video-duration">{video.duration || '0:00'}</div>
                    <div className="video-overlay"></div>
                </div>

                <div className="video-content">
                    <div className="video-author">
                        <img
                            src={video.avatar || './default-avatar.png'}
                            alt={video.author}
                            className="author-avatar"
                        />
                        <span className="author-name">{video.author || '用户'}</span>
                    </div>

                    <h3 className="video-title">{video.title}</h3>

                    <div className="video-tags">
                        {video.tags?.map((tag, index) => (
                            <span key={index} className="tag">#{tag}</span>
                        ))}
                    </div>

                    <div className="video-stats">
                        <div className="stat">
                            <FiEye />
                            <span>{video.views || 0}</span>
                        </div>
                        <div className="stat">
                            <FiHeart />
                            <span>{video.likes || 0}</span>
                        </div>
                        <div className="stat">
                            <FiMessageCircle />
                            <span>{video.comments || 0}</span>
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