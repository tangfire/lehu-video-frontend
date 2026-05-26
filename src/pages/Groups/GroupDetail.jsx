// pages/Groups/GroupDetail.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { groupApi } from '../../api/group';
import { friendApi } from '../../api/friend';
import { messageApi } from '../../api/message';
import { getCurrentUser } from '../../api/user';
import FriendSelector from '../../components/User/FriendSelector';
import './Groups.css';

const GroupDetail = () => {
    const { groupId } = useParams();
    const navigate = useNavigate();
    const [groupInfo, setGroupInfo] = useState(null);
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('info');
    const [onlineStatus, setOnlineStatus] = useState({});
    const [editMode, setEditMode] = useState(false);
    const [editedInfo, setEditedInfo] = useState({});
    const [newNotice, setNewNotice] = useState('');
    const [showInviteSelector, setShowInviteSelector] = useState(false);
    const currentUser = getCurrentUser();

    // 获取群组详情
    const fetchGroupDetail = useCallback(async () => {
        try {
            setLoading(true);
            const response = await groupApi.getGroupInfo(groupId);
            if (response?.group) {
                setGroupInfo(response.group);
                setEditedInfo({
                    name: response.group.name,
                    notice: response.group.notice,
                    add_mode: response.group.add_mode,
                    avatar: response.group.avatar
                });
                setNewNotice(response.group.notice || '');
            }
        } catch (error) {
            console.error('获取群组详情失败:', error);
            alert('获取群组信息失败');
            navigate('/groups');
        } finally {
            setLoading(false);
        }
    }, [groupId, navigate]);

    // 获取群成员列表
    const fetchGroupMembers = useCallback(async () => {
        try {
            const response = await groupApi.getGroupMembers(groupId);
            if (response && response.member_ids) {
                // 这里 member_ids 是字符串数组，需要进一步获取用户信息
                const memberIds = response.member_ids;
                const memberList = memberIds.map(id => ({ id, name: `用户${id}`, role: id === groupInfo?.owner_id ? 'owner' : 'member' }));
                setMembers(memberList);

                // 批量获取在线状态
                if (memberIds.length > 0) {
                    const onlineRes = await friendApi.batchGetUserOnlineStatus(memberIds);
                    if (onlineRes?.online_status) {
                        setOnlineStatus(onlineRes.online_status);
                    }
                }
            }
        } catch (error) {
            console.error('获取群成员列表失败:', error);
        }
    }, [groupId, groupInfo]);

    useEffect(() => {
        if (groupId) fetchGroupDetail();
    }, [groupId, fetchGroupDetail]);

    useEffect(() => {
        if (groupInfo) fetchGroupMembers();
    }, [groupInfo, fetchGroupMembers]);

    // 更新群组信息（示例，需要后端支持）
    const handleUpdateGroupInfo = async () => {
        try {
            alert('更新群组信息（API待实现）');
            setEditMode(false);
        } catch (error) {
            console.error('更新群组信息失败:', error);
            alert('更新失败，请重试');
        }
    };

    // 更新群公告（示例）
    const handleUpdateNotice = async () => {
        if (!newNotice.trim()) {
            alert('请输入群公告');
            return;
        }
        try {
            alert('群公告已更新（API待实现）');
            setGroupInfo(prev => ({ ...prev, notice: newNotice }));
        } catch (error) {
            console.error('更新群公告失败:', error);
            alert('更新失败，请重试');
        }
    };

    // 邀请好友
    const handleInviteFriends = async (selectedFriends) => {
        // 获取会话ID
        try {
            const conversations = await messageApi.listConversations({ page: 1, page_size: 50 });
            const conv = conversations?.conversations?.find(c => c.type === 1 && (c.group_id === groupId || c.target_id === groupId));
            let conversationId = conv?.id;
            if (!conversationId) {
                const newConv = await messageApi.createConversation(groupId, 1, '');
                conversationId = newConv?.conversation_id;
            }
            if (!conversationId) throw new Error('无法获取会话ID');

            for (const friend of selectedFriends) {
                const friendId = friend.friend?.id || friend.id;
                await messageApi.sendMessage({
                    conversation_id: conversationId,
                    receiver_id: friendId,
                    conv_type: 0,
                    msg_type: 0,
                    content: { text: `[邀请]你已被邀请加入群组 ${groupId}，点击加入` },
                    client_msg_id: `invite_${Date.now()}_${friendId}`
                });
            }
            alert('邀请已发送！');
        } catch (error) {
            console.error('发送邀请失败:', error);
            alert('发送邀请失败，请重试');
        } finally {
            setShowInviteSelector(false);
        }
    };

    const handleRemoveMember = (memberId) => {
        if (!window.confirm('确定要移除该成员吗？')) return;
        alert(`移除成员 ${memberId}（API待实现）`);
        setMembers(prev => prev.filter(m => m.id !== memberId));
    };

    const handleTransferOwnership = () => {
        const newOwnerId = prompt('请输入新群主的用户ID：');
        if (newOwnerId) {
            alert(`转让群主给用户 ${newOwnerId}（API待实现）`);
        }
    };

    const getAddModeText = (mode) => {
        switch (mode) {
            case 0: return '直接加入';
            case 1: return '需要审核';
            case 2: return '禁止加入';
            default: return '未知';
        }
    };

    const getRoleText = (role) => {
        switch (role) {
            case 'owner': return '群主';
            case 'admin': return '管理员';
            default: return '成员';
        }
    };

    const getOnlineStatusText = (status) => {
        switch (status) {
            case 1: return '在线';
            case 2: return '忙碌';
            case 3: return '离开';
            default: return '离线';
        }
    };

    const getOnlineStatusColor = (status) => {
        switch (status) {
            case 1: return '#4CAF50';
            case 2: return '#F44336';
            case 3: return '#FF9800';
            default: return '#9E9E9E';
        }
    };

    const isOwner = groupInfo?.owner_id === currentUser?.id;

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
                <button className="back-btn" onClick={() => navigate('/groups')}>← 返回</button>
                <h2>群组详情</h2>
                <button className="chat-btn" onClick={() => navigate(`/chat/group/${groupId}`)}>进入群聊</button>
            </div>

            <div className="group-detail-tabs">
                <button className={`detail-tab ${activeTab === 'info' ? 'active' : ''}`} onClick={() => setActiveTab('info')}>基本信息</button>
                <button className={`detail-tab ${activeTab === 'members' ? 'active' : ''}`} onClick={() => setActiveTab('members')}>群成员 ({members.length})</button>
                {isOwner && <button className={`detail-tab ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>群设置</button>}
            </div>

            <div className="group-detail-content">
                {activeTab === 'info' && (
                    <div className="group-info-section">
                        <div className="group-avatar-section">
                            <img src={groupInfo.avatar || '/default-group-avatar.png'} alt={groupInfo.name} className="group-detail-avatar" />
                            {editMode && <button className="change-avatar-btn">更换头像</button>}
                        </div>

                        <div className="group-details">
                            {editMode ? (
                                <div className="edit-form">
                                    <div className="form-group">
                                        <label>群组名称</label>
                                        <input type="text" value={editedInfo.name} onChange={(e) => setEditedInfo({ ...editedInfo, name: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label>加群方式</label>
                                        <select value={editedInfo.add_mode} onChange={(e) => setEditedInfo({ ...editedInfo, add_mode: parseInt(e.target.value) })}>
                                            <option value="0">直接加入</option>
                                            <option value="1">需要审核</option>
                                            <option value="2">禁止加入</option>
                                        </select>
                                    </div>
                                    <div className="form-actions">
                                        <button className="cancel-btn" onClick={() => { setEditMode(false); setEditedInfo({ name: groupInfo.name, notice: groupInfo.notice, add_mode: groupInfo.add_mode, avatar: groupInfo.avatar }); }}>取消</button>
                                        <button className="save-btn" onClick={handleUpdateGroupInfo}>保存</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="info-display">
                                    <h3>{groupInfo.name}</h3>
                                    <div className="info-grid">
                                        <div className="info-item"><span className="label">群ID:</span><span className="value">{groupInfo.id}</span></div>
                                        <div className="info-item"><span className="label">群主:</span><span className="value">{groupInfo.owner_id}</span></div>
                                        <div className="info-item"><span className="label">成员数:</span><span className="value">{groupInfo.member_cnt || members.length}人</span></div>
                                        <div className="info-item"><span className="label">加群方式:</span><span className="value">{getAddModeText(groupInfo.add_mode)}</span></div>
                                        <div className="info-item"><span className="label">创建时间:</span><span className="value">{new Date(groupInfo.created_at).toLocaleString()}</span></div>
                                        <div className="info-item"><span className="label">最后更新:</span><span className="value">{new Date(groupInfo.updated_at).toLocaleString()}</span></div>
                                    </div>
                                    {isOwner && <button className="edit-btn" onClick={() => setEditMode(true)}>编辑信息</button>}
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
                                <>
                                    <button className="invite-btn" onClick={() => setShowInviteSelector(true)}>邀请好友</button>
                                </>
                            )}
                        </div>

                        <div className="members-list">
                            {members.map(member => {
                                const statusColor = getOnlineStatusColor(onlineStatus[member.id]);
                                return (
                                    <div key={member.id} className="member-item">
                                        <div className="member-avatar">
                                            <img src="/default-avatar.png" alt={member.name} className="avatar-img" />
                                            <div className="online-indicator" style={{ backgroundColor: statusColor }} />
                                        </div>
                                        <div className="member-info">
                                            <h4>{member.name}</h4>
                                            <div className="member-meta">
                                                <span className="member-role">{getRoleText(member.role)}</span>
                                                <span className="member-status">{getOnlineStatusText(onlineStatus[member.id])}</span>
                                            </div>
                                        </div>
                                        <div className="member-actions">
                                            {isOwner && member.role !== 'owner' && (
                                                <>
                                                    <button className="action-btn remove-btn" onClick={() => handleRemoveMember(member.id)} title="移除成员">🚪</button>
                                                    {member.role === 'member' && <button className="action-btn promote-btn" title="设为管理员">⬆️</button>}
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
                                <textarea value={newNotice} onChange={(e) => setNewNotice(e.target.value)} placeholder="请输入群公告..." rows="5" />
                                <button className="update-notice-btn" onClick={handleUpdateNotice}>更新公告</button>
                            </div>
                        </div>

                        <div className="settings-card">
                            <h3>群管理</h3>
                            <div className="management-actions">
                                <button className="management-btn transfer-btn" onClick={handleTransferOwnership}>👑 转让群主</button>
                                <button className="management-btn dissolve-btn" onClick={() => { if (window.confirm('确定要解散群组吗？此操作不可撤销！')) { alert('解散群组（API待实现）'); navigate('/groups'); } }}>🗑️ 解散群组</button>
                            </div>
                        </div>

                        <div className="settings-card">
                            <h3>危险操作</h3>
                            <p className="danger-text">这些操作将清空所有聊天记录并不可恢复</p>
                            <button className="danger-btn">🚫 清空聊天记录</button>
                        </div>
                    </div>
                )}
            </div>

            {/* 邀请好友选择器 */}
            {showInviteSelector && (
                <div className="modal-overlay">
                    <FriendSelector
                        onConfirm={handleInviteFriends}
                        onCancel={() => setShowInviteSelector(false)}
                        multiple={true}
                    />
                </div>
            )}
        </div>
    );
};

export default GroupDetail;
