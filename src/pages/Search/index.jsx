import React from 'react';
import SearchUsers from '../../components/User/SearchUsers';

const SearchPage = () => {
    const handleUserSelect = (user) => {
        // 在新标签页打开用户主页
        window.open(`/user/${user.id}`, '_blank');
    };

    return (
        <div className="search-page">
            <div className="search-page-header">
                <h1>搜索用户</h1>
                <p>查找并添加新朋友</p>
            </div>

            <SearchUsers
                onUserSelect={handleUserSelect}
                showActions={true}
                showAddFriend={true}
            />
        </div>
    );
};

export default SearchPage;