import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import VideoCard from '../../components/Common/VideoCard';
import { FiTrendingUp, FiHeart, FiRefreshCw, FiUpload } from 'react-icons/fi';
import { IoSparkles } from 'react-icons/io5';
import { videoApi } from '../../api/video';
import { getCurrentUser } from '../../api/user';
import { formatVideoData } from '../../utils/dataFormat';
import './Home.css';

const FEED_TYPES = {
    following: 0,
    recommend: 1,
    hot: 2
};

const Home = () => {
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('recommend');
    const [hasMore, setHasMore] = useState(true);
    const [nextTime, setNextTime] = useState(Math.floor(Date.now() / 1000));
    const [error, setError] = useState(null);

    const fetchVideos = async ({
        latestTime = Math.floor(Date.now() / 1000),
        isLoadMore = false,
        tab = activeTab
    } = {}) => {
        try {
            setLoading(true);
            setError(null);

            const user = getCurrentUser();

            const response = await videoApi.feedShortVideo({
                latest_time: latestTime,
                user_id: user?.id || "0",
                feed_num: 10,
                feed_type: FEED_TYPES[tab] ?? FEED_TYPES.recommend
            });

            if (response && response.videos) {
                const mappedVideos = response.videos
                    .map(formatVideoData)
                    .filter(Boolean);

                if (isLoadMore) {
                    setVideos(prev => [...prev, ...mappedVideos]);
                } else {
                    setVideos(mappedVideos);
                }

                if (response.next_time) {
                    setNextTime(Math.floor(response.next_time));
                } else {
                    setNextTime(Math.floor(Date.now() / 1000));
                }

                setHasMore(response.videos.length >= 10);
            } else {
                if (!isLoadMore) setVideos([]);
                setHasMore(false);
            }
        } catch (error) {
            setError(`获取视频失败: ${error.message || '未知错误'}`);
            if (!isLoadMore) setVideos([]);
            setHasMore(false);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const freshTime = Math.floor(Date.now() / 1000);
        setNextTime(freshTime);
        setVideos([]);
        setHasMore(true);
        fetchVideos({ latestTime: freshTime, tab: activeTab });
    }, [activeTab]);

    const tabs = [
        { key: 'recommend', label: '推荐', icon: <IoSparkles /> },
        { key: 'following', label: '关注', icon: <FiHeart /> },
        { key: 'hot', label: '热门', icon: <FiTrendingUp /> }
    ];

    const handleLoadMore = () => {
        if (!loading && hasMore) {
            fetchVideos({ latestTime: nextTime, isLoadMore: true });
        }
    };

    const handleRefresh = () => {
        const freshTime = Math.floor(Date.now() / 1000);
        setNextTime(freshTime);
        fetchVideos({ latestTime: freshTime, tab: activeTab });
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
            <div className="sticky-nav">
                <div className="home-tabs">
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            className={`tab-button ${activeTab === tab.key ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.key)}
                        >
                            <span className="tab-icon">{tab.icon}</span>
                            <span className="tab-text">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <main className="home-content">
                <div className="feed-toolbar">
                    <div>
                        <h1>视频流</h1>
                        <p>{tabs.find(tab => tab.key === activeTab)?.label || '推荐'}内容</p>
                    </div>
                    <div className="feed-actions">
                        <button className="icon-action" onClick={handleRefresh} disabled={loading} title="刷新">
                            <FiRefreshCw />
                            <span>刷新</span>
                        </button>
                        <Link className="publish-action" to="/upload">
                            <FiUpload />
                            <span>发布</span>
                        </Link>
                    </div>
                </div>

                {error && (
                    <div className="error-banner">
                        <div className="error-content">
                            <p>{error}</p>
                            <button onClick={handleRefresh} className="retry-btn">
                                重试
                            </button>
                        </div>
                    </div>
                )}

                {videos.length > 0 ? (
                    <div className="video-feed">
                        {videos.map(video => (
                            <VideoCard key={video.id} video={video} />
                        ))}
                    </div>
                ) : (
                    <div className="empty-videos">
                        <FiUpload className="empty-icon" />
                        <h3>暂无视频内容</h3>
                        <p>{error ? '接口暂时不可用，修复后刷新即可看到内容' : '这个分类还没有视频，可以先发布一个'}</p>
                        <button onClick={handleRefresh} className="retry-btn">
                            刷新
                        </button>
                    </div>
                )}

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
