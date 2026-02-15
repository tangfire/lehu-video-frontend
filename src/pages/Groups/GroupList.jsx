// pages/Groups/GroupList.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { groupApi } from '../../api/group';
import { messageApi } from '../../api/message';
import FriendSelector from '../../components/User/FriendSelector';
import './Groups.css';

const GroupList = () => {
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('joined'); // 'joined', 'created'
    const [searchQuery, setSearchQuery] = useState('');
    const [creatingGroup, setCreatingGroup] = useState(false);
    const [showFriendSelector, setShowFriendSelector] = useState(false);
    const [newGroupData, setNewGroupData] = useState({
        name: '',
        notice: '',
        add_mode: 0,
        avatar: '',
        createdGroupId: null,
        conversationId: null
    });
    const navigate = useNavigate();

    // 获取群组列表
    const fetchGroups = useCallback(async (type = 'joined') => {
        try {
            setLoading(true);
            let response;
            if (type === 'joined') {
                response = await groupApi.listMyJoinedGroups({ page: 1, page_size: 50 });
            } else {
                response = await groupApi.loadMyGroup({ page: 1, page_size: 50 });
            }
            if (response?.groups) {
                setGroups(response.groups);
            }
        } catch (error) {
            console.error('获取群组列表失败:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    // 搜索群组
    const handleSearch = (query) => setSearchQuery(query);

    // 创建群组 - 第一步：创建群
    const handleCreateGroup = async () => {
        if (!newGroupData.name.trim()) {
            alert('请输入群组名称');
            return;
        }
        try {
            const response = await groupApi.createGroup(newGroupData);
            if (response?.group_id) {
                const groupId = response.group_id;
                // 创建会话
                const convResponse = await messageApi.createConversation(groupId, 1, '欢迎加入群聊！');
                if (convResponse?.conversation_id) {
                    setNewGroupData(prev => ({
                        ...prev,
                        createdGroupId: groupId,
                        conversationId: convResponse.conversation_id
                    }));
                    setShowFriendSelector(true); // 打开好友选择器
                }
            }
        } catch (error) {
            console.error('创建群组失败:', error);
            alert('创建群组失败，请重试');
        }
    };

    // 确认选择好友后发送邀请
    const handleConfirmInvite = async (selectedFriends) => {
        const groupId = newGroupData.createdGroupId;
        const conversationId = newGroupData.conversationId;
        if (!groupId) return;

        try {
            // 为每个选中的好友发送邀请消息
            for (const friend of selectedFriends) {
                const friendId = friend.friend?.id || friend.id;
                await messageApi.sendMessage({
                    conversation_id: conversationId,
                    receiver_id: friendId,
                    conv_type: 0, // 单聊
                    msg_type: 0,
                    content: { text: `[邀请]你已被邀请加入群组 ${groupId}，点击加入` },
                    client_msg_id: `invite_${Date.now()}_${friendId}`
                });
            }
            alert('邀请已发送！');
            // 跳转到群聊
            navigate(`/chat/group/${groupId}`, {
                state: {
                    conversationId: conversationId,
                    conversation: {
                        id: conversationId,
                        type: 1,
                        target_id: groupId
                    }
                }
            });
        } catch (error) {
            console.error('发送邀请失败:', error);
            alert('部分邀请发送失败');
        } finally {
            setShowFriendSelector(false);
            setCreatingGroup(false);
            setNewGroupData({ name: '', notice: '', add_mode: 0, avatar: '', createdGroupId: null, conversationId: null });
        }
    };

    // 加入群组
    const handleJoinGroup = async (groupId, addMode) => {
        try {
            if (addMode === 0) {
                await groupApi.enterGroupDirectly(groupId);
                alert('加入群组成功！');
                fetchGroups('joined');
            } else {
                const reason = prompt('请输入申请理由：');
                if (reason !== null) {
                    await groupApi.applyJoinGroup(groupId, reason);
                    alert('申请已提交，等待管理员审核');
                }
            }
        } catch (error) {
            console.error('加入群组失败:', error);
            alert('操作失败: ' + (error.message || '请重试'));
        }
    };

    // 退出群组
    const handleLeaveGroup = async (groupId) => {
        if (!window.confirm('确定要退出该群组吗？')) return;
        try {
            await groupApi.leaveGroup(groupId);
            setGroups(prev => prev.filter(g => g.id !== groupId));
            alert('已退出群组');
        } catch (error) {
            console.error('退出群组失败:', error);
            alert('操作失败，请重试');
        }
    };

    // 解散群组
    const handleDismissGroup = async (groupId) => {
        if (!window.confirm('确定要解散该群组吗？此操作不可撤销！')) return;
        try {
            await groupApi.dismissGroup(groupId);
            setGroups(prev => prev.filter(g => g.id !== groupId));
            alert('群组已解散');
        } catch (error) {
            console.error('解散群组失败:', error);
            alert('操作失败，请重试');
        }
    };

    // 进入群聊
    const handleStartGroupChat = async (groupId) => {
        try {
            const response = await messageApi.createConversation(groupId, 1, '');
            if (response && response.conversation_id) {
                navigate(`/chat/group/${groupId}`, {
                    state: {
                        conversationId: response.conversation_id,
                        conversation: {
                            id: response.conversation_id,
                            type: 1,
                            target_id: groupId
                        }
                    }
                });
            } else {
                throw new Error('创建会话失败');
            }
        } catch (error) {
            console.error('进入群聊失败:', error);
            alert('进入群聊失败，请重试');
        }
    };

    // 辅助函数
    const getAddModeText = (mode) => {
        switch (mode) {
            case 0: return '直接加入';
            case 1: return '需要审核';
            case 2: return '禁止加入';
            default: return '未知';
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case 1: return '正常';
            case 2: return '已解散';
            case 3: return '被封禁';
            default: return '未知';
        }
    };

    const formatTime = (timestamp) => timestamp ? new Date(timestamp).toLocaleDateString() : '';

    // 过滤群组
    const filteredGroups = groups.filter(group => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (group.name?.toLowerCase().includes(query) || group.notice?.toLowerCase().includes(query));
    });

    useEffect(() => {
        fetchGroups(activeTab);
    }, [activeTab, fetchGroups]);

    if (loading) {
        return (
            <div className="group-list-loading">
                <div className="loading-spinner"></div>
                <p>加载群组列表中...</p>
            </div>
        );
    }

    return (
        <div className="group-list-page">
            <div className="group-list-header">
                <h2>群组</h2>
                <div className="group-list-actions">
                    <button className="create-group-btn" onClick={() => setCreatingGroup(true)}>创建群组</button>
                </div>
            </div>

            <div className="group-list-search">
                <input
                    type="text"
                    placeholder="搜索群组..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="group-search-input"
                />
            </div>

            <div className="group-list-tabs">
                <button
                    className={`group-tab ${activeTab === 'joined' ? 'active' : ''}`}
                    onClick={() => setActiveTab('joined')}
                >
                    我加入的 ({groups.length})
                </button>
                <button
                    className={`group-tab ${activeTab === 'created' ? 'active' : ''}`}
                    onClick={() => setActiveTab('created')}
                >
                    我创建的
                </button>
            </div>

            {/* 创建群组模态框 */}
            {creatingGroup && !showFriendSelector && (
                <div className="create-group-modal">
                    <div className="modal-content">
                        <h3>创建新群组</h3>
                        <div className="form-group">
                            <label>群组名称 *</label>
                            <input
                                type="text"
                                value={newGroupData.name}
                                onChange={(e) => setNewGroupData({ ...newGroupData, name: e.target.value })}
                                placeholder="请输入群组名称"
                            />
                        </div>
                        <div className="form-group">
                            <label>群公告</label>
                            <textarea
                                value={newGroupData.notice}
                                onChange={(e) => setNewGroupData({ ...newGroupData, notice: e.target.value })}
                                placeholder="请输入群公告"
                                rows="3"
                            />
                        </div>
                        <div className="form-group">
                            <label>加群方式</label>
                            <select
                                value={newGroupData.add_mode}
                                onChange={(e) => setNewGroupData({ ...newGroupData, add_mode: parseInt(e.target.value) })}
                            >
                                <option value="0">直接加入</option>
                                <option value="1">需要审核</option>
                                <option value="2">禁止加入</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>群头像URL (可选)</label>
                            <input
                                type="text"
                                value={newGroupData.avatar}
                                onChange={(e) => setNewGroupData({ ...newGroupData, avatar: e.target.value })}
                                placeholder="请输入头像URL"
                            />
                        </div>
                        <div className="modal-actions">
                            <button className="cancel-btn" onClick={() => setCreatingGroup(false)}>取消</button>
                            <button className="create-btn" onClick={handleCreateGroup}>创建</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 好友选择器模态框 */}
            {showFriendSelector && (
                <div className="modal-overlay">
                    <FriendSelector
                        onConfirm={handleConfirmInvite}
                        onCancel={() => {
                            setShowFriendSelector(false);
                            setCreatingGroup(false);
                            setNewGroupData({ name: '', notice: '', add_mode: 0, avatar: '', createdGroupId: null, conversationId: null });
                        }}
                        multiple={true}
                    />
                </div>
            )}

            <div className="group-list-container">
                {filteredGroups.length === 0 ? (
                    <div className="empty-group-list">
                        <div className="empty-icon">👥</div>
                        <h3>暂无群组</h3>
                        <p>{activeTab === 'joined' ? '你还没有加入任何群组' : '你还没有创建任何群组'}</p>
                        {activeTab === 'joined' ? (
                            <button
                                className="join-group-btn"
                                onClick={() => {
                                    const groupId = prompt('请输入群组ID：');
                                    if (groupId) {
                                        groupApi.checkGroupAddMode(groupId)
                                            .then(response => handleJoinGroup(groupId, response.add_mode))
                                            .catch(() => alert('群组不存在或无法加入'));
                                    }
                                }}
                            >
                                加入群组
                            </button>
                        ) : (
                            <button className="create-group-prompt-btn" onClick={() => setCreatingGroup(true)}>创建群组</button>
                        )}
                    </div>
                ) : (
                    <div className="groups-grid">
                        {filteredGroups.map(group => (
                            <div key={group.id} className="group-card">
                                <div className="group-header">
                                    <img
                                        src={group.avatar || '/default-group-avatar.png'}
                                        alt={group.name}
                                        className="group-avatar"
                                    />
                                    <div className="group-info">
                                        <h4>{group.name}</h4>
                                        <div className="group-meta">
                                            <span className="member-count">👥 {group.member_cnt || 0}人</span>
                                            <span className="add-mode">{getAddModeText(group.add_mode)}</span>
                                            {group.status !== 1 && <span className="group-status">{getStatusText(group.status)}</span>}
                                        </div>
                                    </div>
                                </div>
                                {group.notice && (
                                    <div className="group-notice">
                                        <p>{group.notice}</p>
                                    </div>
                                )}
                                <div className="group-stats">
                                    <div className="stat-item">
                                        <span>创建时间:</span>
                                        <strong>{formatTime(group.created_at)}</strong>
                                    </div>
                                    {group.owner_id && (
                                        <div className="stat-item">
                                            <span>群主:</span>
                                            <strong>ID: {group.owner_id}</strong>
                                        </div>
                                    )}
                                </div>
                                <div className="group-actions">
                                    <button
                                        className="action-btn chat-btn"
                                        onClick={() => handleStartGroupChat(group.id)}
                                        title="进入群聊"
                                    >
                                        💬 聊天
                                    </button>
                                    <button
                                        className="action-btn detail-btn"
                                        onClick={() => navigate(`/group/${group.id}`)}
                                        title="查看详情"
                                    >
                                        👁️ 详情
                                    </button>
                                    {activeTab === 'joined' ? (
                                        <button
                                            className="action-btn leave-btn"
                                            onClick={() => handleLeaveGroup(group.id)}
                                            title="退出群组"
                                        >
                                            🚪 退出
                                        </button>
                                    ) : (
                                        <button
                                            className="action-btn dismiss-btn"
                                            onClick={() => handleDismissGroup(group.id)}
                                            title="解散群组"
                                        >
                                            🗑️ 解散
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default GroupList;