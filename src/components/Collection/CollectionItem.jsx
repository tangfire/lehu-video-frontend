import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiEdit2, FiTrash2, FiVideo, FiMoreVertical } from 'react-icons/fi';
import './CollectionItem.css';

const CollectionItem = ({ collection, onEdit, onDelete, onSelect, isSelected = false }) => {
    const [showMenu, setShowMenu] = useState(false);

    const handleMenuClick = (e) => {
        e.stopPropagation();
        setShowMenu(!showMenu);
    };

    const handleEdit = (e) => {
        e.stopPropagation();
        setShowMenu(false);
        onEdit(collection);
    };

    const handleDelete = (e) => {
        e.stopPropagation();
        setShowMenu(false);
        onDelete(collection);
    };

    return (
        <div
            className={`collection-item ${isSelected ? 'selected' : ''}`}
            onClick={() => onSelect && onSelect(collection)}
        >
            <div className="collection-header">
                <div className="collection-icon">
                    <FiVideo />
                </div>
                <div className="collection-info">
                    <h4 className="collection-name">{collection.name}</h4>
                    <p className="collection-description">{collection.description || '暂无描述'}</p>
                    {collection.videoCount !== undefined && (
                        <span className="collection-count">
                            {collection.videoCount} 个视频
                        </span>
                    )}
                </div>
                <div className="collection-menu">
                    <button
                        className="menu-btn"
                        onClick={handleMenuClick}
                    >
                        <FiMoreVertical />
                    </button>
                    {showMenu && (
                        <div className="dropdown-menu" onClick={(e) => e.stopPropagation()}>
                            <button className="dropdown-item" onClick={handleEdit}>
                                <FiEdit2 /> 编辑
                            </button>
                            <button className="dropdown-item delete" onClick={handleDelete}>
                                <FiTrash2 /> 删除
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CollectionItem;
