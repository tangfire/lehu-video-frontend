/**
 * 点赞操作助手
 */

/**
 * 处理点赞操作
 */
export const handleLikeOperation = (currentState, isUndo = false) => {
    const { isLiked, isDisliked, likeCount = 0, dislikeCount = 0 } = currentState;

    if (isUndo) {
        return {
            isLiked: false,
            isDisliked,
            likeCount: Math.max(0, likeCount - 1),
            dislikeCount
        };
    } else {
        let newDislikeCount = dislikeCount;
        if (isDisliked) {
            newDislikeCount = Math.max(0, dislikeCount - 1);
        }

        return {
            isLiked: true,
            isDisliked: false,
            likeCount: likeCount + 1,
            dislikeCount: newDislikeCount
        };
    }
};

/**
 * 处理点踩操作
 */
export const handleDislikeOperation = (currentState, isUndo = false) => {
    const { isLiked, isDisliked, likeCount = 0, dislikeCount = 0 } = currentState;

    if (isUndo) {
        return {
            isLiked,
            isDisliked: false,
            likeCount,
            dislikeCount: Math.max(0, dislikeCount - 1)
        };
    } else {
        let newLikeCount = likeCount;
        if (isLiked) {
            newLikeCount = Math.max(0, likeCount - 1);
        }

        return {
            isLiked: false,
            isDisliked: true,
            likeCount: newLikeCount,
            dislikeCount: dislikeCount + 1
        };
    }
};

/**
 * 批量更新列表中项目的点赞状态
 */
export const updateListLikeStatus = (list, targetId, updateFn) => {
    return list.map(item => {
        if (item.id === targetId) {
            return {
                ...item,
                ...updateFn(item)
            };
        }

        if (item.comments && item.comments.length > 0) {
            return {
                ...item,
                comments: updateListLikeStatus(item.comments, targetId, updateFn)
            };
        }

        return item;
    });
};

/**
 * 获取操作错误信息
 */
export const getOperationErrorMessage = (error) => {
    if (error.response) {
        switch (error.response.status) {
            case 401:
                return '请先登录';
            case 403:
                return '没有权限执行此操作';
            case 404:
                return '资源不存在';
            case 429:
                return '操作过于频繁，请稍后再试';
            default:
                return `操作失败: ${error.response.data?.message || '服务器错误'}`;
        }
    }
    return error.message || '操作失败，请检查网络连接';
};

/**
 * 防抖函数
 */
export const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};