import React, { useState, useEffect, useCallback } from 'react';
import { friendApi } from '../../api/friend';
import './Friends.css';

const FriendRequests = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('pending'); // 'pending', 'accepted', 'rejected'
    const [counts, setCounts] = useState({
        pending: 0,
        accepted: 0,
        rejected: 0
    });

    // 获取好友申请列表
    const fetchFriendRequests = useCallback(async (status) => {
        try {
            setLoading(true);
            const response = await friendApi.listFriendApplies({
                page: 1,
                page_size: 50
            }, status);

            if (response && response.applies) {
                setRequests(response.applies);

                // 如果获取全部申请，则计算各类别数量
                if (status === undefined) {
                    const counts = {
                        pending: response.applies.filter(r => r.status === 0).length,
                        accepted: response.applies.filter(r => r.status === 1).length,
                        rejected: response.applies.filter(r => r.status === 2).length
                    };
                    setCounts(counts);
                }
            }
        } catch (error) {
            console.error('获取好友申请失败:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    // 处理好友申请
    const handleRequest = async (applyId, accept) => {
        try {
            await friendApi.handleFriendApply(applyId, accept);

            // 更新本地状态
            setRequests(prev =>
                prev.map(request =>
                    request.id === applyId
                        ? {
                            ...request,
                            status: accept ? 1 : 2,
                            handled_at: new Date().toISOString()
                        }
                        : request
                )
            );

            // 更新计数
            if (accept) {
                setCounts(prev => ({
                    ...prev,
                    pending: prev.pending - 1,
                    accepted: prev.accepted + 1
                }));
            } else {
                setCounts(prev => ({
                    ...prev,
                    pending: prev.pending - 1,
                    rejected: prev.rejected + 1
                }));
            }
        } catch (error) {
            console.error('处理好友申请失败:', error);
            alert('操作失败，请重试');
        }
    };

    // 获取状态文本
    const getStatusText = (status) => {
        switch (status) {
            case 0: return '待处理';
            case 1: return '已同意';
            case 2: return '已拒绝';
            default: return '未知';
        }
    };

    // 获取状态颜色
    const getStatusColor = (status) => {
        switch (status) {
            case 0: return '#FF9800'; // 橙色 - 待处理
            case 1: return '#4CAF50'; // 绿色 - 已同意
            case 2: return '#F44336'; // 红色 - 已拒绝
            default: return '#9E9E9E'; // 灰色
        }
    };

    // 格式化时间
    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toLocaleString();
    };

    // 过滤申请
    const filteredRequests = requests.filter(request => {
        switch (activeTab) {
            case 'pending': return request.status === 0;
            case 'accepted': return request.status === 1;
            case 'rejected': return request.status === 2;
            default: return true;
        }
    });

    useEffect(() => {
        fetchFriendRequests(); // 首次加载全部申请以获取计数
    }, [fetchFriendRequests]);

    useEffect(() => {
        // 根据活跃标签获取对应状态的申请
        const statusMap = {
            'pending': 0,
            'accepted': 1,
            'rejected': 2
        };
        fetchFriendRequests(statusMap[activeTab]);
    }, [activeTab, fetchFriendRequests]);

    if (loading) {
        return (
            <div className="friend-requests-loading">
                <div className="loading-spinner"></div>
                <p>加载好友申请中...</p>
            </div>
        );
    }

    return (
        <div className="friend-requests-page">
            <div className="friend-requests-header">
                <h2>好友申请</h2>
                <div className="requests-stats">
                    <div className="stat-badge pending">
                        <strong>{counts.pending}</strong>
                        <span>待处理</span>
                    </div>
                    <div className="stat-badge accepted">
                        <strong>{counts.accepted}</strong>
                        <span>已同意</span>
                    </div>
                    <div className="stat-badge rejected">
                        <strong>{counts.rejected}</strong>
                        <span>已拒绝</span>
                    </div>
                </div>
            </div>

            <div className="friend-requests-tabs">
                <button
                    className={`request-tab ${activeTab === 'pending' ? 'active' : ''}`}
                    onClick={() => setActiveTab('pending')}
                >
                    待处理 ({counts.pending})
                </button>
                <button
                    className={`request-tab ${activeTab === 'accepted' ? 'active' : ''}`}
                    onClick={() => setActiveTab('accepted')}
                >
                    已同意 ({counts.accepted})
                </button>
                <button
                    className={`request-tab ${activeTab === 'rejected' ? 'active' : ''}`}
                    onClick={() => setActiveTab('rejected')}
                >
                    已拒绝 ({counts.rejected})
                </button>
            </div>

            <div className="friend-requests-container">
                {filteredRequests.length === 0 ? (
                    <div className="empty-requests">
                        <div className="empty-icon">📨</div>
                        <h3>暂无好友申请</h3>
                        <p>等待好友的添加申请吧！</p>
                    </div>
                ) : (
                    <div className="requests-list">
                        {filteredRequests.map(request => (
                            <div key={request.id} className="request-item">
                                <div className="request-user">
                                    <img
                                        src={request.applicant.avatar || '/default-avatar.png'}
                                        alt={request.applicant.name}
                                        className="user-avatar"
                                    />
                                    <div className="user-info">
                                        <h4>{request.applicant.name || '未知用户'}</h4>
                                        <p className="apply-reason">
                                            {request.apply_reason || '请求添加好友'}
                                        </p>
                                        <p className="apply-time">
                                            申请时间: {formatTime(request.created_at)}
                                        </p>
                                        {request.status > 0 && (
                                            <p className="handle-time">
                                                处理时间: {formatTime(request.handled_at)}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="request-status">
                  <span
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(request.status) }}
                  >
                    {getStatusText(request.status)}
                  </span>
                                </div>

                                {request.status === 0 && (
                                    <div className="request-actions">
                                        <button
                                            className="accept-btn"
                                            onClick={() => handleRequest(request.id, true)}
                                        >
                                            同意
                                        </button>
                                        <button
                                            className="reject-btn"
                                            onClick={() => handleRequest(request.id, false)}
                                        >
                                            拒绝
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FriendRequests;