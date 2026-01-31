import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { groupApi } from '../../api/group';
import { friendApi } from '../../api/friend';
import { getCurrentUser } from '../../api/user';
import './Groups.css';

const GroupDetail = () => {
    const { groupId } = useParams();
    const navigate = useNavigate();
    const [groupInfo, setGroupInfo] = useState(null);
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('info'); // 'info', 'members', 'settings'
    const [onlineStatus, setOnlineStatus] = useState({});
    const [editMode, setEditMode] = useState(false);
    const [editedInfo, setEditedInfo] = useState({});
    const [newNotice, setNewNotice] = useState('');
    const currentUser = getCurrentUser();

    // 获取群组详情
    const fetchGroupDetail = useCallback(async () => {
        try {
            setLoading(true);
            const response = await groupApi.getGroupInfo(groupId);

            if (response && response.group) {
                setGroupInfo(response.group);
                setEditedInfo({
                    name: response.group.name,
                    notice: response.group.notice,
                    add_mode: response.group.add_mode,
                    avatar: response.group.avatar
                });
                setNewNotice(response.group.notice || '');

                // 这里应该调用获取群成员的API，但后端没有提供，我们模拟一些数据
                // TODO: 替换为实际的获取群成员API
                const mockMembers = [
                    { id: response.group.owner_id, name: '群主', role: 'owner' },
                    { id: currentUser?.id, name: currentUser?.name, role: 'member' }
                ];
                setMembers(mockMembers);

                // 获取在线状态
                const userIds = mockMembers.map(m => m.id);
                if (userIds.length > 0) {
                    const onlineResponse = await friendApi.batchGetUserOnlineStatus(userIds);
                    if (onlineResponse && onlineResponse.online_status) {
                        setOnlineStatus(onlineResponse.online_status);
                    }
                }
            }
        } catch (error) {
            console.error('获取群组详情失败:', error);
            alert('获取群组信息失败');
            navigate('/groups');
        } finally {
            setLoading(false);
        }
    }, [groupId, currentUser, navigate]);

    // 更新群组信息
    const handleUpdateGroupInfo = async () => {
        try {
            // 这里应该调用更新群组信息的API
            // TODO: 替换为实际的更新群组API
            alert('更新群组信息（API待实现）');
            setEditMode(false);
        } catch (error) {
            console.error('更新群组信息失败:', error);
            alert('更新失败，请重试');
        }
    };

    // 更新群公告
    const handleUpdateNotice = async () => {
        if (!newNotice.trim()) {
            alert('请输入群公告');
            return;
        }

        try {
            // 这里应该调用更新群公告的API
            // TODO: 替换为实际的更新群公告API
            setGroupInfo(prev => ({ ...prev, notice: newNotice }));
            alert('群公告已更新（API待实现）');
        } catch (error) {
            console.error('更新群公告失败:', error);
            alert('更新失败，请重试');
        }
    };

    // 邀请成员
    const handleInviteMember = () => {
        const userId = prompt('请输入要邀请的用户ID：');
        if (userId) {
            // TODO: 调用邀请成员API
            alert(`邀请用户 ${userId}（API待实现）`);
        }
    };

    // 移除成员
    const handleRemoveMember = (memberId) => {
        if (!window.confirm('确定要移除该成员吗？')) {
            return;
        }

        // TODO: 调用移除成员API
        alert(`移除成员 ${memberId}（API待实现）`);
        setMembers(prev => prev.filter(m => m.id !== memberId));
    };

    // 转让群主
    const handleTransferOwnership = () => {
        const newOwnerId = prompt('请输入新群主的用户ID：');
        if (newOwnerId) {
            // TODO: 调用转让群主API
            alert(`转让群主给用户 ${newOwnerId}（API待实现）`);
        }
    };

    // 获取加群方式文本
    const getAddModeText = (mode) => {
        switch (mode) {
            case 0: return '直接加入';
            case 1: return '需要审核';
            case 2: return '禁止加入';
            default: return '未知';
        }
    };

    // 获取角色文本
    const getRoleText = (role) => {
        switch (role) {
            case 'owner': return '群主';
            case 'admin': return '管理员';
            case 'member': return '成员';
            default: return '未知';
        }
    };

    // 获取在线状态文本
    const getOnlineStatusText = (status) => {
        switch (status) {
            case 1: return '在线';
            case 2: return '忙碌';
            case 3: return '离开';
            default: return '离线';
        }
    };

    // 获取在线状态颜色
    const getOnlineStatusColor = (status) => {
        switch (status) {
            case 1: return '#4CAF50';
            case 2: return '#F44336';
            case 3: return '#FF9800';
            default: return '#9E9E9E';
        }
    };

    // 检查是否是群主
    const isOwner = groupInfo?.owner_id === currentUser?.id;

    useEffect(() => {
        if (groupId) {
            fetchGroupDetail();
        }
    }, [groupId, fetchGroupDetail]);

    if (loading) {
        return (
            <div className="group-detail-loading">
                <div className="loading-spinner"></div>
                <p>加载群组详情中...</p>
            </div>
        );
    }

    if (!groupInfo) {
        return (
            <div className="group-not-found">
                <h2>群组不存在</h2>
                <button onClick={() => navigate('/groups')}>返回群组列表</button>
            </div>
        );
    }

    return (
        <div className="group-detail-page">
            <div className="group-detail-header">
                <button className="back-btn" onClick={() => navigate('/groups')}>
                    ← 返回
                </button>
                <h2>群组详情</h2>
                <button
                    className="chat-btn"
                    onClick={() => navigate(`/chat/group/${groupId}`)}
                >
                    进入群聊
                </button>
            </div>

            <div className="group-detail-tabs">
                <button
                    className={`detail-tab ${activeTab === 'info' ? 'active' : ''}`}
                    onClick={() => setActiveTab('info')}
                >
                    基本信息
                </button>
                <button
                    className={`detail-tab ${activeTab === 'members' ? 'active' : ''}`}
                    onClick={() => setActiveTab('members')}
                >
                    群成员 ({members.length})
                </button>
                {isOwner && (
                    <button
                        className={`detail-tab ${activeTab === 'settings' ? 'active' : ''}`}
                        onClick={() => setActiveTab('settings')}
                    >
                        群设置
                    </button>
                )}
            </div>

            <div className="group-detail-content">
                {activeTab === 'info' && (
                    <div className="group-info-section">
                        <div className="group-avatar-section">
                            <img
                                src={groupInfo.avatar || '/default-group-avatar.png'}
                                alt={groupInfo.name}
                                className="group-detail-avatar"
                            />
                            {editMode && (
                                <button className="change-avatar-btn">
                                    更换头像
                                </button>
                            )}
                        </div>

                        <div className="group-details">
                            {editMode ? (
                                <div className="edit-form">
                                    <div className="form-group">
                                        <label>群组名称</label>
                                        <input
                                            type="text"
                                            value={editedInfo.name}
                                            onChange={(e) => setEditedInfo(prev => ({
                                                ...prev,
                                                name: e.target.value
                                            }))}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>加群方式</label>
                                        <select
                                            value={editedInfo.add_mode}
                                            onChange={(e) => setEditedInfo(prev => ({
                                                ...prev,
                                                add_mode: parseInt(e.target.value)
                                            }))}
                                        >
                                            <option value="0">直接加入</option>
                                            <option value="1">需要审核</option>
                                            <option value="2">禁止加入</option>
                                        </select>
                                    </div>
                                    <div className="form-actions">
                                        <button
                                            className="cancel-btn"
                                            onClick={() => {
                                                setEditMode(false);
                                                setEditedInfo({
                                                    name: groupInfo.name,
                                                    notice: groupInfo.notice,
                                                    add_mode: groupInfo.add_mode,
                                                    avatar: groupInfo.avatar
                                                });
                                            }}
                                        >
                                            取消
                                        </button>
                                        <button
                                            className="save-btn"
                                            onClick={handleUpdateGroupInfo}
                                        >
                                            保存
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="info-display">
                                    <h3>{groupInfo.name}</h3>
                                    <div className="info-grid">
                                        <div className="info-item">
                                            <span className="label">群ID:</span>
                                            <span className="value">{groupInfo.id}</span>
                                        </div>
                                        <div className="info-item">
                                            <span className="label">群主:</span>
                                            <span className="value">{groupInfo.owner_id}</span>
                                        </div>
                                        <div className="info-item">
                                            <span className="label">成员数:</span>
                                            <span className="value">{groupInfo.member_cnt || 0}人</span>
                                        </div>
                                        <div className="info-item">
                                            <span className="label">加群方式:</span>
                                            <span className="value">{getAddModeText(groupInfo.add_mode)}</span>
                                        </div>
                                        <div className="info-item">
                                            <span className="label">创建时间:</span>
                                            <span className="value">
                        {new Date(groupInfo.created_at).toLocaleString()}
                      </span>
                                        </div>
                                        <div className="info-item">
                                            <span className="label">最后更新:</span>
                                            <span className="value">
                        {new Date(groupInfo.updated_at).toLocaleString()}
                      </span>
                                        </div>
                                    </div>
                                    {isOwner && (
                                        <button
                                            className="edit-btn"
                                            onClick={() => setEditMode(true)}
                                        >
                                            编辑信息
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'members' && (
                    <div className="group-members-section">
                        <div className="members-header">
                            <h3>群成员 ({members.length})</h3>
                            {isOwner && (
                                <button
                                    className="invite-btn"
                                    onClick={handleInviteMember}
                                >
                                    邀请成员
                                </button>
                            )}
                        </div>

                        <div className="members-list">
                            {members.map(member => {
                                const isOnline = onlineStatus[member.id] === 1;
                                const statusColor = getOnlineStatusColor(onlineStatus[member.id]);

                                return (
                                    <div key={member.id} className="member-item">
                                        <div className="member-avatar">
                                            <img
                                                src="/default-avatar.png"
                                                alt={member.name}
                                                className="avatar-img"
                                            />
                                            <div
                                                className="online-indicator"
                                                style={{ backgroundColor: statusColor }}
                                            />
                                        </div>
                                        <div className="member-info">
                                            <h4>{member.name}</h4>
                                            <div className="member-meta">
                        <span className="member-role">
                          {getRoleText(member.role)}
                        </span>
                                                <span className="member-status">
                          {getOnlineStatusText(onlineStatus[member.id])}
                        </span>
                                            </div>
                                        </div>
                                        <div className="member-actions">
                                            {(isOwner && member.role !== 'owner') && (
                                                <>
                                                    <button
                                                        className="action-btn remove-btn"
                                                        onClick={() => handleRemoveMember(member.id)}
                                                        title="移除成员"
                                                    >
                                                        🚪
                                                    </button>
                                                    {member.role === 'member' && (
                                                        <button
                                                            className="action-btn promote-btn"
                                                            title="设为管理员"
                                                        >
                                                            ⬆️
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {activeTab === 'settings' && isOwner && (
                    <div className="group-settings-section">
                        <div className="settings-card">
                            <h3>群公告管理</h3>
                            <div className="notice-editor">
                <textarea
                    value={newNotice}
                    onChange={(e) => setNewNotice(e.target.value)}
                    placeholder="请输入群公告..."
                    rows="5"
                />
                                <button
                                    className="update-notice-btn"
                                    onClick={handleUpdateNotice}
                                >
                                    更新公告
                                </button>
                            </div>
                        </div>

                        <div className="settings-card">
                            <h3>群管理</h3>
                            <div className="management-actions">
                                <button
                                    className="management-btn transfer-btn"
                                    onClick={handleTransferOwnership}
                                >
                                    👑 转让群主
                                </button>
                                <button
                                    className="management-btn dissolve-btn"
                                    onClick={() => {
                                        if (window.confirm('确定要解散群组吗？此操作不可撤销！')) {
                                            // TODO: 调用解散群组API
                                            alert('解散群组（API待实现）');
                                            navigate('/groups');
                                        }
                                    }}
                                >
                                    🗑️ 解散群组
                                </button>
                            </div>
                        </div>

                        <div className="settings-card">
                            <h3>危险操作</h3>
                            <p className="danger-text">
                                这些操作将清空所有聊天记录并不可恢复
                            </p>
                            <button className="danger-btn">
                                🚫 清空聊天记录
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GroupDetail;