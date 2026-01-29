
import { useState, useEffect } from 'react';
import { FiFolderPlus, FiCheck } from 'react-icons/fi';
import { collectionApi } from '../../api/collection';
import CollectionItem from './CollectionItem';
import CollectionModal from './CollectionModal';
import './CollectionSelector.css';

const CollectionSelector = ({ videoId, onClose, onSuccess }) => {
    const [collections, setCollections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedCollections, setSelectedCollections] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadCollections();
    }, []);

    const loadCollections = async () => {
        try {
            setLoading(true);
            const response = await collectionApi.listCollections({ page: 1, pageSize: 50 });
            if (response && response.collections) {
                setCollections(response.collections);

                // 检查视频是否已经在某些收藏夹中
                const selected = response.collections.filter(c => c.hasVideo);
                setSelectedCollections(selected.map(c => c.id));
            }
        } catch (error) {
            console.error('加载收藏夹失败:', error);
            setError('加载收藏夹失败');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectCollection = async (collection) => {
        try {
            const isSelected = selectedCollections.includes(collection.id);

            if (isSelected) {
                // 从收藏夹移除
                await collectionApi.removeVideoFromCollection({
                    collectionId: collection.id,
                    videoId: videoId
                });
                setSelectedCollections(prev => prev.filter(id => id !== collection.id));
            } else {
                // 添加到收藏夹
                await collectionApi.addVideoToCollection({
                    collectionId: collection.id,
                    videoId: videoId
                });
                setSelectedCollections(prev => [...prev, collection.id]);
            }

            onSuccess && onSuccess();
        } catch (error) {
            console.error('操作失败:', error);
            setError('操作失败，请重试');
        }
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

    const handleDeleteCollection = async (collection) => {
        if (window.confirm(`确定要删除收藏夹 "${collection.name}" 吗？`)) {
            try {
                await collectionApi.removeCollection(collection.id);
                await loadCollections();
            } catch (error) {
                console.error('删除失败:', error);
                setError('删除失败');
            }
        }
    };

    const handleEditCollection = (collection) => {
        // 这里可以添加编辑功能
        console.log('编辑收藏夹:', collection);
    };

    if (loading) {
        return (
            <div className="collection-selector">
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>加载收藏夹中...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="collection-selector">
            <div className="selector-header">
                <h3>选择收藏夹</h3>
                <button className="create-btn" onClick={() => setShowCreateModal(true)}>
                    <FiFolderPlus />
                    <span>新建收藏夹</span>
                </button>
            </div>

            {error && (
                <div className="error-banner">{error}</div>
            )}

            <div className="collections-list">
                {collections.length === 0 ? (
                    <div className="empty-collections">
                        <FiFolderPlus className="empty-icon" />
                        <p>还没有收藏夹</p>
                        <button
                            className="btn btn-primary"
                            onClick={() => setShowCreateModal(true)}
                        >
                            创建第一个收藏夹
                        </button>
                    </div>
                ) : (
                    collections.map(collection => (
                        <CollectionItem
                            key={collection.id}
                            collection={collection}
                            onSelect={handleSelectCollection}
                            onEdit={handleEditCollection}
                            onDelete={handleDeleteCollection}
                            isSelected={selectedCollections.includes(collection.id)}
                        />
                    ))
                )}
            </div>

            <div className="selector-footer">
                <button className="done-btn" onClick={onClose}>
                    完成
                </button>
            </div>

            <CollectionModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSave={handleCreateCollection}
                title="创建收藏夹"
                submitText="创建"
            />
        </div>
    );
};

export default CollectionSelector;
