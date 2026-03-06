// src/pages/Follow/index.jsx
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import FollowList from '../../components/Follow/FollowList';
import './Follow.css';   // 你提供的样式文件

const FollowPage = () => {
    const { userId } = useParams(); // 获取路由参数中的用户ID
    const [activeTab, setActiveTab] = useState('following');

    const tabs = [
        { key: 'following', label: '关注' },
        { key: 'followers', label: '粉丝' },
        { key: 'mutual', label: '互相关注' }
    ];

    return (
        <div className="follow-page">
            <div className="follow-page-header">
                <h1>我的关注</h1>
                <p className="page-description">管理你的关注关系和粉丝</p>
            </div>

            <div className="follow-tabs">
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        className={`follow-tab ${activeTab === tab.key ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.key)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="follow-content">
                <FollowList
                    userId={userId}
                    type={activeTab}
                    showTitle={false}
                />
            </div>
        </div>
    );
};

export default FollowPage;