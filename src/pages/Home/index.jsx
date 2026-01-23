import { useState, useEffect, useRef } from 'react';
import VideoCard from '../../components/Common/VideoCard';
import { FiTrendingUp, FiHeart, FiCompass, FiMapPin } from 'react-icons/fi';
import { IoSparkles } from 'react-icons/io5';
import './Home.css';

const Home = () => {
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('recommend');
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const observerRef = useRef(null);

    // 模拟视频数据
    useEffect(() => {
        const mockVideos = [
            {
                id: 1,
                title: '美丽的日出景色，真的太治愈了',
                author: '旅行摄影师',
                authorId: 1,
                avatar: './default-avatar.png',
                views: '12.5万',
                likes: '1.2万',
                comments: 342,
                shares: 89,
                thumbnail: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
                duration: '2:45',
                uploadTime: '2小时前',
                tags: ['旅行', '美景', '治愈']
            },
            {
                id: 2,
                title: '教你做美味的家常菜，简单易学',
                author: '美食达人',
                authorId: 2,
                avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
                views: '8.7万',
                likes: '9千',
                comments: 123,
                shares: 45,
                thumbnail: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
                duration: '4:20',
                uploadTime: '5小时前',
                tags: ['美食', '教程', '家常菜']
            },
            {
                id: 3,
                title: '搞笑猫咪合集，笑到肚子疼！',
                author: '萌宠日记',
                authorId: 3,
                avatar: 'https://randomuser.me/api/portraits/women/68.jpg',
                views: '25.3万',
                likes: '3.4万',
                comments: 567,
                shares: 234,
                thumbnail: 'https://images.unsplash.com/photo-1514888286974-6d03bde4ba42?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
                duration: '1:30',
                uploadTime: '1天前',
                tags: ['萌宠', '搞笑', '猫咪']
            },
            {
                id: 4,
                title: '健身教程：30天练出腹肌',
                author: '健身教练',
                authorId: 4,
                avatar: 'https://randomuser.me/api/portraits/men/75.jpg',
                views: '15.2万',
                likes: '2.1万',
                comments: 456,
                shares: 167,
                thumbnail: 'https://images.unsplash.com/photo-1534367507877-0edd93bd013b?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
                duration: '5:10',
                uploadTime: '3天前',
                tags: ['健身', '教程', '运动']
            },
            {
                id: 5,
                title: '旅游Vlog：探索神秘古城',
                author: '旅行家',
                authorId: 5,
                avatar: 'https://randomuser.me/api/portraits/men/86.jpg',
                views: '9.8万',
                likes: '1.5万',
                comments: 289,
                shares: 98,
                thumbnail: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
                duration: '7:25',
                uploadTime: '1周前',
                tags: ['旅行', 'Vlog', '探险']
            },
            {
                id: 6,
                title: '编程教程：React入门到精通',
                author: '前端开发者',
                authorId: 6,
                avatar: 'https://randomuser.me/api/portraits/women/26.jpg',
                views: '5.6万',
                likes: '8千',
                comments: 189,
                shares: 76,
                thumbnail: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
                duration: '12:30',
                uploadTime: '2周前',
                tags: ['编程', '教程', 'React']
            },
            {
                id: 7,
                title: '周末自驾游：发现城市周边美景',
                author: '户外探险',
                authorId: 7,
                avatar: 'https://randomuser.me/api/portraits/women/33.jpg',
                views: '7.3万',
                likes: '1.1万',
                comments: 156,
                shares: 67,
                thumbnail: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
                duration: '3:15',
                uploadTime: '2天前',
                tags: ['自驾', '旅行', '户外']
            },
            {
                id: 8,
                title: '手把手教你拍摄专业级视频',
                author: '摄影大师',
                authorId: 8,
                avatar: 'https://randomuser.me/api/portraits/men/97.jpg',
                views: '11.4万',
                likes: '1.8万',
                comments: 423,
                shares: 189,
                thumbnail: 'https://images.unsplash.com/photo-1554048612-b6a482bc67e5?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
                duration: '6:40',
                uploadTime: '3天前',
                tags: ['摄影', '教程', '技巧']
            }
        ];

        setTimeout(() => {
            setVideos(mockVideos);
            setLoading(false);
        }, 800);
    }, []);

    const tabs = [
        { key: 'recommend', label: '推荐', icon: <IoSparkles /> },
        { key: 'following', label: '关注', icon: <FiHeart /> },
        { key: 'hot', label: '热门', icon: <FiTrendingUp /> },
        { key: 'nearby', label: '附近', icon: <FiMapPin /> }
    ];

    const handleLoadMore = () => {
        setLoading(true);
        setTimeout(() => {
            const moreVideos = [...videos, ...videos.slice(0, 4).map(v => ({
                ...v,
                id: v.id + videos.length,
                uploadTime: '刚刚'
            }))];
            setVideos(moreVideos);
            setLoading(false);
            if (moreVideos.length >= 20) {
                setHasMore(false);
            }
        }, 1000);
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
            {/* 移除顶部导航栏，使用MainLayout中的Header */}

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
                {/* 欢迎横幅 */}
                <div className="welcome-banner">
                    <div className="banner-content">
                        <h2>发现今日精彩</h2>
                        <p>探索来自全球创作者的优质短视频内容</p>
                    </div>
                    <div className="banner-stats">
                        <div className="stat">
                            <span className="number">1.2M</span>
                            <span className="label">今日观看</span>
                        </div>
                        <div className="stat">
                            <span className="number">45K</span>
                            <span className="label">新视频</span>
                        </div>
                    </div>
                </div>

                {/* 视频网格 */}
                <div className="video-feed">
                    {videos.map(video => (
                        <VideoCard key={video.id} video={video} />
                    ))}
                </div>

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

            {/* 底部信息 - 移除，使用MainLayout中的Footer */}
        </div>
    );
};

export default Home;