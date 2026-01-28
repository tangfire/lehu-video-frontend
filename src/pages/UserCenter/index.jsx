import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getCurrentUser } from '../../api/user';
import { Link } from 'react-router-dom';
import VideoCard from '../../components/Common/VideoCard';
import FollowList from '../../components/Follow/FollowList';
import FollowButton from '../../components/Follow/FollowButton';
import './UserCenter.css';

const UserCenter = () => {
    const { userId } = useParams();
    const [userInfo, setUserInfo] = useState(null);
    const [videos, setVideos] = useState([]);
    const [activeTab, setActiveTab] = useState('videos');
    const [followType, setFollowType] = useState('following');
    const [stats, setStats] = useState({
        followingCount: 0,
        followerCount: 0,
        videoCount: 0,
        likeCount: 0
    });
    const [isFollowing, setIsFollowing] = useState(false);

    // 获取当前登录用户
    const currentUser = getCurrentUser();
    const isCurrentUser = currentUser?.id?.toString() === userId;

    // 模拟获取用户信息
    useEffect(() => {
        // TODO: 这里应该调用API获取真实的用户信息
        const mockUser = {
            id: userId,
            name: '短视频创作者',
            avatar: 'https://randomuser.me/api/portraits/men/1.jpg',
            bio: '热爱生活，分享美好瞬间',
            isFollowing: false
        };

        const mockVideos = [
            {
                id: 1,
                title: '美丽的风景',
                author: '短视频创作者',
                authorId: userId,
                avatar: 'https://randomuser.me/api/portraits/men/1.jpg',
                views: 12000,
                likes: 1234,
                comments: 342,
                thumbnail: 'https://picsum.photos/300/400',
                duration: '2:45',
                uploadTime: '2小时前',
                tags: ['风景', '自然']
            },
            // ... 更多视频
        ];

        const mockStats = {
            followingCount: 156,
            followerCount: 1234,
            videoCount: 45,
            likeCount: 8901
        };

        setUserInfo(mockUser);
        setVideos(mockVideos);
        setStats(mockStats);
        setIsFollowing(mockUser.isFollowing);
    }, [userId]);

    const handleFollowChange = (following) => {
        setIsFollowing(following);
        setStats(prev => ({
            ...prev,
            followerCount: following ? prev.followerCount + 1 : prev.followerCount - 1
        }));
    };

    if (!userInfo) {
        return <div className="loading-container">加载中...</div>;
    }

    const tabs = [
        { key: 'videos', label: '作品', icon: '🎬' },
        { key: 'likes', label: '喜欢', icon: '❤️' },
        { key: 'collections', label: '收藏', icon: '⭐' },
        { key: 'follow', label: '关注', icon: '👥' }
    ];

    const followTabs = [
        { key: 'following', label: '关注' },
        { key: 'followers', label: '粉丝' },
        { key: 'mutual', label: '互相关注' }
    ];

    return (
        <div className="user-center">
            {/* 用户信息卡片 */}
            <div className="user-profile">
                <div className="profile-header">
                    <img src={userInfo.avatar} alt="用户头像" className="user-avatar" />
                    <div className="profile-info">
                        <h1>{userInfo.name}</h1>
                        <p className="user-bio">{userInfo.bio}</p>

                        <div className="user-stats">
                            <Link to={`/user/${userId}/follow?type=following`} className="stat-item">
                                <strong>{stats.followingCount}</strong>
                                <span>关注</span>
                            </Link>
                            <Link to={`/user/${userId}/follow?type=followers`} className="stat-item">
                                <strong>{stats.followerCount}</strong>
                                <span>粉丝</span>
                            </Link>
                            <div className="stat-item">
                                <strong>{stats.likeCount}</strong>
                                <span>获赞</span>
                            </div>
                            <div className="stat-item">
                                <strong>{stats.videoCount}</strong>
                                <span>作品</span>
                            </div>
                        </div>

                        <div className="profile-actions">
                            {!isCurrentUser ? (
                                <>
                                    <FollowButton
                                        userId={parseInt(userId)}
                                        initialIsFollowing={isFollowing}
                                        onFollowChange={handleFollowChange}
                                        size="medium"
                                        showText={true}
                                        className="follow-btn"
                                    />
                                    <button className="btn btn-secondary">私信</button>
                                    <button className="btn btn-outline">分享</button>
                                </>
                            ) : (
                                <>
                                    <Link to="/upload" className="btn btn-primary">
                                        上传视频
                                    </Link>
                                    <Link to="/settings" className="btn btn-outline">
                                        ⚙️ 设置
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* 主标签页 */}
            <div className="user-tabs">
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.key)}
                    >
                        {tab.icon && <span className="tab-icon">{tab.icon}</span>}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* 内容区域 */}
            <div className="user-content">
                {activeTab === 'videos' && (
                    <div className="video-grid">
                        {videos.map(video => (
                            <VideoCard key={video.id} video={video} />
                        ))}
                    </div>
                )}

                {activeTab === 'likes' && (
                    <div className="empty-state">
                        <div className="empty-icon">❤️</div>
                        <h3>还没有喜欢的视频</h3>
                        <p>去发现你喜欢的视频吧</p>
                    </div>
                )}

                {activeTab === 'collections' && (
                    <div className="empty-state">
                        <div className="empty-icon">⭐</div>
                        <h3>还没有收藏的视频</h3>
                        <p>将喜欢的视频收藏起来吧</p>
                    </div>
                )}

                {activeTab === 'follow' && (
                    <div className="follow-content">
                        {/* 关注子标签页 */}
                        <div className="follow-sub-tabs">
                            {followTabs.map(tab => (
                                <button
                                    key={tab.key}
                                    className={`follow-tab-btn ${followType === tab.key ? 'active' : ''}`}
                                    onClick={() => setFollowType(tab.key)}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* 关注列表 */}
                        <div className="follow-list-wrapper">
                            <FollowList
                                userId={parseInt(userId)}
                                type={followType}
                                showTitle={false}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserCenter;