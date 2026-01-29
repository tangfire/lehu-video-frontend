
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collectionApi } from '../../api/collection';
import { formatVideoData } from '../../utils/dataFormat';
import VideoCard from '../../components/Common/VideoCard';
import CollectionItem from '../../components/Collection/CollectionItem';
import CollectionModal from '../../components/Collection/CollectionModal';
import { FiFolderPlus, FiVideo, FiChevronLeft } from 'react-icons/fi';
import './Collections.css';

const Collections = () => {
    const { userId } = useParams();
    const navigate = useNavigate();

    const [collections, setCollections] = useState([]);
    const [selectedCollection, setSelectedCollection] = useState(null);
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [videoLoading, setVideoLoading] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingCollection, setEditingCollection] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadCollections();
    }, [userId]);

    const loadCollections = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await collectionApi.listCollections({
                page: 1,
                pageSize: 50
            });

            if (response && response.collections) {
                setCollections(response.collections);
            } else {
                setCollections([]);
            }
        } catch (error) {
            console.error('加载收藏夹失败:', error);
            setError('加载收藏夹失败，请重试');
        } finally {
            setLoading(false);
        }
    };

    const loadCollectionVideos = async (collectionId) => {
        try {
            setVideoLoading(true);

            const response = await collectionApi.listVideosInCollection({
                collectionId,
                page: 1,
                pageSize: 50
            });

            if (response && response.videos) {
                const formattedVideos = response.videos.map(video => formatVideoData(video));
                setVideos(formattedVideos);
            } else {
                setVideos([]);
            }
        } catch (error) {
            console.error('加载收藏视频失败:', error);
            setError('加载视频失败');
        } finally {
            setVideoLoading(false);
        }
    };

    const handleSelectCollection = (collection) => {
        setSelectedCollection(collection);
        loadCollectionVideos(collection.id);
    };

    const handleCreateCollection = async (data) => {
        try {
            await collectionApi.createCollection(data);
            await loadCollections();
            setShowCreateModal(false);
        } catch (error) {
            throw new Error(error.message || '创建失败');
        }
    };

    const handleUpdateCollection = async (data) => {
        try {
            await collectionApi.updateCollection({
                id: editingCollection.id,
                ...data
            });
            await loadCollections();
            setShowEditModal(false);
            setEditingCollection(null);
        } catch (error) {
            throw new Error(error.message || '更新失败');
        }
    };

    const handleDeleteCollection = async (collection) => {
        if (window.confirm(`确定要删除收藏夹 "${collection.name}" 吗？此操作不可恢复。`)) {
            try {
                await collectionApi.removeCollection(collection.id);

                if (selectedCollection && selectedCollection.id === collection.id) {
                    setSelectedCollection(null);
                    setVideos([]);
                }

                await loadCollections();
            } catch (error) {
                console.error('删除失败:', error);
                setError('删除失败，请重试');
            }
        }
    };

    const handleEditCollection = (collection) => {
        setEditingCollection(collection);
        setShowEditModal(true);
    };

    const handleBackToList = () => {
        setSelectedCollection(null);
        setVideos([]);
    };

    if (loading) {
        return (
            <div className="collections-loading">
                <div className="loading-spinner"></div>
                <p>加载收藏夹中...</p>
            </div>
        );
    }

    return (
        <div className="collections-container">
            <div className="collections-header">
                <h1>我的收藏</h1>
                <p>管理你的收藏夹和收藏的视频</p>
            </div>

            {error && (
                <div className="error-banner">
                    <p>{error}</p>
                    <button onClick={loadCollections}>重试</button>
                </div>
            )}

            {!selectedCollection ? (
                // 收藏夹列表
                <div className="collections-list-section">
                    <div className="section-header">
                        <h2>收藏夹列表</h2>
                        <button
                            className="btn btn-primary"
                            onClick={() => setShowCreateModal(true)}
                        >
                            <FiFolderPlus />
                            <span>新建收藏夹</span>
                        </button>
                    </div>

                    {collections.length === 0 ? (
                        <div className="empty-state">
                            <FiFolderPlus className="empty-icon" />
                            <h3>还没有收藏夹</h3>
                            <p>创建收藏夹来整理你喜欢的视频</p>
                            <button
                                className="btn btn-primary"
                                onClick={() => setShowCreateModal(true)}
                            >
                                创建收藏夹
                            </button>
                        </div>
                    ) : (
                        <div className="collections-grid">
                            {collections.map(collection => (
                                <CollectionItem
                                    key={collection.id}
                                    collection={collection}
                                    onSelect={handleSelectCollection}
                                    onEdit={handleEditCollection}
                                    onDelete={handleDeleteCollection}
                                />
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                // 收藏夹详情
                <div className="collection-detail-section">
                    <div className="detail-header">
                        <button className="back-btn" onClick={handleBackToList}>
                            <FiChevronLeft />
                            返回收藏夹列表
                        </button>
                        <div className="collection-header-info">
                            <h2>{selectedCollection.name}</h2>
                            {selectedCollection.description && (
                                <p className="collection-description">
                                    {selectedCollection.description}
                                </p>
                            )}
                        </div>
                        <div className="collection-actions">
                            <button
                                className="btn btn-outline"
                                onClick={() => handleEditCollection(selectedCollection)}
                            >
                                编辑
                            </button>
                            <button
                                className="btn btn-danger"
                                onClick={() => handleDeleteCollection(selectedCollection)}
                            >
                                删除
                            </button>
                        </div>
                    </div>

                    {videoLoading ? (
                        <div className="loading-videos">
                            <div className="loading-spinner"></div>
                            <p>加载视频中...</p>
                        </div>
                    ) : (
                        <>
                            {videos.length === 0 ? (
                                <div className="empty-state">
                                    <FiVideo className="empty-icon" />
                                    <h3>收藏夹是空的</h3>
                                    <p>去发现喜欢的视频并收藏到这里</p>
                                </div>
                            ) : (
                                <>
                                    <div className="video-count">
                                        共 {videos.length} 个视频
                                    </div>
                                    <div className="video-grid">
                                        {videos.map(video => (
                                            <VideoCard key={video.id} video={video} />
                                        ))}
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* 创建收藏夹模态框 */}
            <CollectionModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSave={handleCreateCollection}
                title="创建收藏夹"
                submitText="创建"
            />

            {/* 编辑收藏夹模态框 */}
            {editingCollection && (
                <CollectionModal
                    isOpen={showEditModal}
                    onClose={() => {
                        setShowEditModal(false);
                        setEditingCollection(null);
                    }}
                    onSave={handleUpdateCollection}
                    title="编辑收藏夹"
                    submitText="保存"
                    initialData={{
                        name: editingCollection.name,
                        description: editingCollection.description || ''
                    }}
                />
            )}
        </div>
    );
};

export default Collections;
