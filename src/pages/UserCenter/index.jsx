import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getCurrentUser, getUserDisplayName, getUserAvatar, getUserBackground } from '../../api/user';
import { userApi } from '../../api/user';
import { videoApi } from '../../api/video';
import { friendApi } from '../../api/friend';
import VideoCard from '../../components/Common/VideoCard';
import FollowList from '../../components/Follow/FollowList';
import FollowButton from '../../components/Follow/FollowButton';
import { formatVideoData } from '../../utils/dataFormat';
import './UserCenter.css';

const UserCenter = () => {
    const { userId } = useParams();
    const [userInfo, setUserInfo] = useState(null);
    const [videos, setVideos] = useState([]);
    const [activeTab, setActiveTab] = useState('videos');
    const [followType, setFollowType] = useState('following');
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        followingCount: 0,
        followerCount: 0,
        videoCount: 0,
        likeCount: 0
    });
    const [isFollowing, setIsFollowing] = useState(false);
    const [isFriend, setIsFriend] = useState(false);
    const [friendStatus, setFriendStatus] = useState(null);

    // 获取当前登录用户
    const currentUser = getCurrentUser();
    const isCurrentUser = currentUser?.id?.toString() === userId;
    const navigate = useNavigate();

    // 获取用户信息
    const fetchUserInfo = async () => {
        try {
            setLoading(true);

            // 获取用户基本信息
            const userResponse = await userApi.getUserInfo(userId);
            console.log('用户信息响应:', userResponse);

            if (userResponse && userResponse.user) {
                const userData = userResponse.user;
                setUserInfo(userData);

                // 更新统计信息
                const newStats = {
                    followingCount: userData.follow_count || 0,
                    followerCount: userData.follower_count || 0,
                    videoCount: userData.work_count || 0,
                    likeCount: userData.total_favorited || 0
                };
                setStats(newStats);

                // 设置关系状态
                setIsFollowing(userData.is_following || false);
                setIsFriend(userData.is_friend || false);

                if (userData.is_friend) {
                    setFriendStatus('friend');
                } else if (userData.friend_remark) {
                    setFriendStatus('pending');
                }
            }
        } catch (error) {
            console.error('获取用户信息失败:', error);
        } finally {
            setLoading(false);
        }
    };

    // 获取用户的视频
    const fetchUserVideos = async () => {
        try {
            const response = await videoApi.getUserVideos({
                user_id: userId,
                page_stats: {
                    page: 1,
                    size: 20
                }
            });

            if (response && response.videos) {
                const formattedVideos = response.videos.map(video => formatVideoData(video));
                setVideos(formattedVideos);
            }
        } catch (error) {
            console.error('获取用户视频失败:', error);
        }
    };

    // 检查好友关系
    const checkFriendRelation = async () => {
        if (!currentUser || isCurrentUser) return;

        try {
            const response = await friendApi.checkFriendRelation(userId);
            if (response) {
                setIsFriend(response.is_friend || false);
                setFriendStatus(response.is_friend ? 'friend' : 'none');
            }
        } catch (error) {
            console.error('检查好友关系失败:', error);
        }
    };

    // 添加好友
    const handleAddFriend = async () => {
        try {
            const applyReason = prompt('请输入好友申请理由（可选）：', '');
            await friendApi.sendFriendApply(userId, applyReason || '');
            setFriendStatus('pending');
            alert('好友申请已发送！');
        } catch (error) {
            console.error('发送好友申请失败:', error);
            alert('发送好友申请失败：' + (error.message || '未知错误'));
        }
    };

    // 发送私信
    const handleSendMessage = () => {
        navigate(`/chat/single/${userId}`);
    };

    // 分享用户
    const handleShareUser = () => {
        const shareUrl = `${window.location.origin}/user/${userId}`;
        if (navigator.share) {
            navigator.share({
                title: `${userInfo?.name}的个人主页`,
                text: `看看${userInfo?.name}的短视频主页`,
                url: shareUrl
            });
        } else {
            navigator.clipboard.writeText(shareUrl);
            alert('链接已复制到剪贴板！');
        }
    };

    // 关注状态变化回调
    const handleFollowChange = (isFollowing) => {
        setIsFollowing(isFollowing);
        if (userInfo) {
            setUserInfo({
                ...userInfo,
                is_following: isFollowing
            });
            setStats(prev => ({
                ...prev,
                followerCount: isFollowing ? prev.followerCount + 1 : Math.max(0, prev.followerCount - 1)
            }));
        }
    };

    useEffect(() => {
        if (userId) {
            fetchUserInfo();
            fetchUserVideos();
            checkFriendRelation();
        }
    }, [userId]);

    const tabs = [
        { key: 'videos', label: '作品', icon: '🎬', count: stats.videoCount },
        { key: 'likes', label: '喜欢', icon: '❤️', count: stats.likeCount },
        { key: 'follow', label: '关注', icon: '👥' }
    ];

    const followTabs = [
        { key: 'following', label: '关注' },
        { key: 'followers', label: '粉丝' },
        { key: 'mutual', label: '互相关注' }
    ];

    if (loading && !userInfo) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>加载用户信息中...</p>
            </div>
        );
    }

    if (!userInfo && !loading) {
        return (
            <div className="user-not-found">
                <div className="not-found-icon">👤</div>
                <h2>用户不存在</h2>
                <p>该用户可能已经注销或不存在</p>
                <button onClick={() => navigate('/')} className="back-home-btn">
                    返回首页
                </button>
            </div>
        );
    }

    return (
        <div className="user-center">
            {/* 背景图 */}
            <div
                className="user-background"
                style={{ backgroundImage: `url(${getUserBackground(userInfo)})` }}
            >
                <div className="background-overlay"></div>
            </div>

            {/* 用户信息卡片 */}
            <div className="user-profile">
                <div className="profile-header">
                    <img
                        src={getUserAvatar(userInfo)}
                        alt="用户头像"
                        className="user-avatar"
                        onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/default-avatar.png';
                        }}
                    />
                    <div className="profile-info">
                        <div className="profile-name-section">
                            <h1>{getUserDisplayName(userInfo)}</h1>
                            {userInfo.nickname && userInfo.nickname !== userInfo.name && (
                                <span className="user-nickname">@{userInfo.nickname}</span>
                            )}
                        </div>

                        {userInfo.signature && (
                            <p className="user-bio">{userInfo.signature}</p>
                        )}

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
                                        userId={userId}
                                        initialIsFollowing={isFollowing}
                                        onFollowChange={handleFollowChange}
                                        size="medium"
                                        showText={true}
                                        className="follow-btn"
                                    />

                                    {!isFriend && friendStatus !== 'pending' && (
                                        <button
                                            className="btn btn-primary add-friend-btn"
                                            onClick={handleAddFriend}
                                        >
                                            + 好友
                                        </button>
                                    )}

                                    {friendStatus === 'pending' && (
                                        <button className="btn btn-outline pending-btn" disabled>
                                            申请已发送
                                        </button>
                                    )}

                                    <button
                                        className="btn btn-secondary message-btn"
                                        onClick={handleSendMessage}
                                    >
                                        私信
                                    </button>

                                    <button
                                        className="btn btn-outline share-btn"
                                        onClick={handleShareUser}
                                    >
                                        分享
                                    </button>
                                </>
                            ) : (
                                <>
                                    <Link to="/upload" className="btn btn-primary">
                                        上传视频
                                    </Link>
                                    <Link to="/settings" className="btn btn-outline">
                                        ⚙️ 设置
                                    </Link>
                                    <Link to={`/user/${userId}/follow`} className="btn btn-outline">
                                        👥 我的关注
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
                        {tab.count !== undefined && (
                            <span className="tab-count">{tab.count}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* 内容区域 */}
            <div className="user-content">
                {activeTab === 'videos' && (
                    <div className="video-section">
                        {videos.length > 0 ? (
                            <div className="video-grid">
                                {videos.map(video => (
                                    <VideoCard key={video.id} video={video} />
                                ))}
                            </div>
                        ) : (
                            <div className="empty-state">
                                <div className="empty-icon">🎬</div>
                                <h3>还没有发布视频</h3>
                                <p>去创作你的第一个视频吧！</p>
                                {isCurrentUser && (
                                    <Link to="/upload" className="btn btn-primary">
                                        上传第一个视频
                                    </Link>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'likes' && (
                    <div className="empty-state">
                        <div className="empty-icon">❤️</div>
                        <h3>喜欢的视频</h3>
                        <p>这里会显示你喜欢的视频</p>
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
                                    {tab.key === 'following' && (
                                        <span className="follow-count">{stats.followingCount}</span>
                                    )}
                                    {tab.key === 'followers' && (
                                        <span className="follow-count">{stats.followerCount}</span>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* 关注列表 */}
                        <div className="follow-list-wrapper">
                            <FollowList
                                userId={userId}
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
