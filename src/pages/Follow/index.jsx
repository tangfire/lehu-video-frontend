import React, { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { getCurrentUser } from '../../api/user.js';
import FollowList from '../../components/Follow/FollowList.jsx';
import './Follow.css';

const FollowPage = () => {
    const { userId } = useParams();
    const [searchParams] = useSearchParams();
    const [activeType, setActiveType] = useState(searchParams.get('type') || 'following');

    const currentUser = getCurrentUser();
    const isCurrentUser = currentUser?.id?.toString() === userId;

    const types = [
        { key: 'following', label: '关注' },
        { key: 'followers', label: '粉丝' },
        { key: 'mutual', label: '互相关注' }
    ];

    const getTitle = () => {
        const userInfo = getCurrentUser();
        const isSelf = userId === userInfo?.id?.toString();

        if (isSelf) {
            return '我的关注';
        }

        return '用户关注';
    };

    return (
        <div className="follow-page">
            <div className="follow-page-header">
                <h1>{getTitle()}</h1>
                <p className="page-description">
                    {activeType === 'following' ? '你关注的用户' :
                        activeType === 'followers' ? '关注你的用户' :
                            '互相关注的用户'}
                </p>
            </div>

            <div className="follow-tabs">
                {types.map(type => (
                    <button
                        key={type.key}
                        className={`follow-tab ${activeType === type.key ? 'active' : ''}`}
                        onClick={() => setActiveType(type.key)}
                    >
                        {type.label}
                    </button>
                ))}
            </div>

            <div className="follow-content">
                <FollowList
                    userId={parseInt(userId)}
                    type={activeType}
                    showTitle={false}
                />
            </div>
        </div>
    );
};

export default FollowPage;