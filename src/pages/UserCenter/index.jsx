import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {getCurrentUser} from "../../api/user.js";
import { Link } from 'react-router-dom';

const UserCenter = () => {
    const { userId } = useParams();
    const [userInfo, setUserInfo] = useState(null);
    const [videos, setVideos] = useState([]);
    const [activeTab, setActiveTab] = useState('videos');

    // 模拟数据
    useEffect(() => {
        // 这里应该调用API获取用户信息
        const mockUser = {
            id: userId,
            username: '短视频创作者',
            avatar: 'https://randomuser.me/api/portraits/men/1.jpg',
            bio: '热爱生活，分享美好瞬间',
            stats: {
                followers: 1234,
                following: 567,
                likes: 8901,
                videos: 45
            }
        };

        const mockVideos = [
            { id: 1, title: '美丽的风景', views: '1.2万', likes: '1234', thumbnail: 'https://picsum.photos/300/400' },
            { id: 2, title: '美食分享', views: '8.5千', likes: '876', thumbnail: 'https://picsum.photos/300/401' },
            // ... 更多视频
        ];

        setUserInfo(mockUser);
        setVideos(mockVideos);
    }, [userId]);

    if (!userInfo) {
        return <div>加载中...</div>;
    }

    return (
        <div className="user-center">
            {/* 用户信息卡片 */}
            <div className="user-profile">
                <div className="profile-header">
                    <img src={userInfo.avatar} alt="用户头像" className="user-avatar" />
                    <div className="profile-info">
                        <h1>{userInfo.username}</h1>
                        <p className="user-bio">{userInfo.bio}</p>

                        <div className="user-stats">
                            <div className="stat-item">
                                <strong>{userInfo.stats.followers}</strong>
                                <span>粉丝</span>
                            </div>
                            <div className="stat-item">
                                <strong>{userInfo.stats.following}</strong>
                                <span>关注</span>
                            </div>
                            <div className="stat-item">
                                <strong>{userInfo.stats.likes}</strong>
                                <span>获赞</span>
                            </div>
                            <div className="stat-item">
                                <strong>{userInfo.stats.videos}</strong>
                                <span>作品</span>
                            </div>
                        </div>

                        <div className="profile-actions">
                            <button className="btn btn-primary">关注</button>
                            <button className="btn btn-secondary">私信</button>
                            <button className="btn btn-outline">分享</button>

                            {/* 如果是自己的用户中心，显示设置按钮 */}
                            {userInfo.id === getCurrentUser()?.id && (
                                <Link to="/settings" className="btn btn-outline">
                                    ⚙️ 设置
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* 标签页 */}
            <div className="user-tabs">
                <button
                    className={`tab-btn ${activeTab === 'videos' ? 'active' : ''}`}
                    onClick={() => setActiveTab('videos')}
                >
                    作品
                </button>
                <button
                    className={`tab-btn ${activeTab === 'likes' ? 'active' : ''}`}
                    onClick={() => setActiveTab('likes')}
                >
                    喜欢
                </button>
                <button
                    className={`tab-btn ${activeTab === 'collections' ? 'active' : ''}`}
                    onClick={() => setActiveTab('collections')}
                >
                    收藏
                </button>
                <button
                    className={`tab-btn ${activeTab === 'about' ? 'active' : ''}`}
                    onClick={() => setActiveTab('about')}
                >
                    关于
                </button>
            </div>

            {/* 内容区域 */}
            <div className="user-content">
                {activeTab === 'videos' && (
                    <div className="video-grid">
                        {videos.map(video => (
                            <div key={video.id} className="video-item">
                                <img src={video.thumbnail} alt={video.title} />
                                <div className="video-info">
                                    <h3>{video.title}</h3>
                                    <div className="video-stats">
                                        <span>👁️ {video.views}</span>
                                        <span>❤️ {video.likes}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'about' && (
                    <div className="about-section">
                        <h3>个人介绍</h3>
                        <p>{userInfo.bio}</p>

                        <div className="user-details">
                            <h4>详细信息</h4>
                            <p>注册时间: 2024-01-01</p>
                            <p>最后登录: 2024-01-15</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserCenter;