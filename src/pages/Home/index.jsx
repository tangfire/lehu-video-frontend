import { useState, useEffect } from 'react';
import VideoCard from '../../components/Common/VideoCard';
import { FiTrendingUp, FiHeart, FiCompass, FiMapPin } from 'react-icons/fi';
import { IoSparkles } from 'react-icons/io5';
import { videoApi } from '../../api/video';
import { getCurrentUser } from '../../api/user';
import { formatVideoData } from '../../utils/dataFormat';
import './Home.css';

const Home = () => {
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('recommend');
    const [hasMore, setHasMore] = useState(true);
    const [nextTime, setNextTime] = useState(Math.floor(Date.now() / 1000));
    const [error, setError] = useState(null);

    // 获取视频流
    const fetchVideos = async (latestTime = nextTime, isLoadMore = false) => {
        try {
            setLoading(true);
            setError(null);

            const user = getCurrentUser();

            console.log('开始获取视频流:', {
                latestTime,
                userId: user?.id,
                isLoadMore
            });

            const response = await videoApi.feedShortVideo({
                latest_time: latestTime,
                user_id: user?.id || 0,
                feed_num: 10
            });

            console.log('视频流响应:', response);

            if (response && response.videos) {
                // 格式化视频数据
                const mappedVideos = response.videos.map(video => formatVideoData(video));

                if (isLoadMore) {
                    setVideos(prev => [...prev, ...mappedVideos]);
                } else {
                    setVideos(mappedVideos);
                }

                // 更新下一次请求的时间
                if (response.next_time) {
                    setNextTime(Math.floor(response.next_time));
                } else {
                    setNextTime(Math.floor(Date.now() / 1000));
                }

                setHasMore(response.videos.length >= 10);
            } else {
                console.warn('没有获取到视频数据');
                setHasMore(false);
            }
        } catch (error) {
            console.error('获取视频失败:', error);
            setError(`获取视频失败: ${error.message || '未知错误'}`);

            // 如果是int64类型错误，提示用户
            if (error.message && error.message.includes('int64')) {
                setError('数据格式错误，请确保时间戳为整数');
            }

            // 如果请求失败，可以尝试使用模拟数据
            if (!isLoadMore) {
                loadMockData();
            }
        } finally {
            setLoading(false);
        }
    };

    // 加载模拟数据（备用）
    const loadMockData = () => {
        console.log('加载模拟数据');
        const mockVideos = [
            {
                id: 1,
                title: '演示视频：美丽的风景',
                author: '系统演示',
                authorId: 1,
                avatar: './default-avatar.png',
                views: '12500',
                likes: '1200',
                comments: 342,
                thumbnail: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
                duration: '2:45',
                uploadTime: '2小时前',
                tags: ['演示', '风景']
            },
            {
                id: 2,
                title: '演示视频：美食制作',
                author: '系统演示',
                authorId: 1,
                avatar: './default-avatar.png',
                views: '8700',
                likes: '900',
                comments: 123,
                thumbnail: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
                duration: '4:20',
                uploadTime: '5小时前',
                tags: ['演示', '美食']
            }
        ];

        setVideos(mockVideos);
        setHasMore(false);
    };

    // 首次加载
    useEffect(() => {
        fetchVideos();
    }, []);

    const tabs = [
        { key: 'recommend', label: '推荐', icon: <IoSparkles /> },
        { key: 'following', label: '关注', icon: <FiHeart /> },
        { key: 'hot', label: '热门', icon: <FiTrendingUp /> },
        { key: 'nearby', label: '附近', icon: <FiMapPin /> }
    ];

    const handleLoadMore = () => {
        if (!loading && hasMore) {
            fetchVideos(nextTime, true);
        }
    };

    if (loading && videos.length === 0) {
        return (
            <div className="home-loading">
                <div className="loading-animation">
                    <div className="pulse"></div>
                    <div className="pulse delay-1"></div>
                    <div className="pulse delay-2"></div>
                </div>
                <p>正在发现精彩内容...</p>
            </div>
        );
    }

    return (
        <div className="home-container">
            {/* 固定导航栏 */}
            <div className="sticky-nav">
                <div className="home-tabs">
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            className={`tab-button ${activeTab === tab.key ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.key)}
                        >
                            <span className="tab-icon">{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* 主内容区域 */}
            <main className="home-content">
                {/* 错误提示 */}
                {error && (
                    <div className="error-banner">
                        <div className="error-content">
                            <p>{error}</p>
                            <button onClick={() => fetchVideos()} className="retry-btn">
                                重试
                            </button>
                        </div>
                    </div>
                )}

                {/* 欢迎横幅 */}
                <div className="welcome-banner">
                    <div className="banner-content">
                        <h2>发现今日精彩</h2>
                        <p>探索来自全球创作者的优质短视频内容</p>
                    </div>
                    <div className="banner-stats">
                        <div className="stat">
                            <span className="number">{videos.length}</span>
                            <span className="label">推荐视频</span>
                        </div>
                        <div className="stat">
                            <span className="number">0</span>
                            <span className="label">今日观看</span>
                        </div>
                    </div>
                </div>

                {/* 视频网格 */}
                {videos.length > 0 ? (
                    <div className="video-feed">
                        {videos.map(video => (
                            <VideoCard key={video.id} video={video} />
                        ))}
                    </div>
                ) : (
                    <div className="empty-videos">
                        <div className="empty-icon">📹</div>
                        <h3>暂无视频内容</h3>
                        <p>暂时没有找到视频，请稍后再试</p>
                        <button onClick={() => fetchVideos()} className="retry-btn">
                            刷新
                        </button>
                    </div>
                )}

                {/* 加载更多 */}
                {hasMore && (
                    <div className="load-more">
                        <button
                            className="load-more-btn"
                            onClick={handleLoadMore}
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <span className="spinner"></span>
                                    加载中...
                                </>
                            ) : (
                                '发现更多精彩'
                            )}
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
};

export default Home;