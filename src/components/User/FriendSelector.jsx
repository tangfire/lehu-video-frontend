// components/User/FriendSelector.jsx
import React, { useState, useEffect } from 'react';
import { friendApi } from '../../api/friend';
import './FriendSelector.css';

const FriendSelector = ({ onConfirm, onCancel, multiple = true }) => {
    const [friends, setFriends] = useState([]);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadFriends();
    }, []);

    const loadFriends = async () => {
        try {
            const res = await friendApi.listFriends({ page: 1, page_size: 100 });
            if (res?.friends) {
                setFriends(res.friends);
            }
        } catch (error) {
            console.error('加载好友列表失败', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleSelect = (friendId) => {
        const newSelected = new Set(selectedIds);
        if (multiple) {
            if (newSelected.has(friendId)) {
                newSelected.delete(friendId);
            } else {
                newSelected.add(friendId);
            }
        } else {
            newSelected.clear();
            newSelected.add(friendId);
        }
        setSelectedIds(newSelected);
    };

    const handleConfirm = () => {
        const selectedFriends = friends.filter(f => selectedIds.has(f.friend?.id || f.id));
        onConfirm(selectedFriends);
    };

    const filteredFriends = friends.filter(f => {
        const name = f.remark || f.friend?.name || f.name || '';
        return name.toLowerCase().includes(searchQuery.toLowerCase());
    });

    return (
        <div className="friend-selector">
            <div className="selector-header">
                <h3>选择好友</h3>
                <input
                    type="text"
                    placeholder="搜索好友..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="selector-search"
                />
            </div>
            <div className="selector-list">
                {loading && <div className="loading-spinner small" />}
                {!loading && filteredFriends.length === 0 && (
                    <div className="empty">暂无好友</div>
                )}
                {filteredFriends.map(f => {
                    const friendId = f.friend?.id || f.id;
                    const name = f.remark || f.friend?.name || f.name || '未知';
                    const avatar = f.friend?.avatar || f.avatar || '/default-avatar.png';
                    return (
                        <div
                            key={friendId}
                            className={`selector-item ${selectedIds.has(friendId) ? 'selected' : ''}`}
                            onClick={() => toggleSelect(friendId)}
                        >
                            <img src={avatar} alt={name} className="item-avatar" />
                            <span className="item-name">{name}</span>
                            {multiple && (
                                <span className="item-checkbox">
                                    {selectedIds.has(friendId) ? '✓' : ''}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>
            <div className="selector-footer">
                <button className="cancel-btn" onClick={onCancel}>取消</button>
                <button className="confirm-btn" onClick={handleConfirm} disabled={selectedIds.size === 0}>
                    确认 ({selectedIds.size})
                </button>
            </div>
        </div>
    );
};

export default FriendSelector;