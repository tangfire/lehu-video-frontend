// utils/favorite.js

/**
 * 处理点赞相关的工具函数
 */

/**
 * 格式化点赞数量显示
 * @param {number} count 点赞数量
 * @returns {string} 格式化后的字符串
 */
export const formatLikeCount = (count) => {
    if (count >= 1000000) {
        return (count / 1000000).toFixed(1) + 'M';
    } else if (count >= 1000) {
        return (count / 1000).toFixed(1) + 'K';
    }
    return count.toString();
};

/**
 * 检查用户是否已点赞
 * @param {Object} item 项目（视频或评论）
 * @param {number} userId 用户ID
 * @returns {boolean} 是否已点赞
 */
export const checkIsLiked = (item, userId) => {
    if (!item || !userId) return false;

    // 检查点赞用户列表
    if (item.likedUsers && Array.isArray(item.likedUsers)) {
        return item.likedUsers.includes(userId);
    }

    // 或者直接使用 isFavorite 字段
    return item.isFavorite || false;
};

/**
 * 更新项目的点赞状态
 * @param {Object} item 原始项目
 * @param {number} userId 用户ID
 * @param {boolean} isLiked 是否点赞
 * @returns {Object} 更新后的项目
 */
export const updateLikeStatus = (item, userId, isLiked) => {
    if (!item || !userId) return item;

    const updatedItem = { ...item };

    // 更新点赞数量
    if (isLiked) {
        updatedItem.likeCount = (updatedItem.likeCount || 0) + 1;
        updatedItem.isFavorite = true;
    } else {
        updatedItem.likeCount = Math.max(0, (updatedItem.likeCount || 0) - 1);
        updatedItem.isFavorite = false;
    }

    // 更新点赞用户列表
    if (updatedItem.likedUsers) {
        if (isLiked) {
            if (!updatedItem.likedUsers.includes(userId)) {
                updatedItem.likedUsers.push(userId);
            }
        } else {
            updatedItem.likedUsers = updatedItem.likedUsers.filter(id => id !== userId);
        }
    }

    return updatedItem;
};

/**
 * 批量更新列表中的项目点赞状态
 * @param {Array} list 项目列表
 * @param {number} targetId 目标ID
 * @param {number} userId 用户ID
 * @param {boolean} isLiked 是否点赞
 * @returns {Array} 更新后的列表
 */
export const updateLikeStatusInList = (list, targetId, userId, isLiked) => {
    return list.map(item => {
        if (item.id === targetId) {
            return updateLikeStatus(item, userId, isLiked);
        }

        // 递归处理子评论
        if (item.comments && item.comments.length > 0) {
            return {
                ...item,
                comments: updateLikeStatusInList(item.comments, targetId, userId, isLiked)
            };
        }

        return item;
    });
};